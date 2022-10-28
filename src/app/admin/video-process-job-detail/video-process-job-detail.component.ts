import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { VideoProcessManagerService } from '../video-process-manager/video-process-manager.service';
import { combineLatestWith, delayWhen, interval, Subject, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { UIDialog, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { Vertex } from '../../entity/Vertex';
import { AdminService } from '../admin.service';
import { Bangumi, Episode } from '../../entity';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { LogType } from '../video-process-manager/LogType';
import {
    getMaxCharacterPerLineForContainer,
    processLineForStreamLogViewer
} from './stream-log-viewer/stream-log-helper';
import { getRemPixel } from '../../../helpers/dom';
import { VertexInfoPanelComponent } from './vertex-info-panel/vertex-info-panel.component';

@Component({
    selector: 'video-process-job-detail',
    templateUrl: './video-process-job-detail.html',
    styleUrls: ['./video-process-job-detail.less']
})
export class VideoProcessJobDetailComponent implements OnInit, OnDestroy, AfterViewInit {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    private jobContainerMaxCharacter: number;
    private vertexDetailDialogRef: UIDialogRef<VertexInfoPanelComponent>;
    private _dialogSubscription = new Subscription();

    eJobStatus = VideoProcessJobStatus;

    job: VideoProcessJob;
    vertices: Vertex[];
    bangumi: Bangumi;
    episode: Episode;

    shouldShowJobLog = false;
    jobLogLines = new Subject<LogType>();

    @ViewChild('jobLogContainer') jobLogContainerRef: ElementRef;

    constructor(private _videoProcessManagerService: VideoProcessManagerService,
                private _adminService: AdminService,
                private _route: ActivatedRoute,
                private _dialog: UIDialog,
                toastService: UIToast) {
        this._toastRef = toastService.makeText();
    }

    ngAfterViewInit(): void {
        const jobLogContainerElement = this.jobLogContainerRef.nativeElement as HTMLElement;
        this.jobContainerMaxCharacter = getMaxCharacterPerLineForContainer(jobLogContainerElement);
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

    openVertexDetail(vertexId: string): void {
        if (vertexId) {
            this.vertexDetailDialogRef = this._dialog.open(VertexInfoPanelComponent, {stickyDialog: false, backdrop: false});
            this.vertexDetailDialogRef.componentInstance.vertex = this.vertices.find(v => v.id === vertexId);
            this._dialogSubscription.add(this.vertexDetailDialogRef.afterClosed()
                .subscribe(() => {
                    this._dialogSubscription.unsubscribe();
                    console.log('close vertex info of ' + vertexId);
                })
            );
        }
    }

    showJobLog(): void {
        if (this.job) {
            this._subscription.add(
                this._videoProcessManagerService.streamingJobLog(this.job.id)
                    .subscribe({
                        next: (line) => {
                            const logLines: LogType[] = [];
                            processLineForStreamLogViewer(line, this.jobContainerMaxCharacter, logLines);
                            logLines.forEach(logLine => {
                                this.jobLogLines.next(logLine);
                            })
                        },
                        error: () => {

                        }, complete: () => {
                        }
                    })
            );
            this.shouldShowJobLog = true;
        }
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
