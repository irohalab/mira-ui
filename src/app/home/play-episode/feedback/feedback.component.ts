import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DeviceDetectorService, DeviceInfo } from '../../../../helpers/browser-detect';
import { NgClass } from '@angular/common';
import { Home } from '../../home.component';

@Component({
    selector: 'feedback-dialog',
    templateUrl: './feedback.html',
    styleUrls: ['./feedback.less'],
    imports: [FormsModule, ReactiveFormsModule, NgClass]
})
export class FeedbackComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    deviceInfo: DeviceInfo;
    feedbackForm: FormGroup;

    issueList = ['有画面无声音', '有声音无画面', '无声音无画面', '其他'];

    pickedIndex = -1;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private dialogRef: UIDialogRef<FeedbackComponent>,
                private darkThemeService: DarkThemeService,
                private deviceDetectorService: DeviceDetectorService,
                private formBuilder: FormBuilder) {
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    pickIssue(index: number) {
        this.pickedIndex = index;
    }

    submit() {
        if (this.pickedIndex === -1) {
            return;
        }
        let desc = this.feedbackForm.value.desc;
        if (!desc) {
            desc = '无';
        }
        this.dialogRef.close({
            issue: `问题：${this.issueList[this.pickedIndex]}, 附加描述： ${desc}`,
            ...this.deviceInfo,
        });
    }

    cancel() {
        this.dialogRef.close(null);
    }

    ngOnInit(): void {
        this.deviceInfo = this.deviceDetectorService.getDeviceInfoForFeedback();
        this._subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME;})
        );
        this.feedbackForm = this.formBuilder.group({
            desc: ['']
        });
    }
}
