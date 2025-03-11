import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { VideoProcessRule } from '../../../entity/VideoProcessRule';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { VideoProcessRuleEditorComponent } from './video-process-rule-editor/video-process-rule-editor.component';
import { filter, mergeMap, switchMap } from 'rxjs/operators';
import { VideoProcessRuleService } from './video-process-rule.service';
import { from, Subscription } from 'rxjs';
import { AdminService } from '../../admin.service';
import { Bangumi } from '../../../entity';
import { VideoFile } from '../../../entity/video-file';

@Component({
    selector: 'video-process-rule',
    templateUrl: './video-process-rule.html',
    styleUrls: ['./video-process-rule.less'],
    standalone: false
})
export class VideoProcessRuleComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    @Input()
    bangumiId: string;

    videoProcessRuleList: VideoProcessRule[];

    isWorkingOnReprocess = false;

    constructor(private _uiDialog: UIDialog,
                private _videoProcessRuleService: VideoProcessRuleService,
                private _adminService: AdminService,
                toastService: UIToast) {
        this._toastRef = toastService.makeText();
    }

    onAddRule(): void {
        const editRuleDialogRef = this._uiDialog.open(VideoProcessRuleEditorComponent, {
            stickyDialog: true, backdrop: true
        });
        editRuleDialogRef.componentInstance.bangumiId = this.bangumiId;
        editRuleDialogRef.componentInstance.saveOnClose = true;
        editRuleDialogRef.afterClosed()
            .pipe(filter(result => !!result))
            .subscribe(() => {
                this.refreshList();
            });
    }

    refreshList(): void {
        this._subscription.add(
            this._videoProcessRuleService
                .listRulesByBangumi(this.bangumiId)
                .subscribe((list) => {
                    this.videoProcessRuleList = list.filter(rule => !rule.videoFileId);
                })
        );
    }

    reprocessAll(): void {
        this.isWorkingOnReprocess = true;
        this._subscription.add(
            this._videoProcessRuleService
                .listRulesByBangumi(this.bangumiId)
                .pipe(
                    switchMap((rules) => {
                        if (rules.length === 0) {
                            // no rules found, cancel
                            throw new Error('No Rules for current bangumi');
                        }
                        return this._adminService.getBangumi(this.bangumiId)
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
                        this._toastRef.show('Create convert jobs successfully');
                    },
                    error: (error: any) => {
                        this.isWorkingOnReprocess = false;
                        this._toastRef.show('Something went wrong when trying to create convert jobs: ' + error?.message);
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.refreshList();
    }
}
