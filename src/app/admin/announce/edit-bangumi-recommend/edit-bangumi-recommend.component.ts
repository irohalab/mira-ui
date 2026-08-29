import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialogRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Announce } from '../../../entity/announce';
import dayjs from 'dayjs';
import { NgClass } from '@angular/common';
import { NgxsmkDatepickerComponent } from 'ngxsmk-datepicker';
import { ErrorMessageDict, ValidateMessageDict } from '../types';

export const MAX_DATE_RANGE = 7; // days

export function rangeLimitWithMaxRange(group: AbstractControl): ValidationErrors | null {
    const startTime = group.get('startTime')?.value;
    const endTime = group.get('endTime')?.value;
    if (startTime == null || endTime == null) {
        return null;
    }

    const startTimeValue = dayjs(startTime).valueOf();
    const endTimeValue = dayjs(endTime).valueOf();
    if (!Number.isFinite(startTimeValue) || !Number.isFinite(endTimeValue) || endTimeValue <= startTimeValue) {
        return {dateRange: 'invalid range'};
    }
    return endTimeValue - startTimeValue <= MAX_DATE_RANGE * 24 * 3600 * 1000
        ? null
        : {dateRange: 'exceed max range'};
}

@Component({
    selector: 'edit-bangumi-recommend',
    templateUrl: './edit-bangumi-recommend.html',
    styleUrls: ['./edit-bangumi-recommend.less'],
    imports: [FormsModule, ReactiveFormsModule, NgClass, NgxsmkDatepickerComponent]
})
export class EditBangumiRecommendComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @Input()
    announce: Announce;

    @Input()
    bangumi: { id: string, name: string };

    recommendForm: FormGroup;

    validationMessages: ValidateMessageDict = {
        sortOrder: {
            'required': 'sort order不能为空'
        },
        startTime: {
            'required': '开始时间不能为空',
        },
        endTime: {
            'required': '开始时间不能为空'
        },
        dateRange: {
            'invalid range': '结束时间不得早于开始时间',
            'exceed max range': `最长持续时间不得大于${MAX_DATE_RANGE}天`
        }
    };

    recommendFormErrors: ErrorMessageDict = {
        sortOrder: [],
        imageUrl: [],
        startTime: [],
        endTime: []
    };

    constructor(private _fb: FormBuilder,
                private _darkThemeService: DarkThemeService,
                private _dialogRef: UIDialogRef<EditBangumiRecommendComponent>) {

    }

    cancel() {
        this._dialogRef.close();
    }

    save() {
        if (this.recommendForm.invalid) {
            return;
        }
        let result = this.recommendForm.value;
        result.content = this.bangumi.id;
        result.position = Announce.POSITION_BANGUMI;
        result.startTime = dayjs(result.startTime).valueOf();
        result.endTime = dayjs(result.endTime).valueOf();
        this._dialogRef.close(result);
    }

    onFormChanged(errors: any, errorMessages: any, form: FormGroup) {
        for (const field in errors) {
            // clear previous error message array
            errors[field] = [];
            const control = form.get(field);
            if (control && control.dirty && control.invalid) {
                for (const key in control.errors) {
                    let messages = errorMessages[field];
                    errors[field].push(messages[key]);
                }
            }
        }
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        const startTime = dayjs();
        this.recommendForm = this._fb.group({
            sortOrder: [0, Validators.required],
            startTime: [startTime, Validators.required],
            endTime: [startTime.add(MAX_DATE_RANGE, 'day'), Validators.required]
        }, {validators: rangeLimitWithMaxRange});
        if (this.announce) {
            this.bangumi = this.announce.bangumi;
            this.recommendForm.get('sortOrder').patchValue(this.announce.sortOrder);
            this.recommendForm.get('startTime').patchValue(dayjs(this.announce.startTime));
            this.recommendForm.get('endTime').patchValue(dayjs(this.announce.endTime));
        }

        this.onFormChanged(this.recommendFormErrors, this.validationMessages, this.recommendForm);

        this._subscription.add(
            this.recommendForm.valueChanges
                .subscribe(() => {
                    this.onFormChanged(this.recommendFormErrors, this.validationMessages, this.recommendForm);
                })
        );
    }

    ngOnDestroy(): void {
    }
}
