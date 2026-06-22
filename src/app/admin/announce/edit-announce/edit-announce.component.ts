import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialogRef } from '@irohalab/deneb-ui';
import { Announce } from '../../../entity/announce';
import { Subscription } from 'rxjs';
import dayjs from 'dayjs';
import { NgClass } from '@angular/common';
import { NgxsmkDatepickerComponent } from 'ngxsmk-datepicker';
import { ErrorMessageDict, ValidateMessageDict } from '../types';

export function rangeLimit(group: FormGroup) {
    let start_time = group.get('start_time').value;
    let end_time = group.get('end_time').value;
    return end_time > start_time ? null: {dateRange: {end_time: end_time, start_time: start_time}};
}

@Component({
    selector: 'admin-edit-announce',
    templateUrl: './edit-announce.html',
    styleUrls: ['./edit-announce.less'],
    imports: [FormsModule, ReactiveFormsModule, NgClass, NgxsmkDatepickerComponent]
})
export class EditAnnounceComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    announce: Announce;

    announceForm: FormGroup;

    position = 1;

    validationMessages: ValidateMessageDict = {
        sortOrder: {
            'required': 'sortOrder不能为空'
        },
        content: {
            'required': 'url不能为空'
        },
        imageUrl: {
            'required': 'imageUrl不能为空'
        },
        startTime: {
            'required': '开始时间不能为空',
        },
        endTime: {
            'required': '开始时间不能为空'
        }
    };


    announceFormErrors: ErrorMessageDict = {
        sortOrder: [],
        content: [],
        imageUrl: [],
        startTime: [],
        endTime: []
    };


    constructor(private _dialogRef: UIDialogRef<EditAnnounceComponent>,
                private _fb: FormBuilder) {
    }

    onPositionChange(position: number) {
        this.position = position;
    }

    cancel() {
        this._dialogRef.close();
    }

    save() {
        if (this.announceForm.invalid) {
            return;
        }
        let result = this.announceForm.value;
        result.position = this.position;
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
        if (this.announce) {
            this.announceForm = this._fb.group({
                sortOrder: [this.announce.sortOrder, Validators.required],
                content: [this.announce.content, Validators.required],
                imageUrl: [this.announce.imageUrl, Validators.required],
                startTime: [dayjs(this.announce.startTime), Validators.required],
                endTime: [dayjs(this.announce.endTime), Validators.required]
            }, {validator: rangeLimit});
            this.position = this.announce.position;
        } else {
            this.announceForm = this._fb.group({
                sortOrder: [0, Validators.required],
                content: ['', Validators.required],
                imageUrl: ['', Validators.required],
                startTime: [dayjs(), Validators.required],
                endTime: [dayjs().add(1, 'day'), Validators.required]
            }, {validator: rangeLimit})
        }

        this.onFormChanged(this.announceFormErrors, this.validationMessages, this.announceForm);

        this._subscription.add(
            this.announceForm.valueChanges
                .subscribe(() => {
                    this.onFormChanged(this.announceFormErrors, this.validationMessages, this.announceForm);
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
