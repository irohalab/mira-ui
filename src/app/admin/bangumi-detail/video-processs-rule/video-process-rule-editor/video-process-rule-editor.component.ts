import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
    AbstractControl,
    AsyncValidatorFn,
    FormBuilder,
    FormControl,
    FormGroup,
    ValidationErrors
} from '@angular/forms';
import { VideoProcessRuleService } from '../video-process-rule.service';
import { ActionType } from '../../../../entity/action-type';
import { ProfileType } from '../../../../entity/ProfileType';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Observable, Subscription } from 'rxjs';
import { VideoProcessRule } from '../../../../entity/VideoProcessRule';
import { map } from 'rxjs/operators';
import { ActionMap } from '../../../../entity/action-map';
import { ActionEditorComponent } from '../action-editor/action-editor.component';

@Component({
    selector: 'video-process-rule-editor',
    templateUrl: './video-process-rule-editor.html',
    styleUrls: ['./video-process-rule-editor.less'],
    standalone: false
})
export class VideoProcessRuleEditorComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    @Input()
    bangumiId: string;

    @Input()
    videoId: string = null;

    @Input()
    rule: VideoProcessRule;

    @Input()
    saveOnClose: boolean = false;

    basicInfoForm: FormGroup;

    actions: ActionMap;

    eActionType = ActionType;

    eProfileType = ProfileType;
    fontList: string[];

    @ViewChild(ActionEditorComponent) _actionEditor!: ActionEditorComponent;

    constructor(private _fb: FormBuilder,
                private _videoProcessRuleService: VideoProcessRuleService,
                private _dialogRef: UIDialogRef<VideoProcessRuleEditorComponent>,
                toastService: UIToast) {
        this._toastRef = toastService.makeText();
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._videoProcessRuleService.listFonts()
                .subscribe(fonts => this.fontList = fonts)
        );
        if (this.rule) {
            this.basicInfoForm = this._fb.group({
                name: [this.rule.name],
                condition: new FormControl(this.rule.condition, {asyncValidators: this.ruleConditionValidator()})
            }, {updateOn: 'blur'});
            this.actions = this.rule.actions;
            this.bangumiId = this.rule.bangumiId;
            this.videoId = this.rule.videoFileId;
        } else {
            this.basicInfoForm = this._fb.group({
                name: [''],
                condition: new FormControl('', {asyncValidators: this.ruleConditionValidator()})
            }, {updateOn: 'blur'});
        }
    }

    save(): void {
        let condition: string|null = this.videoId ? null : this.basicInfoForm.value.condition;
        const name = this.basicInfoForm.value.name;
        const actions = this._actionEditor.actions;
        if (this.rule) {
            this.rule.name = name;
            this.rule.condition = condition;
            this.rule.actions = actions;
            if (this.saveOnClose) {
                this._subscription.add(
                    this._videoProcessRuleService
                        .editRule(this.rule)
                        .subscribe((rule) => {
                            this._toastRef.show('Update Successful');
                            this._dialogRef.close(rule);
                        })
                );
            } else {
                this._dialogRef.close(this.rule);
            }
        } else {
            const rule = {
                name: name,
                bangumiId: this.bangumiId,
                videoFileId: this.videoId,
                condition: condition,
                actions: actions,
                priority: 0
            } as VideoProcessRule;
            if (this.saveOnClose) {
                this._subscription.add(
                    this._videoProcessRuleService.addRule(rule)
                        .subscribe((rule) => {
                            this._toastRef.show('Add Successful');
                            this._dialogRef.close(rule);
                        })
                );
            } else {
                this._dialogRef.close(rule);
            }
        }
    }

    cancel(): void {
        this._dialogRef.close();
    }

    ruleConditionValidator(): AsyncValidatorFn {
        return (control: AbstractControl) : Observable<ValidationErrors | null> => {
            const condition = control.value;
            return this._videoProcessRuleService.checkCondition(condition)
                .pipe(
                    map<any, ValidationErrors | null>(result => {
                        if (result.status === 0) {
                            return null;
                        } else {
                            return {
                                condition: result.data
                            }
                        }
                    })
                );
        }
    }
}
