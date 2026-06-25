import { Component, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Bangumi, Episode } from '../../../entity';
import { ResourceGroup } from '../../../entity/ResourceGroup';
import { EMPTY, forkJoin, of, Subscription, timer } from 'rxjs';
import { AdminService } from '../../admin.service';
import { UIDialog, UIToast, UIToastComponent, UIToastRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { ResourceScannerEditor } from '../resource-scanner-editor/resource-scanner-editor.component';
import { FeedService } from '../feed.service';
import { ResourceScanner } from '../../../entity/ResourceScanner';
import { filter, finalize, switchMap, takeWhile } from 'rxjs/operators';
import { nanoid } from 'nanoid';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VideoFile } from '../../../entity/video-file';
import { VideoProcessManagerService } from '../../video-process-manager/video-process-manager.service';
import { VideoProcessJob } from '../../../entity/VideoProcessJob';
import { VideoProcessJobStatus } from '../../../entity/VideoProcessJobStatus';
import { DownloadJob } from '../../../entity/DownloadJob';
import { DownloadJobStatus } from '../../../entity/DownloadJobStatus';
import { DownloadManagerService } from '../../download-manager/download-manager.service';
import { VideoFileModal } from '../video-file-modal/video-file-modal.component';
import { NgClass } from '@angular/common';
import { ScanStatus } from '../../../entity/ScanStatus';
import { ConfirmDialogDirective } from '../../../confirm-dialog/confirm-dialog.directive';

const REFRESH_INTERVAL = 5000;

interface EpisodeVideoFileStatus {
    episode: Episode;
    videoFiles: {
        id: string;
        status: number;
        videoProcessJob?: VideoProcessJob,
        downloadJob?: DownloadJob,
    }[]
}

@Component({
    selector: 'app-resource-group',
    templateUrl: './resource-group.component.html',
    styleUrl: './resource-group.component.less',
    imports: [FormsModule, ReactiveFormsModule, NgClass, ConfirmDialogDirective]
})
export class ResourceGroupComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef!: UIToastRef<UIToastComponent>;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    eVideoFileStatus = {
        Pending: VideoFile.STATUS_DOWNLOAD_PENDING,
        Downloading: VideoFile.STATUS_DOWNLOADING,
        Downloaded: VideoFile.STATUS_DOWNLOADED
    };

    eDefaultRgId = 'DEFAULT_RG_ID';

    @Input()
    bangumi!: Bangumi;

    resourceGroupList: ResourceGroup[] = [];
    feedList: string[];
    scannerLoadingState = false;
    reconcileLoadingState: { [rgId: string]: boolean } = {};

    rgFormDict: { [rgId: string]: FormGroup } = {};
    @Output()
    episodeChanged = new EventEmitter<string>();
    pauseRefreshRG = false;
    episodeVideoFileStatus: { [rgId: string]: EpisodeVideoFileStatus[] } = {};

    resourceScanStatus?: ScanStatus;
    videoFileScanStatus?: ScanStatus;
    resourceScanCountdown = '—';
    videoFileScanCountdown = '—';
    private serverTimeOffset = 0;
    private isRefreshingStatus = false;
    private lastStatusRefresh = 0;
    private lastResourceScanEndTime: string | null = null;
    private lastVideoFileScanEndTime: string | null = null;
    private jobPollingActive = false;

    get hasDownloadingVideoFiles(): boolean {
        return Object.values(this.episodeVideoFileStatus).filter(epvfList => {
            return epvfList.some(epvf => {
                return epvf.videoFiles.filter(vf => vf.status === VideoFile.STATUS_DOWNLOADING).length > 0;
            });
        }).length > 0
    }

    hasDownloadingVideoFilesInGroup(resourceGroupId: string): boolean {
        const epvfList = this.episodeVideoFileStatus[resourceGroupId];
        if (!epvfList) {
            return false;
        }
        return epvfList.some(epvf => epvf.videoFiles.some(vf => vf.status === VideoFile.STATUS_DOWNLOADING));
    }

    constructor(private adminService: AdminService,
                private feedService: FeedService,
                private uiDialog: UIDialog,
                private formBuilder: FormBuilder,
                private videoProcessManageService: VideoProcessManagerService,
                private downloadManagerService: DownloadManagerService,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
    ngOnInit(): void {
        this.subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this.subscription.add(
            timer(0, 1000).subscribe(() => this.updateScanCountdowns())
        );
        this.refreshScanStatus();
        this.subscription.add(
            forkJoin([
                this.adminService.listResourceGroups(
                    this.bangumi.id,
                    true
                ),
                Array.isArray(this.bangumi.episodes) && this.bangumi.episodes.length > 0 ? of(this.bangumi.episodes) : this.adminService.listEpisode(this.bangumi.id)
            ])

                .subscribe({
                    next: ([resourceGroups, episodeList]) => {
                        this.resourceGroupList = resourceGroups;
                        this.bangumi.episodes = episodeList;
                        for (const resourceGroup of this.resourceGroupList) {
                            this.rgFormDict[resourceGroup.id] = this.formBuilder.group({
                                displayName: [resourceGroup.displayName, Validators.required],
                                alertThresholdDay: [resourceGroup.alertThresholdDay]
                            });
                            this.episodeVideoFileStatus[resourceGroup.id] = [];
                            for (const episode of episodeList) {
                                this.episodeVideoFileStatus[resourceGroup.id].push({
                                    episode,
                                    videoFiles: resourceGroup.videoFiles.filter(vf => {
                                        return vf.episode.id === episode.id;
                                    }).map(vf => {
                                        return {
                                            id: vf.id,
                                            status: Number(vf.status)
                                        };
                                    })
                                });
                            }
                        }

                        if (this.hasDownloadingVideoFiles) {
                            this.ensureJobPolling();
                        }
                    }
                })
        );

        this.subscription.add(
            this.feedService.getUniversalMeta()
                .subscribe({
                    next: (metaList) => {
                        this.feedList = metaList;
                    },
                    error: (error) => {
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    private updateScanCountdowns(): void {
        this.resourceScanCountdown = this.computeCountdown(this.resourceScanStatus);
        this.videoFileScanCountdown = this.computeCountdown(this.videoFileScanStatus);
        // The server keeps scanning on its own schedule, so once a countdown is
        // due (or a scan is running), re-request the status to pick up the next
        // scheduled time. Throttled to avoid spamming the endpoint.
        if (this.needScanStatusRefresh()) {
            this.refreshScanStatus();
        }
    }

    private needScanStatusRefresh(): boolean {
        return this.isScanStatusStale(this.resourceScanStatus)
            || this.isScanStatusStale(this.videoFileScanStatus);
    }

    private isScanStatusStale(status?: ScanStatus): boolean {
        if (!status) {
            return false;
        }
        if (status.isScanning) {
            return true;
        }
        if (!status.nextScanTime) {
            return false;
        }
        const nowOnServer = Date.now() + this.serverTimeOffset;
        return new Date(status.nextScanTime).getTime() - nowOnServer <= 0;
    }

    private refreshScanStatus(): void {
        const MIN_REFRESH_INTERVAL = 3000;
        if (this.isRefreshingStatus || Date.now() - this.lastStatusRefresh < MIN_REFRESH_INTERVAL) {
            return;
        }
        this.isRefreshingStatus = true;
        this.lastStatusRefresh = Date.now();
        this.subscription.add(
            this.adminService.getStatus()
                .subscribe({
                    next: (status) => {
                        this.resourceScanStatus = status.resourceScan;
                        this.videoFileScanStatus = status.videoFileScan;
                        // Correct for clock skew between this browser and the server.
                        this.serverTimeOffset = new Date(status.serverTime).getTime() - Date.now();
                        this.isRefreshingStatus = false;
                        this.detectScanCompletion();
                    },
                    error: () => {
                        this.isRefreshingStatus = false;
                    }
                })
        );
    }

    private computeCountdown(status?: ScanStatus): string {
        if (!status) {
            return '—';
        }
        if (status.isScanning) {
            return 'Scanning…';
        }
        if (!status.nextScanTime) {
            return '—';
        }
        const nowOnServer = Date.now() + this.serverTimeOffset;
        const remainingMs = new Date(status.nextScanTime).getTime() - nowOnServer;
        if (remainingMs <= 0) {
            return 'Due now';
        }
        const totalSeconds = Math.floor(remainingMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    addResourceGroup(): void {
        const rg = new ResourceGroup();
        rg.id = this.eDefaultRgId;
        rg.displayName = `Resource Group ${this.resourceGroupList.length}`;
        rg.alertThresholdDay = 2;
        rg.bangumi = this.bangumi;
        this.resourceGroupList.push(rg);
        this.rgFormDict[rg.id] = this.formBuilder.group({
            displayName: [rg.displayName, Validators.required],
            alertThresholdDay: [rg.alertThresholdDay]
        });

        this.subscription.add(
            this.adminService.addResourceGroup(rg)
                .subscribe({
                    next: (resourceGroup) => {
                        if (this.bangumi.episodes) {
                            this.episodeVideoFileStatus[rg.id] = this.bangumi.episodes.map(episode => {
                                return {
                                    episode,
                                    videoFiles: []
                                } as EpisodeVideoFileStatus;
                            });
                        }
                    },
                    error: (error) => {
                        this.toastRef.show(error.error?.message || 'Unknown error');
                    }
                })
        );
    }

    updateResourceGroup(resourceGroup: ResourceGroup): void {
        const rgForm = this.rgFormDict[resourceGroup.id];
        if (rgForm.invalid) {
            return;
        }
        const value = rgForm.value as { displayName: string, alertThresholdDay: number };
        resourceGroup.displayName = value.displayName;
        resourceGroup.alertThresholdDay = value.alertThresholdDay;
        this.subscription.add(
            this.adminService.updateResourceGroup(resourceGroup)
                .subscribe({
                    next: (updatedRG: ResourceGroup) => {
                        const idx = this.resourceGroupList.findIndex(rg => rg.id === updatedRG.id);
                        if (idx >= 0) {
                            this.resourceGroupList[idx] = updatedRG
                        }
                        this.toastRef.show(`Update resourceGroup successfully`);
                    },
                    error: (error) => {
                        this.toastRef.show(error.error?.message || 'Unknown error');
                    }
                })
        )
    }

    deleteResourceGroup(resourceGroupId: string): void {
        this.subscription.add(
            this.adminService.deleteResourceGroup(this.bangumi.id, resourceGroupId)
                .subscribe({
                    next: () => {
                        for (let i = 0; i < this.resourceGroupList.length; i++) {
                            if (this.resourceGroupList[i].id === resourceGroupId) {
                                this.resourceGroupList.splice(i, 1);
                                break;
                            }
                        }
                        delete this.rgFormDict[resourceGroupId];
                        delete this.episodeVideoFileStatus[resourceGroupId];
                    },
                    error: (error) => {
                        this.toastRef.show(error.error?.message || 'Unknown error');
                    }
                })
        );
    }

    /**
     * Detects whether a periodic scan finished since the last status poll and,
     * if so, reloads the resource group info. A scan completing is the moment
     * new video files may have been created (resource scan) or downloads may
     * have been started (video file scan).
     */
    private detectScanCompletion(): void {
        let scanCompleted = false;

        const resourceEnd = this.resourceScanStatus?.lastScanEndTime ?? null;
        if (this.lastResourceScanEndTime !== null && resourceEnd !== null && resourceEnd !== this.lastResourceScanEndTime) {
            scanCompleted = true;
        }
        this.lastResourceScanEndTime = resourceEnd;

        const videoFileEnd = this.videoFileScanStatus?.lastScanEndTime ?? null;
        if (this.lastVideoFileScanEndTime !== null && videoFileEnd !== null && videoFileEnd !== this.lastVideoFileScanEndTime) {
            scanCompleted = true;
        }
        this.lastVideoFileScanEndTime = videoFileEnd;

        if (scanCompleted) {
            this.reloadResourceGroups();
        }
    }

    /**
     * Fetches the resource groups once and merges the latest video file statuses
     * into the current view. Triggered by events (scan completion, download
     * complete, video process finished) rather than on a fixed interval.
     */
    private reloadResourceGroups(): void {
        if (this.pauseRefreshRG) {
            return;
        }
        this.subscription.add(
            this.adminService.listResourceGroups(this.bangumi.id, true)
                .subscribe({
                    next: (resourceGroups: ResourceGroup[]) => {
                        for (const resourceGroup of resourceGroups) {
                            const epvfsList = this.episodeVideoFileStatus[resourceGroup.id]
                            if (epvfsList) {
                                for (const videoFile of resourceGroup.videoFiles) {
                                    const epVfS = epvfsList.find(epvfs => epvfs.episode.id === videoFile.episode.id);
                                    if (epVfS) {
                                        const epVf = epVfS.videoFiles.find(vf => vf.id === videoFile.id);
                                        if (!epVf) {
                                            epVfS.videoFiles.push({
                                                id: videoFile.id,
                                                status: videoFile.status
                                            });
                                        } else {
                                            epVf.status = videoFile.status;
                                        }
                                    }
                                }
                            }
                        }
                        // New downloads may have appeared; keep job progress live.
                        this.ensureJobPolling();
                    },
                    error: (error) => {
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    resetForm(resourceGroup: ResourceGroup): void {
        this.rgFormDict[resourceGroup.id].patchValue({
            displayName: resourceGroup.displayName,
            alertThresholdDay: resourceGroup.alertThresholdDay
        });
        this.rgFormDict[resourceGroup.id].markAsPristine();
    }

    addScanner(group: ResourceGroup): void {
        const scanner: ResourceScanner = {
            id: nanoid(8),
            feed: this.feedList[0],
            criteria: '',
            enableRegex: false
        };
        this.editScanner(scanner, group, false);
    }

    editScanner(scanner: ResourceScanner, group: ResourceGroup, isEditing: boolean = true): void {
        this.pauseRefreshRG = true;
        let dialogRef = this.uiDialog.open(ResourceScannerEditor, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        dialogRef.componentInstance.feedList = this.feedList;
        dialogRef.componentInstance.scanner = scanner;
        dialogRef.componentInstance.resourceGroupId = group.id;
        const index = group.scanner.findIndex(sc => sc.id === scanner.id);
        dialogRef.componentInstance.scannerIndex = index >= 0 ? index : group.scanner.length;
        dialogRef.componentInstance.isEditing = isEditing;
        this.subscription.add(
            dialogRef.afterClosed().pipe(
                filter((result: any) => !!result),
                switchMap((result: any) => {
                    this.scannerLoadingState = true;
                    if (result.result === ResourceScannerEditor.DIALOG_RESULT_DOWNLOAD_DIRECTLY) {
                        this.episodeChanged.emit(this.bangumi.id);
                        return EMPTY;
                    } else if (result === ResourceScannerEditor.DIALOG_RESULT_DELETE) {
                        if (index >= 0) {
                            group.scanner.splice(index, 1);
                            return this.adminService.updateResourceGroup(group);
                        } else {
                            return EMPTY;
                        }
                    } else {
                        const idx = group.scanner.findIndex(sc => sc.id === scanner.id);
                        if (idx >= 0) {
                            group.scanner[idx] = scanner;
                        } else {
                            group.scanner.push(scanner);
                        }
                        return this.adminService.updateResourceGroup(group);
                    }
                }),)
                .subscribe({
                    next: () => {
                        this.pauseRefreshRG = false;
                        this.scannerLoadingState = false;
                        this.toastRef.show('更新成功');
                    },
                    error: (error) => {
                        this.pauseRefreshRG = false;
                        this.scannerLoadingState = false;
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    /**
     * Polls download / video-process job lists while there is active work, so
     * progress stays live. It also detects the moment a download completes or a
     * video process finishes and reloads the resource group to reflect the new
     * video file statuses. The loop self-stops once nothing is downloading.
     */
    private ensureJobPolling(): void {
        if (this.jobPollingActive || !this.hasDownloadingVideoFiles) {
            return;
        }
        this.jobPollingActive = true;
        this.subscription.add(
            timer(0, REFRESH_INTERVAL)
                .pipe(
                    takeWhile(() => this.hasDownloadingVideoFiles),
                    switchMap(() => forkJoin([
                        this.videoProcessManageService.listJobs('all', this.bangumi.id),
                        this.downloadManagerService.list_jobs('all', this.bangumi.id)
                    ])),
                    finalize(() => { this.jobPollingActive = false; })
                )
                .subscribe({
                    next: ([videoProcessJobList, downloadJobList]) => {
                        this.applyJobUpdates(videoProcessJobList, downloadJobList);
                    },
                    error: (error) => {
                        this.jobPollingActive = false;
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    private applyJobUpdates(videoProcessJobList: VideoProcessJob[], downloadJobList: DownloadJob[]): void {
        let shouldReload = false;
        Object.values(this.episodeVideoFileStatus).forEach(epvfList => {
            epvfList.forEach(epvf => {
                epvf.videoFiles.forEach(vf => {
                    if (vf.status !== VideoFile.STATUS_DOWNLOADING) {
                        return;
                    }
                    const videoProcessJob = videoProcessJobList.find(vpJob => vpJob.jobMessage.videoId === vf.id);
                    if (videoProcessJob) {
                        if (vf.videoProcessJob?.status !== VideoProcessJobStatus.Finished
                            && videoProcessJob.status === VideoProcessJobStatus.Finished) {
                            shouldReload = true;
                        }
                        vf.videoProcessJob = videoProcessJob;
                    }
                    const downloadJob = downloadJobList.find(dJob => dJob.videoId === vf.id || (dJob.fileMapping && dJob.fileMapping.some(mapping => mapping.videoId === vf.id)));
                    if (downloadJob) {
                        if (vf.downloadJob?.status !== DownloadJobStatus.Complete
                            && downloadJob.status === DownloadJobStatus.Complete) {
                            shouldReload = true;
                        }
                        vf.downloadJob = downloadJob;
                    }
                });
            });
        });
        if (shouldReload) {
            this.reloadResourceGroups();
        }
    }

    viewEpisode(resourceGroup: ResourceGroup, episode: Episode): void {
        this.pauseRefreshRG = true;
        const dialogRef = this.uiDialog.open(VideoFileModal, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.episode = episode;
        dialogRef.componentInstance.resourceGroup = resourceGroup;
        dialogRef.afterClosed()
            .pipe(switchMap(() => {
                return this.adminService.getEpisodeVideoFiles(episode.id, resourceGroup.id);
            }))
            .subscribe({
                next: (videoFileList) => {
                    const epvfs = this.episodeVideoFileStatus[resourceGroup.id].find(epvfs => epvfs.episode.id === episode.id);
                    for (const videoFile of videoFileList) {
                        const idx = resourceGroup.videoFiles.indexOf(videoFile);
                        if (idx >= 0) {
                            resourceGroup.videoFiles[idx] = videoFile;
                        }
                        if (epvfs) {
                            const vf = epvfs.videoFiles.find(vf => vf.id === videoFile.id);
                            if (vf) {
                                vf.status = videoFile.status;
                            }
                        }
                    }
                    this.pauseRefreshRG = false;
                }
            });
    }

    reconcileResourceGroup(resourceGroup: ResourceGroup): void {
        const epvfList = this.episodeVideoFileStatus[resourceGroup.id];
        if (!epvfList) {
            return;
        }
        const videoFileIds = epvfList
            .reduce((ids, epvf) => {
                epvf.videoFiles.forEach(vf => {
                    if (vf.status === VideoFile.STATUS_DOWNLOADING) {
                        ids.push(vf.id);
                    }
                });
                return ids;
            }, [] as string[]);
        if (videoFileIds.length === 0) {
            return;
        }
        this.reconcileLoadingState[resourceGroup.id] = true;
        this.subscription.add(
            this.videoProcessManageService.reconcileVideoFiles(videoFileIds)
                .subscribe({
                    next: (result) => {
                        this.reconcileLoadingState[resourceGroup.id] = false;
                        this.toastRef.show(`Reconcile requested for ${videoFileIds.length} video file(s), ${result.reconciled} re-published`);
                    },
                    error: (error) => {
                        this.reconcileLoadingState[resourceGroup.id] = false;
                        this.toastRef.show(error.error?.message || error.message || 'Unknown error');
                    }
                })
        );
    }
}
