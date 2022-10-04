import { Component, EventEmitter, Input, OnDestroy, OnInit, Optional, Output } from '@angular/core';
import { VideoProcessRule } from '../../../../entity/VideoProcessRule';
import { VideoProcessRuleService } from '../video-process-rule.service';
import { Subscription } from 'rxjs';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { VideoProcessRuleEditorComponent } from '../video-process-rule-editor/video-process-rule-editor.component';
import { filter } from 'rxjs/operators';
import { ProfileType } from '../../../../entity/ProfileType';

@Component({
    selector: 'video-process-rule-item',
    templateUrl: './video-process-rule-item.html',
    styleUrls: ['./video-process-rule-item.less']
})
export class VideoProcessRuleItemComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    @Input()
    rule: VideoProcessRule;

    @Optional()
    @Input()
    videoFileId?: string;

    eProfileType = ProfileType;

    @Output('delete')
    onDelete = new EventEmitter<any>();

    constructor(private _videoProcessRuleService: VideoProcessRuleService,
                private _dialogService: UIDialog,
                toastService: UIToast) {
        this._toastRef = toastService.makeText();
    }

    editRule() {
        const dialogRef = this._dialogService.open<VideoProcessRuleEditorComponent>(VideoProcessRuleEditorComponent, { backdrop: true, stickyDialog: false});
        dialogRef.componentInstance.rule = this.rule;
        dialogRef.afterClosed()
            .pipe(
                filter(result => !!result)
            )
            .subscribe((rule) => {
                this.rule = rule;
            })
    }

    deleteRule() {
        this._subscription.add(
            this._videoProcessRuleService
                .deleteRule(this.rule.id)
                .subscribe(() => {
                    this.onDelete.emit();
                    this._toastRef.show('Delete Successful');
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
    }
}
