import { AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Optional, Output, ViewChild } from '@angular/core';
import { VideoProcessManagerService } from '../video-process-manager/video-process-manager.service';
import { combineLatestWith, delay, interval, ReplaySubject, Subject, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, filter, map, switchMap, takeWhile, tap } from 'rxjs/operators';
import { DARK_THEME, DarkThemeService, UIDialog, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { Vertex } from '../../entity/Vertex';
import { AdminService } from '../admin.service';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { LogType } from '../video-process-manager/LogType';
import {
    getMaxCharacterPerLineForContainer,
    processLineForStreamLogViewer
} from './stream-log-viewer/stream-log-helper';
import { VertexInfoPanelComponent } from './vertex-info-panel/vertex-info-panel.component';
import { VertexStatus } from '../../entity/VertexStatus';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { AdminNavbar } from '../admin-navbar/admin-navbar.component';
import { ConfirmDialogDirective } from '../../confirm-dialog/confirm-dialog.directive';
import { VertexGraphComponent } from './vertex-graph/vertex-graph.component';
import { StreamLogViewerComponent } from './stream-log-viewer/stream-log-viewer.component';
import { NgClass } from '@angular/common';
import { ResourceGroup } from '../../entity/ResourceGroup';
import { VideoFile } from '../../entity/video-file';
import { BangumiAdminEntity } from '../../entity/admin/BangumiAdminEntity';
import { EpisodeAdminEntity } from '../../entity/admin/EpisodeAdminEntity';
import { VideoFileAdminEntity } from '../../entity/admin/VideoFileAdminEntity';

@Component({
    selector: 'video-process-job-detail',
    templateUrl: './video-process-job-detail.html',
    styleUrls: ['./video-process-job-detail.less'],
    imports: [AdminNavbar, ConfirmDialogDirective, VertexGraphComponent, StreamLogViewerComponent, NgClass]
})
export class VideoProcessJobDetailComponent implements OnInit, OnDestroy, AfterViewInit {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    private jobContainerMaxCharacter: number;
    private vertexDetailDialogRef: UIDialogRef<VertexInfoPanelComponent>;
    private _dialogSubscription = new Subscription();
    private jobIdInput = new ReplaySubject<string>(1);

    eJobStatus = VideoProcessJobStatus;

    job: VideoProcessJob;
    vertices: Vertex[];
    bangumi: BangumiAdminEntity;
    episode: EpisodeAdminEntity;

    shouldShowJobLog = false;
    jobLogLines = new Subject<LogType>();

    errorInfo: any;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @ViewChild('jobLogContainer') jobLogContainerRef: ElementRef;

    @Input()
    set jobId(jobId: string) {
        if (jobId) {
            this.jobIdInput.next(jobId);
        }
    }

    get isDialogMode(): boolean {
        return !!this._dialogRef;
    }

    @Output()
    navigationRequested = new EventEmitter<any[]>();

    constructor(private _videoProcessManagerService: VideoProcessManagerService,
                private _adminService: AdminService,
                private _route: ActivatedRoute,
                private _router: Router,
                private _dialog: UIDialog,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                private titleService: Title,
                @Optional() private _dialogRef: UIDialogRef<VideoProcessJobDetailComponent>) {
        this._toastRef = toastService.makeText();
    }

    ngAfterViewInit(): void {
        const jobLogContainerElement = this.jobLogContainerRef.nativeElement as HTMLElement;
        this.jobContainerMaxCharacter = getMaxCharacterPerLineForContainer(jobLogContainerElement);
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        const jobIdSource = this.isDialogMode
            ? this.jobIdInput
            : this._route.params.pipe(map(params => params['id'] as string));
        this._subscription.add(
            jobIdSource.pipe(
                filter(jobId => !!jobId),
                distinctUntilChanged(),
                switchMap(jobId => {
                    if (!this.isDialogMode) {
                        this.titleService.setTitle(`Video Job Detail - ${environment.siteTitle}`);
                    }
                    return this._videoProcessManagerService.getJob(jobId)
                        .pipe(combineLatestWith(this._videoProcessManagerService.getVertices(jobId)));
                }),
                switchMap(([job, vertices]) => {
                    this.job = job;
                    this.vertices = vertices;
                    return this._adminService.getBangumi(job.jobMessage.bangumiId);
                }))
                .subscribe({
                    next: (bangumi: BangumiAdminEntity) => {
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
        this._dialogSubscription.unsubscribe();
        if (this.vertexDetailDialogRef) {
            this.vertexDetailDialogRef.close(null);
            this.vertexDetailDialogRef = undefined;
        }
    }

    closeDialog(): void {
        this._dialogRef?.close(null);
    }

    navigate(commands: any[]): void {
        if (this.isDialogMode && this.navigationRequested.observed) {
            this.navigationRequested.emit(commands);
            return;
        }
        this.closeDialog();
        this._router.navigate(commands);
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
                    this.vertexDetailDialogRef = undefined;
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
                        error: (error) => {
                            console.log(error);
                        }
                    })
            );
            this.shouldShowJobLog = true;
        }
    }

    private getEpisode(): void {
        this._subscription.add(
            this._adminService.listResourceGroups(this.bangumi.id, true)
                .subscribe({
                    next: (resourceGroupList: ResourceGroup[]) => {
                        const videoFileId = this.job.jobMessage.videoId;
                        let videoFile: VideoFileAdminEntity;
                        for (const resourceGroup of resourceGroupList) {
                            videoFile = resourceGroup.videoFiles.find(vf => vf.id === videoFileId);
                            if (videoFile) {
                                break;
                            }
                        }
                        if (videoFile) {
                            this.episode = this.bangumi.episodes.find(eps => eps.id === videoFile.episode.id);
                        }
                    },
                    error: (error) => {
                        this._toastRef.show(error.message);
                    },
                })
        );
    }

    private getVertices(): void {
        this._subscription.add(
            this._videoProcessManagerService.getVertices(this.job.id)
                .subscribe((vertices) => {
                    this.vertices = vertices;
                    for(const vertex of vertices) {
                        if (vertex.status === VertexStatus.Error) {
                            this.errorInfo = Object.assign({}, vertex.error);
                            if (this.errorInfo.stack) {
                                this.errorInfo.stack = this.errorInfo.stack.replace(/\\n/g, '<br>');
                            }
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
                        return this.job
                            && (this.job.status === VideoProcessJobStatus.Queueing
                                || this.job.status === VideoProcessJobStatus.Running);
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
