import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialogRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Bangumi } from '../../../entity';
import { Announce } from '../../../entity/announce';
import dayjs from 'dayjs';
import { NgClass } from '@angular/common';
import { NgxsmkDatepickerComponent } from 'ngxsmk-datepicker';
import { ErrorMessageDict, ValidateMessageDict } from '../types';

export const MAX_DATE_RANGE = 7; // days

export function rangeLimitWithMaxRange(group: FormGroup) {
    let start_time = group.get('start_time').value;
    let end_time = group.get('end_time').value;
    let result = end_time > start_time ? null : {dateRange: 'invalid range'};
    result = !result ? (end_time - start_time <= MAX_DATE_RANGE * 24 * 3600 * 1000 ? null: {dateRange: 'exceed max range'}) : result;
    console.log(result);
    return result;
}

@Component({
    selector: 'edit-bangumi-recommend',
    templateUrl: './edit-bangumi-recommend.html',
    styleUrls: ['./edit-bangumi-recommend.less'],
    imports: [FormsModule, ReactiveFormsModule, NgClass, NgxsmkDatepickerComponent]
})
export class EditBangumiRecommendComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    announce: Announce;

    @Input()
    bangumi: Bangumi;

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
        this.recommendForm = this._fb.group({
            sortOrder: [0, Validators.required],
            startTime: [dayjs(), Validators.required],
            endTime: [dayjs().add(7, 'day'), Validators.required]
        },{validator: rangeLimitWithMaxRange});
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
