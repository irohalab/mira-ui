import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import { UIDialog, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import {Subscription} from 'rxjs';
import {VideoFile} from '../../../entity/video-file';
import {Episode} from '../../../entity';
import {AdminService} from '../../admin.service';
import {BaseError} from '../../../../helpers/error';
import {FormBuilder, FormGroup} from '@angular/forms';
import { VideoProcessRule } from '../../../entity/VideoProcessRule';
import { VideoProcessRuleService } from '../video-processs-rule/video-process-rule.service';
import { filter, switchMap } from 'rxjs/operators';
import { VideoProcessRuleEditorComponent } from '../video-processs-rule/video-process-rule-editor/video-process-rule-editor.component';

@Component({
    selector: 'video-file-modal',
    templateUrl: './video-file-modal.html',
    styleUrls: ['./video-file-list.less']
})
export class VideoFileModal implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    private videoTempId = 0;

    @Input()
    episode: Episode;

    videoFileList: FormGroup[];
    ruleMap: {[videoId: string]: { isDirty: boolean, rule: VideoProcessRule }};

    constructor(private _dialogRef: UIDialogRef<VideoFileModal>,
                private _adminService: AdminService,
                private _fb: FormBuilder,
                private _uiDialog: UIDialog,
                private _videoProcessRuleService: VideoProcessRuleService,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }

    saveVideoFile(videoFileGroup: FormGroup) {
        let videoFile = videoFileGroup.value as VideoFile;
        let videoFileId = videoFile.id;
        if (!VideoFileModal.isTempVideoId(videoFileId)) {
            if (videoFileGroup.dirty) {
                this._subscription.add(
                    this._adminService.updateVideoFile(videoFile)
                        .subscribe(
                            () => {
                                this._toastRef.show('保存Video File成功');
                                videoFileGroup.markAsPristine();
                            },
                            (error: BaseError) => {
                                this._toastRef.show('保存失败, ' + error.message);
                            }
                        )
                );
            }
            if (this.ruleMap[videoFileId] && this.ruleMap[videoFileId].isDirty) {
                this.saveRule(this.ruleMap[videoFileId].rule);
            }
        } else {
            this._subscription.add(
                this._adminService.addVideoFile(videoFile)
                    .subscribe(
                        (id) => {
                            videoFileGroup.patchValue({id: id});
                            this._toastRef.show('保存成功');
                            videoFileGroup.markAsPristine();
                            if (this.ruleMap[videoFileId] && this.ruleMap[videoFileId].isDirty) {
                                this.ruleMap[videoFileId].rule.videoFileId = id;
                                this.ruleMap[id] = { isDirty: true, rule: this.ruleMap[videoFileId].rule };
                                this.ruleMap[videoFileId] = undefined;
                                this.saveRule(this.ruleMap[id].rule);
                            }
                        },
                        (error: BaseError) => {
                            this._toastRef.show('保存失败, ' + error.message);
                        }
                    )
            )
        }
    }

    deleteVideoFile(videoFileGroup: FormGroup) {
        let videoFile = videoFileGroup.value as VideoFile;
        if (VideoFileModal.isTempVideoId(videoFile.id)) {
            if (this.ruleMap[videoFile.id]) {
                this.deleteRule(videoFile.id);
            }
            this.videoFileList.splice(this.videoFileList.indexOf(videoFileGroup), 1);
            return;
        }
        this._subscription.add(
            this._adminService.deleteVideoFile(videoFile.id)
                .subscribe(
                    () => {
                        this._toastRef.show('删除成功');
                        this.videoFileList.splice(this.videoFileList.indexOf(videoFileGroup), 1);
                        if (this.ruleMap[videoFile.id]) {
                            this.deleteRule(videoFile.id);
                        }
                    },
                    (error: BaseError) => {
                        this._toastRef.show('删除失败, ' + error.message);
                    }
                )
        );
    }

    addVideoFile() {
        let videoFileFormGroup = this._fb.group({
            id: `VIDEO_ID_${this.videoTempId}`,
            bangumi_id: this.episode.bangumi_id,
            episode_id: this.episode.id,
            download_url: '',
            torrent_id: null,
            status: VideoFile.STATUS_DOWNLOAD_PENDING,
            file_path: null,
            file_name: null,
            resolution_w: null,
            resolution_h: null,
            duration: null,
            label: null
        });
        this.videoFileList.unshift(videoFileFormGroup);
    }

    close() {
        this._dialogRef.close(null);
    }

    ngOnInit(): void {
        this._subscription.add(
            this._adminService.getEpisodeVideoFiles(this.episode.id)
                .pipe(switchMap(videoFileList => {
                    this.ruleMap = {};
                    this.videoFileList = [];
                    for (const videoFile of videoFileList) {
                        this.videoFileList.push(this._fb.group({
                            id: videoFile.id,
                            bangumi_id: videoFile.bangumi_id,
                            episode_id: videoFile.episode_id,
                            download_url: videoFile.download_url,
                            torrent_id: videoFile.torrent_id,
                            status: videoFile.status,
                            file_path: videoFile.file_path,
                            file_name: videoFile.file_name,
                            resolution_w: videoFile.resolution_w,
                            resolution_h: videoFile.resolution_h,
                            duration: videoFile.duration,
                            label: videoFile.label
                        }));
                    }

                    return this._videoProcessRuleService.listRulesByBangumi(this.episode.bangumi_id);
                }))
                .subscribe((ruleList: VideoProcessRule[]) => {
                    for(const rule of ruleList) {
                        this.ruleMap[rule.videoFileId] = {isDirty: false, rule};
                    }
                }, (error: BaseError) => {
                    this._toastRef.show(error.message);
                    this.close();
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    deleteRule(videoFileId: string): void {
        const rule = this.ruleMap[videoFileId].rule;
        if (!rule.id) {
            this.ruleMap[videoFileId] = undefined;
        } else {
            this._subscription.add(
                this._videoProcessRuleService.deleteRule(rule.id)
                    .subscribe(() => {
                        this._toastRef.show("Delete Rule Successfully!");
                    }, (error) => {
                        this._toastRef.show("Failed to delete rule " + error.message);
                    })
            );
        }
    }

    onAddRule(videoFileGroup: FormGroup): void {
        const videoFileId = videoFileGroup.value.id;
        const editRuleDialogRef = this._uiDialog.open(VideoProcessRuleEditorComponent, {
            stickyDialog: false, backdrop: true
        });
        editRuleDialogRef.componentInstance.bangumiId = this.episode.bangumi_id;
        editRuleDialogRef.componentInstance.videoId = videoFileId;
        editRuleDialogRef.componentInstance.saveOnClose = false;
        editRuleDialogRef.afterClosed()
            .pipe(filter(result => !!result))
            .subscribe((rule: VideoProcessRule) => {
                this.ruleMap[rule.videoFileId] = { isDirty: true, rule };
            });
    }

    private static isTempVideoId(videoId: string): boolean {
        return videoId && videoId.startsWith("VIDEO_ID_");
    }

    private saveRule(rule: VideoProcessRule): void {
        if (!rule.id) {
            this._subscription.add(
                this._videoProcessRuleService.addRule(rule)
                    .subscribe((ruleCreated: VideoProcessRule) => {
                        this.ruleMap[ruleCreated.videoFileId] = { isDirty: false, rule: ruleCreated };
                    })
            );
        } else {
            this._subscription.add(
                this._videoProcessRuleService.editRule(rule)
                    .subscribe((ruleUpdated: VideoProcessRule) => {
                        this.ruleMap[ruleUpdated.videoFileId] = { isDirty: false, rule: ruleUpdated };
                    })
            );
        }
    }
}
