import { DatePipe, NgClass } from '@angular/common';
import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
    DARK_THEME,
    DarkThemeService,
    UIDialog,
    UIDialogRef,
    UIToast,
    UIToastComponent,
    UIToastRef,
    UIToggle
} from '@irohalab/deneb-ui';
import { forkJoin, of, Subscription, timer } from 'rxjs';
import { catchError, finalize, map, switchMap, takeWhile } from 'rxjs/operators';
import { ConfirmDialogDirective } from '../../../../confirm-dialog/confirm-dialog.directive';
import { DownloadJob } from '../../../../entity/DownloadJob';
import { DownloadJobStatus } from '../../../../entity/DownloadJobStatus';
import { EpisodeAdminEntity } from '../../../../entity/admin/EpisodeAdminEntity';
import { VideoFileAdminEntity, VideoFileAdminPayload } from '../../../../entity/admin/VideoFileAdminEntity';
import { ResourceGroup } from '../../../../entity/ResourceGroup';
import { VideoProcessJob } from '../../../../entity/VideoProcessJob';
import { VideoProcessJobState } from '../../../../entity/VideoProcessJobState';
import { VideoProcessJobStatus } from '../../../../entity/VideoProcessJobStatus';
import { VideoProcessRule } from '../../../../entity/VideoProcessRule';
import { ReadableUnit } from '../../../../pipes/readable-unit';
import { DownloadJobDetailComponent } from '../../../download-manager/download-job-detail/download-job-detail.component';
import { DownloadManagerService } from '../../../download-manager/download-manager.service';
import { VideoProcessJobDetailComponent } from '../../../video-process-job-detail/video-process-job-detail.component';
import { VideoProcessManagerService } from '../../../video-process-manager/video-process-manager.service';
import { AdminService } from '../../../admin.service';
import { VideoProcessRuleEditorComponent } from '../../video-processs-rule/video-process-rule-editor/video-process-rule-editor.component';
import { VideoProcessRuleItemComponent } from '../../video-processs-rule/video-process-rule-item/video-process-rule-item.component';
import { VideoProcessRuleService } from '../../video-processs-rule/video-process-rule.service';
import { UserService } from '../../../../user-service/user.service';
import { User } from '../../../../entity/user';
import { UUID_PATTERN } from '../../../../../helpers/admin-form-validators';

type DetailTab = 'details' | 'rule';

export interface VideoFileDetailPanelResult {
    action: 'saved' | 'deleted' | 'dismissed';
    videoFileId?: string;
    transferred?: boolean;
}

const LINKED_JOB_REFRESH_INTERVAL = 5000;

@Component({
    selector: 'video-file-detail-panel',
    templateUrl: './video-file-detail-panel.html',
    styleUrls: ['./video-file-detail-panel.less'],
    imports: [
        DatePipe,
        NgClass,
        FormsModule,
        ReactiveFormsModule,
        UIToggle,
        ConfirmDialogDirective,
        VideoProcessRuleItemComponent,
        ReadableUnit
    ]
})
export class VideoFileDetailPanelComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private jobPollingSubscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private bangumiRules: VideoProcessRule[] = [];
    private videoFileRules: VideoProcessRule[] = [];
    private destinationSubscription?: Subscription;
    private loadedDestinationBangumiId?: string;

    @Input()
    episode!: EpisodeAdminEntity;

    @Input()
    resourceGroup!: ResourceGroup;

    @Input()
    videoFileId?: string;

    @Input()
    createNew = false;

    @Input()
    downloadJob?: DownloadJob;

    @Input()
    videoProcessJob?: VideoProcessJob;

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    activeTab: DetailTab = 'details';
    videoFile?: VideoFileAdminEntity;
    videoFileForm?: FormGroup;
    videoProcessRule?: VideoProcessRule;
    hasBangumiWideRule = false;
    systemFieldsUnlocked = false;
    diagnosticsExpanded = false;
    loading = true;
    saving = false;
    deleting = false;
    handlingConvert = false;
    loadError?: string;
    ruleInvariantError?: string;
    isSuperAdmin = false;
    ownershipEditing = false;
    destinationLoading = false;
    destinationError?: string;
    destinationBangumiName?: string;
    destinationEpisodes: EpisodeAdminEntity[] = [];
    destinationResourceGroups: ResourceGroup[] = [];

    eDownloadJobStatus = DownloadJobStatus;

    readonly videoFileStatus = {
        pending: VideoFileAdminEntity.STATUS_DOWNLOAD_PENDING,
        downloading: VideoFileAdminEntity.STATUS_DOWNLOADING,
        downloaded: VideoFileAdminEntity.STATUS_DOWNLOADED
    };

    constructor(private dialogRef: UIDialogRef<VideoFileDetailPanelComponent>,
                private adminService: AdminService,
                private formBuilder: FormBuilder,
                private dialog: UIDialog,
                private videoProcessRuleService: VideoProcessRuleService,
                private downloadManagerService: DownloadManagerService,
                private videoProcessManagerService: VideoProcessManagerService,
                private darkThemeService: DarkThemeService,
                private router: Router,
                toast: UIToast,
                private userService: UserService) {
        this.toastRef = toast.makeText();
    }

    get isPersisted(): boolean {
        return !!this.videoFile?.id;
    }

    get hasApplicableRule(): boolean {
        return !!this.videoProcessRule || this.hasBangumiWideRule;
    }

    get latestProcessState(): VideoProcessJobState | undefined {
        const history = this.videoProcessJob?.stateHistory;
        return history?.length ? history[history.length - 1] : undefined;
    }

    get ownershipChanged(): boolean {
        if (!this.videoFileForm) return false;
        const value = this.videoFileForm.getRawValue();
        return value.bangumiId !== (this.videoFile?.bangumi.id ?? this.episode.bangumi.id)
            || value.episodeId !== (this.videoFile?.episode.id ?? this.episode.id)
            || value.resourceGroupId !== (this.videoFile?.resourceGroup.id ?? this.resourceGroup.id);
    }

    get destinationReady(): boolean {
        if (!this.ownershipEditing) return true;
        const value = this.videoFileForm?.getRawValue();
        return !this.destinationLoading && !!value
            && this.loadedDestinationBangumiId === value.bangumiId
            && this.destinationEpisodes.some(episode => episode.id === value.episodeId)
            && this.destinationResourceGroups.some(group => group.id === value.resourceGroupId);
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this.subscription.add(this.userService.userInfo.subscribe(user => {
            this.isSuperAdmin = user?.role === User.SUPER_ADMIN_ROLE;
            if (!this.isSuperAdmin && this.ownershipEditing) this.setOwnershipEditing(false);
        }));

        this.subscription.add(
            forkJoin({
                videoFiles: this.createNew ? of([] as VideoFileAdminEntity[])
                    : this.adminService.getEpisodeVideoFiles(this.episode.id, this.resourceGroup.id),
                rules: this.videoProcessRuleService.listRulesByBangumi(this.episode.bangumi.id)
                    .pipe(catchError(error => {
                        this.toastRef.show(error.message || error);
                        return of([] as VideoProcessRule[]);
                    }))
            })
                .pipe(finalize(() => { this.loading = false; }))
                .subscribe({
                    next: ({videoFiles, rules}) => {
                        this.bangumiRules = rules;
                        if (!this.videoFileId && videoFiles.length > 1) {
                            this.loadError = `Expected one VideoFile for this episode and resource group, but found ${videoFiles.length}.`;
                            return;
                        }
                        this.videoFile = this.videoFileId
                            ? videoFiles.find(file => file.id === this.videoFileId)
                            : videoFiles[0];
                        if (this.videoFileId && !this.videoFile) {
                            this.loadError = 'The selected VideoFile no longer belongs to this episode and resource group.';
                            return;
                        }
                        this.buildForm(this.videoFile);
                        this.applyRuleState();
                        this.resolveLinkedJobs();
                    },
                    error: error => {
                        this.loadError = error.message || String(error);
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.jobPollingSubscription.unsubscribe();
        this.destinationSubscription?.unsubscribe();
    }

    selectTab(tab: DetailTab): void {
        this.activeTab = tab;
    }

    setSystemFieldsUnlocked(unlocked: boolean): void {
        this.systemFieldsUnlocked = unlocked;
        const method = unlocked ? 'enable' : 'disable';
        for (const controlName of this.protectedControlNames) {
            this.videoFileForm?.get(controlName)?.[method]({emitEvent: false});
        }
    }

    setOwnershipEditing(editing: boolean): void {
        if (editing && !this.isSuperAdmin) return;
        this.destinationSubscription?.unsubscribe();
        this.ownershipEditing = editing;
        this.loadedDestinationBangumiId = undefined;
        this.destinationError = undefined;
        this.destinationBangumiName = undefined;
        this.destinationEpisodes = [];
        this.destinationResourceGroups = [];
        const form = this.videoFileForm;
        if (!form) return;
        if (!editing) {
            form.patchValue({
                bangumiId: this.videoFile?.bangumi.id ?? this.episode.bangumi.id,
                episodeId: this.videoFile?.episode.id ?? this.episode.id,
                resourceGroupId: this.videoFile?.resourceGroup.id ?? this.resourceGroup.id
            });
        }
        for (const name of ['bangumiId', 'episodeId', 'resourceGroupId']) {
            form.get(name)![editing ? 'enable' : 'disable']({emitEvent: false});
        }
        if (editing) this.loadOwnershipDestination();
    }

    onDestinationBangumiChange(): void {
        this.destinationSubscription?.unsubscribe();
        this.loadedDestinationBangumiId = undefined;
        this.destinationBangumiName = undefined;
        this.destinationEpisodes = [];
        this.destinationResourceGroups = [];
        this.destinationError = undefined;
        this.videoFileForm?.patchValue({episodeId: '', resourceGroupId: ''});
    }

    loadOwnershipDestination(): void {
        if (!this.ownershipEditing || !this.videoFileForm) return;
        const bangumiId: string = this.videoFileForm.get('bangumiId')!.value;
        if (!UUID_PATTERN.test(bangumiId)) {
            this.destinationError = 'Enter a valid destination bangumiId.';
            this.toastRef.show(this.destinationError);
            return;
        }
        this.destinationSubscription?.unsubscribe();
        this.destinationError = undefined;
        this.destinationLoading = true;
        this.destinationSubscription = forkJoin({
            bangumi: this.adminService.getBangumi(bangumiId),
            episodes: this.adminService.listEpisode(bangumiId),
            resourceGroups: this.adminService.listResourceGroups(bangumiId, false)
        }).pipe(finalize(() => { this.destinationLoading = false; }))
            .subscribe({
                next: ({bangumi, episodes, resourceGroups}) => {
                    this.loadedDestinationBangumiId = bangumiId;
                    this.destinationBangumiName = bangumi.nameCn || bangumi.name || bangumi.id;
                    this.destinationEpisodes = episodes;
                    this.destinationResourceGroups = resourceGroups;
                    const value = this.videoFileForm!.getRawValue();
                    if (!episodes.some(episode => episode.id === value.episodeId)) {
                        this.videoFileForm!.get('episodeId')!.setValue('');
                    }
                    if (!resourceGroups.some(group => group.id === value.resourceGroupId)) {
                        this.videoFileForm!.get('resourceGroupId')!.setValue('');
                    }
                },
                error: error => {
                    this.loadedDestinationBangumiId = undefined;
                    this.destinationError = `Unable to load destination: ${error.message || error}`;
                    this.toastRef.show(this.destinationError);
                }
            });
    }

    save(): void {
        if (!this.videoFileForm || this.videoFileForm.invalid || this.saving) {
            return;
        }
        if (!this.destinationReady) {
            this.toastRef.show('Load the destination bangumi and select its episode and resourceGroup before saving.');
            return;
        }

        this.saving = true;
        const payload = this.buildPayload();
        const transferring = this.isPersisted && this.ownershipChanged;
        const saveRequest = this.isPersisted
            ? this.adminService.updateVideoFile(payload).pipe(map(() => this.videoFile!.id))
            : this.adminService.addVideoFile(payload);

        this.subscription.add(
            saveRequest
                .pipe(
                    switchMap(videoFileId => this.adminService
                        .getEpisodeVideoFiles(payload.episodeId, payload.resourceGroupId)
                        .pipe(map(videoFiles => this.requireSingleVideoFile(videoFiles, videoFileId)))),
                    finalize(() => { this.saving = false; })
                )
                .subscribe({
                    next: videoFile => {
                        this.videoFile = videoFile;
                        this.createNew = false;
                        if (transferring) {
                            this.toastRef.show('VideoFile transferred. Storage, jobs, and processing rules were not changed.');
                            this.dialogRef.close({action: 'saved', videoFileId: videoFile.id, transferred: true} satisfies VideoFileDetailPanelResult);
                            return;
                        }
                        this.buildForm(videoFile);
                        this.applyRuleState();
                        this.resolveLinkedJobs();
                        this.toastRef.show('VideoFile saved successfully.');
                    },
                    error: error => {
                        this.toastRef.show(`Unable to save VideoFile: ${error.message || error}`);
                    }
                })
        );
    }

    deleteVideoFile(): void {
        if (this.deleting) {
            return;
        }
        if (!this.isPersisted) {
            this.dialogRef.close({action: 'dismissed'} as VideoFileDetailPanelResult);
            return;
        }

        this.deleting = true;
        const videoFileId = this.videoFile!.id;
        this.subscription.add(
            this.adminService.deleteVideoFile(videoFileId)
                .pipe(
                    switchMap(() => {
                        const ruleIds = this.videoFileRules
                            .map(rule => rule.id)
                            .filter(ruleId => !!ruleId);
                        if (ruleIds.length === 0) {
                            return of(null);
                        }
                        return forkJoin(ruleIds.map(ruleId => this.videoProcessRuleService.deleteRule(ruleId)
                            .pipe(catchError(error => {
                                this.toastRef.show(`VideoFile deleted, but process rule ${ruleId} could not be deleted: ${error.message || error}`);
                                return of(null);
                            }))));
                    }),
                    finalize(() => { this.deleting = false; })
                )
                .subscribe({
                    next: () => {
                        this.toastRef.show('VideoFile deleted successfully.');
                        this.dialogRef.close({action: 'deleted', videoFileId} as VideoFileDetailPanelResult);
                    },
                    error: error => {
                        this.toastRef.show(`Unable to delete VideoFile: ${error.message || error}`);
                    }
                })
        );
    }

    close(): void {
        this.dialogRef.close({
            action: this.videoFileForm?.dirty ? 'dismissed' : 'saved',
            videoFileId: this.videoFile?.id
        } as VideoFileDetailPanelResult);
    }

    addRule(): void {
        if (!this.isPersisted || this.videoProcessRule || this.ruleInvariantError) {
            return;
        }
        const ruleDialogRef = this.dialog.open(VideoProcessRuleEditorComponent, {
            stickyDialog: false,
            backdrop: true
        });
        ruleDialogRef.componentInstance.bangumiId = this.episode.bangumi.id;
        ruleDialogRef.componentInstance.videoId = this.videoFile!.id;
        ruleDialogRef.componentInstance.saveOnClose = true;
        this.subscription.add(
            ruleDialogRef.afterClosed().subscribe((rule?: VideoProcessRule) => {
                if (rule) {
                    this.videoProcessRule = rule;
                    this.videoFileRules = [rule];
                    this.bangumiRules.push(rule);
                }
            })
        );
    }

    onRuleDeleted(): void {
        if (this.videoProcessRule) {
            this.bangumiRules = this.bangumiRules.filter(rule => rule.id !== this.videoProcessRule?.id);
        }
        this.videoFileRules = [];
        this.videoProcessRule = undefined;
    }

    reprocessVideoFile(): void {
        if (!this.isPersisted
            || !this.hasApplicableRule
            || this.videoFile?.status !== VideoFileAdminEntity.STATUS_DOWNLOADED
            || this.handlingConvert) {
            return;
        }

        this.handlingConvert = true;
        this.subscription.add(
            this.videoProcessRuleService.createJobFromVideoFile(this.videoFile!.id)
                .pipe(finalize(() => { this.handlingConvert = false; }))
                .subscribe({
                    next: () => this.toastRef.show('Video processing started successfully.'),
                    error: error => this.toastRef.show(`Unable to start processing: ${error.message || error}`)
                })
        );
    }

    openDownloadJobDetail(): void {
        if (!this.downloadJob) {
            return;
        }
        const detailRef = this.dialog.open(DownloadJobDetailComponent, {
            stickyDialog: false,
            backdrop: false
        });
        detailRef.componentInstance.job = this.downloadJob;
        const navigationSubscription = detailRef.componentInstance.navigationRequested
            .subscribe(commands => {
                detailRef.close(null);
                this.dialogRef.close({action: 'dismissed', videoFileId: this.videoFile?.id} as VideoFileDetailPanelResult);
                this.router.navigate(commands);
            });
        this.subscription.add(navigationSubscription);
        this.subscription.add(detailRef.afterClosed().subscribe(() => navigationSubscription.unsubscribe()));
    }

    openVideoProcessJobDetail(): void {
        if (!this.videoProcessJob) {
            return;
        }
        const detailRef = this.dialog.open(VideoProcessJobDetailComponent, {
            stickyDialog: true,
            backdrop: false
        });
        detailRef.componentInstance.jobId = this.videoProcessJob.id;
        const navigationSubscription = detailRef.componentInstance.navigationRequested
            .subscribe(commands => {
                detailRef.close(null);
                this.dialogRef.close({action: 'dismissed', videoFileId: this.videoFile?.id} as VideoFileDetailPanelResult);
                this.router.navigate(commands);
            });
        this.subscription.add(navigationSubscription);
        this.subscription.add(detailRef.afterClosed().subscribe(() => navigationSubscription.unsubscribe()));
    }

    private get protectedControlNames(): string[] {
        return [
            'status',
            'resolutionW',
            'resolutionH',
            'duration',
            'torrentId',
            'filePath',
            'blobStorageUrlV0',
            'kfImagePathList'
        ];
    }

    private buildForm(videoFile?: VideoFileAdminEntity): void {
        this.systemFieldsUnlocked = false;
        this.videoFileForm = this.formBuilder.group({
            bangumiId: [videoFile?.bangumi.id ?? this.episode.bangumi.id, [Validators.required, Validators.pattern(UUID_PATTERN)]],
            episodeId: [videoFile?.episode.id ?? this.episode.id, [Validators.required, Validators.pattern(UUID_PATTERN)]],
            resourceGroupId: [videoFile?.resourceGroup.id ?? this.resourceGroup.id, [Validators.required, Validators.pattern(UUID_PATTERN)]],
            fileName: [videoFile?.fileName ?? ''],
            label: [videoFile?.label ?? ''],
            downloadUrl: [videoFile?.downloadUrl ?? ''],
            status: [videoFile?.status ?? VideoFileAdminEntity.STATUS_DOWNLOAD_PENDING, Validators.required],
            resolutionW: [videoFile?.resolutionW ?? null],
            resolutionH: [videoFile?.resolutionH ?? null],
            duration: [videoFile?.duration ?? null],
            torrentId: [videoFile?.torrentId ?? ''],
            filePath: [videoFile?.filePath ?? ''],
            blobStorageUrlV0: [videoFile?.blobStorageUrlV0 ?? ''],
            kfImagePathList: [(videoFile?.kfImagePathList ?? []).join('\n')]
        });
        this.setOwnershipEditing(false);
        this.setSystemFieldsUnlocked(false);
        this.videoFileForm.markAsPristine();
    }

    private buildPayload(): VideoFileAdminPayload {
        const value = this.videoFileForm!.getRawValue();
        return {
            id: this.videoFile?.id,
            bangumiId: value.bangumiId,
            episodeId: value.episodeId,
            resourceGroupId: value.resourceGroupId,
            fileName: value.fileName,
            label: value.label,
            downloadUrl: value.downloadUrl,
            status: value.status,
            resolutionW: value.resolutionW,
            resolutionH: value.resolutionH,
            duration: value.duration,
            torrentId: value.torrentId,
            filePath: value.filePath,
            blobStorageUrlV0: value.blobStorageUrlV0,
            kfImagePathList: this.parseKeyframeImagePaths(value.kfImagePathList)
        };
    }

    private parseKeyframeImagePaths(value: string): string[] {
        return (value || '')
            .split(/\r?\n/)
            .map(path => path.trim())
            .filter(path => path.length > 0);
    }

    private requireSingleVideoFile(videoFiles: VideoFileAdminEntity[], expectedId: string): VideoFileAdminEntity {
        if (expectedId) {
            const videoFile = videoFiles.find(file => file.id === expectedId);
            if (!videoFile) throw new Error('The saved VideoFile could not be found in the destination episode and resource group.');
            return videoFile;
        }
        if (videoFiles.length !== 1) {
            throw new Error(`Expected one saved VideoFile, but found ${videoFiles.length}.`);
        }
        return videoFiles[0];
    }

    private applyRuleState(): void {
        this.hasBangumiWideRule = this.bangumiRules.some(rule => !rule.videoFileId);
        this.videoFileRules = [];
        this.videoProcessRule = undefined;
        this.ruleInvariantError = undefined;
        if (!this.videoFile?.id) {
            return;
        }
        const matchingRules = this.bangumiRules.filter(rule => rule.videoFileId === this.videoFile!.id);
        this.videoFileRules = matchingRules;
        if (matchingRules.length > 1) {
            this.ruleInvariantError = `Expected one VideoProcess rule for this VideoFile, but found ${matchingRules.length}.`;
            return;
        }
        this.videoProcessRule = matchingRules[0];
    }

    private resolveLinkedJobs(): void {
        if (!this.videoFile?.id) {
            this.downloadJob = undefined;
            this.videoProcessJob = undefined;
            return;
        }

        if (this.downloadJob && !this.downloadJobMatches(this.downloadJob, this.videoFile.id)) {
            this.downloadJob = undefined;
        }
        if (this.videoProcessJob?.jobMessage?.videoId !== this.videoFile.id) {
            this.videoProcessJob = undefined;
        }

        this.subscription.add(
            forkJoin({
                downloadJob: this.downloadJob
                    ? of(this.downloadJob)
                    : this.downloadManagerService.list_jobs('all', this.episode.bangumi.id)
                        .pipe(map(jobs => jobs.find(job => this.downloadJobMatches(job, this.videoFile!.id)))),
                videoProcessJob: this.videoProcessJob
                    ? of(this.videoProcessJob)
                    : this.videoProcessManagerService.listJobs('all', this.episode.bangumi.id)
                        .pipe(
                            map(jobs => jobs.find(job => job.jobMessage?.videoId === this.videoFile!.id)),
                            catchError(error => {
                                this.toastRef.show(error.message || error);
                                return of(undefined);
                            })
                        )
            }).subscribe(({downloadJob, videoProcessJob}) => {
                this.downloadJob = downloadJob;
                this.videoProcessJob = videoProcessJob;
                this.startLinkedJobPolling();
            })
        );
    }

    private startLinkedJobPolling(): void {
        this.jobPollingSubscription.unsubscribe();
        this.jobPollingSubscription = new Subscription();

        if (this.downloadJob && this.isDownloadJobActive(this.downloadJob)) {
            this.jobPollingSubscription.add(
                timer(LINKED_JOB_REFRESH_INTERVAL, LINKED_JOB_REFRESH_INTERVAL)
                    .pipe(
                        takeWhile(() => !!this.downloadJob && this.isDownloadJobActive(this.downloadJob)),
                        switchMap(() => this.downloadManagerService.getJob(this.downloadJob!.id))
                    )
                    .subscribe({
                        next: job => { this.downloadJob = job; },
                        error: error => this.toastRef.show(error.message || error)
                    })
            );
        }

        if (this.videoProcessJob && this.isVideoProcessJobActive(this.videoProcessJob)) {
            this.jobPollingSubscription.add(
                timer(LINKED_JOB_REFRESH_INTERVAL, LINKED_JOB_REFRESH_INTERVAL)
                    .pipe(
                        takeWhile(() => !!this.videoProcessJob && this.isVideoProcessJobActive(this.videoProcessJob)),
                        switchMap(() => this.videoProcessManagerService.getJob(this.videoProcessJob!.id))
                    )
                    .subscribe({
                        next: job => { this.videoProcessJob = job; },
                        error: error => this.toastRef.show(error.message || error)
                    })
            );
        }
    }

    private downloadJobMatches(job: DownloadJob, videoFileId: string): boolean {
        return job.videoId === videoFileId
            || !!job.fileMapping?.some(mapping => mapping.videoId === videoFileId);
    }

    private isDownloadJobActive(job: DownloadJob): boolean {
        return job.status === DownloadJobStatus.Pending
            || job.status === DownloadJobStatus.Downloading
            || job.status === DownloadJobStatus.Paused;
    }

    private isVideoProcessJobActive(job: VideoProcessJob): boolean {
        return job.status === VideoProcessJobStatus.Queueing
            || job.status === VideoProcessJobStatus.Running
            || job.status === VideoProcessJobStatus.MetaData
            || job.status === VideoProcessJobStatus.Pause;
    }
}
