import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DARK_THEME, DarkThemeService, UIDialog, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { forkJoin, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AdminService } from '../../admin.service';
import { EpisodeAdminEntity } from '../../../entity/admin/EpisodeAdminEntity';
import { VideoFileAdminEntity } from '../../../entity/admin/VideoFileAdminEntity';
import { ResourceGroup } from '../../../entity/ResourceGroup';
import { VideoFileDetailPanelComponent } from '../resource-group/video-file-detail-panel/video-file-detail-panel.component';

@Component({
    selector: 'video-file-modal',
    templateUrl: './video-file-modal.html',
    styleUrls: ['./video-file-list.less'],
    imports: [FormsModule, NgClass]
})
export class VideoFileModal implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    @Input()
    episode!: EpisodeAdminEntity;

    @Input()
    resourceGroup?: ResourceGroup;

    videoFiles: VideoFileAdminEntity[] = [];
    resourceGroups: ResourceGroup[] = [];
    selectedResourceGroupId = '';
    loading = false;
    loadError?: string;

    constructor(private dialogRef: UIDialogRef<VideoFileModal>,
                private adminService: AdminService,
                private dialog: UIDialog,
                private darkThemeService: DarkThemeService,
                toast: UIToast) {
        this.toastRef = toast.makeText();
    }

    ngOnInit(): void {
        this.subscription.add(this.darkThemeService.themeChange.subscribe(theme => {
            this.isDarkTheme = theme === DARK_THEME;
        }));
        this.selectedResourceGroupId = this.resourceGroup?.id ?? '';
        this.load();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    load(): void {
        this.loading = true;
        this.loadError = undefined;
        this.subscription.add(
            forkJoin({
                videoFiles: this.adminService.getEpisodeVideoFiles(this.episode.id, this.resourceGroup?.id),
                resourceGroups: this.adminService.listResourceGroups(this.episode.bangumi.id, false)
            }).pipe(finalize(() => { this.loading = false; }))
                .subscribe({
                    next: ({videoFiles, resourceGroups}) => {
                        this.videoFiles = videoFiles;
                        this.resourceGroups = resourceGroups;
                    },
                    error: error => {
                        this.loadError = error.message || String(error);
                        this.toastRef.show(this.loadError);
                    }
                })
        );
    }

    addVideoFile(): void {
        const resourceGroup = this.resourceGroups.find(group => group.id === this.selectedResourceGroupId);
        if (!resourceGroup) {
            this.toastRef.show('Select a resourceGroupId before adding a VideoFile.');
            return;
        }
        this.openEditor(resourceGroup, undefined, true);
    }

    editVideoFile(videoFile: VideoFileAdminEntity): void {
        const resourceGroup = this.resourceGroups.find(group => group.id === videoFile.resourceGroup.id);
        if (!resourceGroup) {
            this.toastRef.show('Unable to open VideoFile: its resource group was not found. Reload the list and try again.');
            return;
        }
        this.openEditor(resourceGroup, videoFile.id);
    }

    resourceGroupName(id: string): string {
        return this.resourceGroups.find(group => group.id === id)?.displayName || id;
    }

    close(): void {
        this.dialogRef.close(null);
    }

    private openEditor(resourceGroup: ResourceGroup, videoFileId?: string, createNew = false): void {
        const editorRef = this.dialog.open(VideoFileDetailPanelComponent, {stickyDialog: true, backdrop: true});
        editorRef.componentInstance.episode = this.episode;
        editorRef.componentInstance.resourceGroup = resourceGroup;
        editorRef.componentInstance.videoFileId = videoFileId;
        editorRef.componentInstance.createNew = createNew;
        this.subscription.add(editorRef.afterClosed().subscribe(() => this.load()));
    }
}
