import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { VideoProcessManagerService } from '../video-process-manager/video-process-manager.service';
import { combineLatestWith, delay, interval, Subject, Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { switchMap, takeWhile, tap } from 'rxjs/operators';
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
import { VertexInfoPanelComponent } from './vertex-info-panel/vertex-info-panel.component';
import { VertexStatus } from '../../entity/VertexStatus';

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

    errorInfo: any;

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
                        this.updateJobAndVertexInfo();
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
        this._subscription.add(
            this._videoProcessManagerService.cancelJob(this.job.id)
                .subscribe({
                    next: () => {
                        this._toastRef.show('Cancel Successfully!');
                    },
                    error: (reason) => {
                        this._toastRef.show(reason);
                    }
                })
        );
    }

    pauseJob(): void {
        this._subscription.add(
            this._videoProcessManagerService.pauseJob(this.job.id)
                .subscribe({
                    next: () => {
                        this._toastRef.show('Pause Successfully!');
                    },
                    error: (reason) => {
                        this._toastRef.show(reason);
                    }
                })
        );
    }

    resumeJob(): void {
        this._subscription.add(
            this._videoProcessManagerService.resumeJob(this.job.id)
                .pipe(
                    tap(()=> {
                        this._toastRef.show('Resume Successfully!');
                    }),
                    delay(2000),
                    switchMap(() => {
                        return this._videoProcessManagerService.getJob(this.job.id);
                    }),
                    switchMap((job: VideoProcessJob) => {
                        this.job = job;
                        return this._videoProcessManagerService.getVertices(this.job.id)
                    })
                )
                .subscribe({
                    next: (vertices) => {
                        this.vertices = vertices;
                        this.updateJobAndVertexInfo();
                    },
                    error: (reason) => {
                        this._toastRef.show(reason);
                    }
                })
        );
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
                    for(const vertex of vertices) {
                        if (vertex.status === VertexStatus.Error) {
                            this.errorInfo = JSON.stringify(vertex.error);
                        }
                    }
                })
        );
    }

    private updateJobAndVertexInfo(): void {
        this._subscription.add(
            interval(5000)
                .pipe(
                    takeWhile(() => {
                        return this.job && this.job.status === VideoProcessJobStatus.Queueing || this.job.status === VideoProcessJobStatus.Running;
                    }),
                    switchMap(() => {
                        return this._videoProcessManagerService.getJob(this.job.id)
                    })
                )
                .subscribe((job) => {
                    this.job = job;
                    this.getVertices();
                })
        );
    }
}
