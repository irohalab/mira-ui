import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Bangumi, Episode } from '../../../entity';
import { ResourceGroup } from '../../../entity/ResourceGroup';
import { EMPTY, forkJoin, of, Subscription } from 'rxjs';
import { AdminService } from '../../admin.service';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { ResourceScannerEditor } from '../resource-scanner-editor/resource-scanner-editor.component';
import { FeedService } from '../feed.service';
import { ResourceScanner } from '../../../entity/ResourceScanner';
import { filter, repeat, switchMap } from 'rxjs/operators';
import { nanoid } from 'nanoid';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VideoFile } from '../../../entity/video-file';
import { VideoProcessManagerService } from '../../video-process-manager/video-process-manager.service';
import { VideoProcessJob } from '../../../entity/VideoProcessJob';
import { DownloadJob } from '../../../entity/DownloadJob';
import { DownloadManagerService } from '../../download-manager/download-manager.service';
import { VideoFileModal } from '../video-file-modal/video-file-modal.component';

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
    standalone: false
})
export class ResourceGroupComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef!: UIToastRef<UIToastComponent>;

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

    rgFormDict: { [rgId: string]: FormGroup } = {};

    @Output()
    episodeChanged = new EventEmitter<string>();

    episodeVideoFileStatus: { [rgId: string]: EpisodeVideoFileStatus[] } = {};

    get hasDownloadingVideoFiles(): boolean {
        return Object.values(this.episodeVideoFileStatus).filter(epvfList => {
            return epvfList.some(epvf => {
                return epvf.videoFiles.filter(vf => vf.status === VideoFile.STATUS_DOWNLOADING).length > 0;
            });
        }).length > 0
    }

    constructor(private adminService: AdminService,
                private feedService: FeedService,
                private uiDialog: UIDialog,
                private formBuilder: FormBuilder,
                private videoProcessManageService: VideoProcessManagerService,
                private downloadManagerService: DownloadManagerService,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
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
                            this.refreshVideoJob();
                            this.refreshDownloadJob();
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

        if (this.bangumi.episodes) {
            this.episodeVideoFileStatus[rg.id] = this.bangumi.episodes.map(episode => {
                return {
                    episode,
                    videoFiles: []
                }
            })
        }
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
        let dialogRef = this.uiDialog.open(ResourceScannerEditor, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        dialogRef.componentInstance.feedList = this.feedList;
        dialogRef.componentInstance.scanner = scanner;
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
                        this.scannerLoadingState = false;
                        this.toastRef.show('更新成功');
                    },
                    error: (error) => {
                        this.scannerLoadingState = false;
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    refreshVideoJob(): void {
        this.subscription.add(
            this.videoProcessManageService.listJobs('all', this.bangumi.id)
                .pipe(repeat({delay: REFRESH_INTERVAL}))
                .subscribe({
                    next: (videoProcessJobList) => {
                        Object.values(this.episodeVideoFileStatus).forEach(epvfList => {
                            epvfList.forEach(epvf => {
                                epvf.videoFiles.forEach(vf => {
                                    if (vf.status === VideoFile.STATUS_DOWNLOADING) {
                                        const job = videoProcessJobList.find(vpJob => vpJob.jobMessage.videoId === vf.id);
                                        if (job) {
                                            vf.videoProcessJob = job;
                                        }
                                    }
                                });
                            });
                        });
                    },
                    error: (error) => {
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    refreshDownloadJob(): void {
        this.subscription.add(
            this.downloadManagerService.list_jobs('all', this.bangumi.id)
                .pipe(repeat({delay: REFRESH_INTERVAL}))
                .subscribe({
                    next: (downloadJobList) => {
                        Object.values(this.episodeVideoFileStatus).forEach(epvfList => {
                            epvfList.forEach(epvf => {
                                epvf.videoFiles.forEach(vf => {
                                    if (vf.status === VideoFile.STATUS_DOWNLOADING) {
                                        vf.downloadJob = downloadJobList.find(downloadJob => downloadJob.videoId === vf.id || (downloadJob.fileMapping && downloadJob.fileMapping.some(mapping => mapping.videoId === vf.id)));
                                    }
                                });
                            });
                        });
                    },
                    error: (error) => {
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    viewEpisode(resourceGroup: ResourceGroup, episode: Episode): void {
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
                            vf.status = videoFile.status;
                        }
                    }
                }
            })
    }
}
