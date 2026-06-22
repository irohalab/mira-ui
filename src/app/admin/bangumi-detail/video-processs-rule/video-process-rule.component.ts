import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { VideoProcessRule } from '../../../entity/VideoProcessRule';
import { UIDialog, UIToast, UIToastComponent, UIToastRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { VideoProcessRuleEditorComponent } from './video-process-rule-editor/video-process-rule-editor.component';
import { filter, mergeMap, switchMap } from 'rxjs/operators';
import { VideoProcessRuleService } from './video-process-rule.service';
import { from, Subscription } from 'rxjs';
import { AdminService } from '../../admin.service';
import { Bangumi } from '../../../entity';
import { VideoFile } from '../../../entity/video-file';
import { VideoProcessRuleItemComponent } from './video-process-rule-item/video-process-rule-item.component';
import { ConfirmDialogDirective } from '../../../confirm-dialog/confirm-dialog.directive';

@Component({
    selector: 'video-process-rule',
    templateUrl: './video-process-rule.html',
    styleUrls: ['./video-process-rule.less'],
    imports: [VideoProcessRuleItemComponent, ConfirmDialogDirective]
})
export class VideoProcessRuleComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @Input()
    bangumi: Bangumi;

    videoProcessRuleList: VideoProcessRule[];

    isWorkingOnReprocess = false;

    constructor(private _uiDialog: UIDialog,
                private _videoProcessRuleService: VideoProcessRuleService,
                private _adminService: AdminService,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    onAddRule(): void {
        const editRuleDialogRef = this._uiDialog.open(VideoProcessRuleEditorComponent, {
            stickyDialog: true, backdrop: true
        });
        editRuleDialogRef.componentInstance.bangumiId = this.bangumi.id;
        editRuleDialogRef.componentInstance.saveOnClose = true;
        editRuleDialogRef.afterClosed()
            .pipe(filter(result => !!result))
            .subscribe(() => {
                this.refreshList();
            });
    }

    refreshList(): void {
        this.subscription.add(
            this._videoProcessRuleService
                .listRulesByBangumi(this.bangumi.id)
                .subscribe({
                    next: (list) => {
                        this.videoProcessRuleList = list.filter(rule => !rule.videoFileId);
                    },
                    error: (err) => {
                        this.toastRef.show(err.message);
                    }
                })
        );
    }

    reprocessAll(): void {
        this.isWorkingOnReprocess = true;
        this.subscription.add(
            this._videoProcessRuleService
                .listRulesByBangumi(this.bangumi.id)
                .pipe(
                    switchMap((rules) => {
                        if (rules.length === 0) {
                            // no rules found, cancel
                            throw new Error('No Rules for current bangumi');
                        }
                        return this._adminService.getBangumi(this.bangumi.id)
                    }),
                    mergeMap((bangumi: Bangumi) => {
                        return from(bangumi.episodes.map(eps => eps.id));
                    }),
                    mergeMap((episodeId: string) => {
                        return this._adminService.getEpisodeVideoFiles(episodeId);
                    }),
                    mergeMap((videoFileList: VideoFile[]) => {
                        return from(videoFileList);
                    }),
                    filter((videoFile: VideoFile) => {
                        return videoFile.status === VideoFile.STATUS_DOWNLOADED;
                    }),
                    mergeMap((videoFile: VideoFile) => {
                        return this._videoProcessRuleService.createJobFromVideoFile(videoFile);
                    })
                )
                .subscribe({
                    next: () => {
                        this.isWorkingOnReprocess = false;
                        this.toastRef.show('Create convert jobs successfully');
                    },
                    error: (error: any) => {
                        this.isWorkingOnReprocess = false;
                        this.toastRef.show('Something went wrong when trying to create convert jobs: ' + error?.message);
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this.refreshList();
    }
}
