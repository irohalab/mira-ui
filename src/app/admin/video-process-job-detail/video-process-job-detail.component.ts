import { Component, OnDestroy, OnInit } from '@angular/core';
import { VideoProcessManagerService } from '../video-process-manager/video-process-manager.service';
import { combineLatestWith, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { Vertex } from '../../entity/Vertex';
import { AdminService } from '../admin.service';
import { Bangumi, Episode } from '../../entity';

@Component({
    selector: 'video-process-job-detail',
    templateUrl: './video-process-job-detail.html',
    styleUrls: ['./video-process-job-detail.less']
})
export class VideoProcessJobDetailComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    job: VideoProcessJob;
    vertices: Vertex[];
    bangumi: Bangumi;
    episode: Episode;

    constructor(private _videoProcessManagerService: VideoProcessManagerService,
                private _adminService: AdminService,
                private _route: ActivatedRoute,
                toastService: UIToast) {
        this._toastRef = toastService.makeText();
    }
    ngOnInit(): void {
        this._subscription.add(
            this._route.params.pipe(
                switchMap(params => {
                    const jobId = params['id'];
                    return this._videoProcessManagerService.getJob(jobId)
                        .pipe(combineLatestWith(this._videoProcessManagerService.getVertices(jobId)));
                }),
                switchMap(([job, vertices]) => {
                    this.job = job;
                    this.vertices = vertices;
                    return this._adminService.getBangumi(job.jobMessage.bangumiId);
                }))
                .subscribe({
                    next: (bangumi: Bangumi) => {
                        this.bangumi = bangumi;
                        this.getEpisode();
                        this.getVertices();
                    },
                    error: (error) => {
                        this._toastRef.show(error.message);
                    }
                })
        )
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    cancelJob(): void {
        // TODO: implement cancel
        throw new Error('Not Implemented');
    }

    pauseJob(): void {
        // TODO: implement pause
        throw new Error('Not Implemented');
    }

    private getEpisode(): void {
        for(const episode of this.bangumi.episodes) {
            this._subscription.add(
                this._adminService.getEpisodeVideoFiles(episode.id)
                    .subscribe((videoFileList) => {
                        if (videoFileList.some(videoFile => videoFile.id === this.job.jobMessage.videoId)) {
                            this.episode = episode;
                        }
                    })
            );
        }
    }

    private getVertices(): void {
        this._subscription.add(
            this._videoProcessManagerService.getVertices(this.job.id)
                .subscribe((vertices) => {
                    this.vertices = vertices;
                })
        );
    }
}
