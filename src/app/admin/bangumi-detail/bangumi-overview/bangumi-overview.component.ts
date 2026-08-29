import { Component, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UIToast, UIToastComponent, UIToastRef, UIResponsiveImageWrapper, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { finalize, switchMap } from 'rxjs/operators';
import { BaseError } from '../../../../helpers/error';
import { Subscription } from 'rxjs';
import { Account } from '../../../entity/Account';
import { AdminService } from '../../admin.service';
import { DatePipe, NgClass } from '@angular/common';
import { BangumiTypeNamePipe } from '../../bangumi-pipes/type-name-pipe';
import { BangumiAdminEntity } from '../../../entity/admin/BangumiAdminEntity';
import { ConfirmDialogDirective } from '../../../confirm-dialog/confirm-dialog.directive';
import { NgxsmkDatepickerComponent } from 'ngxsmk-datepicker';

type LockableBangumiField =
    'name'
    | 'nameCn'
    | 'summary'
    | 'airDate';

@Component({
    selector: 'app-bangumi-overview',
    templateUrl: './bangumi-overview.component.html',
    styleUrl: './bangumi-overview.component.less',
    imports: [ReactiveFormsModule, UIResponsiveImageWrapper, DatePipe, BangumiTypeNamePipe, NgClass, ConfirmDialogDirective, NgxsmkDatepickerComponent]
})
export class BangumiOverviewComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private _bangumi!: BangumiAdminEntity;
    private readonly lockableFields: LockableBangumiField[] = [
        'name',
        'nameCn',
        'summary',
        'airDate'
    ];
    private readonly weekdayNames = [
        '星期日',
        '星期一',
        '星期二',
        '星期三',
        '星期四',
        '星期五',
        '星期六'
    ];

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @Input()
    set bangumi(bangumi: BangumiAdminEntity) {
        this._bangumi = bangumi;
        this.buildForm();
    }

    get bangumi(): BangumiAdminEntity {
        return this._bangumi;
    }

    @Input()
    adminList: Account[] = [];

    @Output()
    bangumiChange = new EventEmitter<BangumiAdminEntity>();

    bangumiForm: FormGroup;
    isSaving = false;
    isSyncing = false;

    get isBusy(): boolean {
        return this.isSaving || this.isSyncing;
    }

    get airWeekdayLabel(): string {
        const value = this.bangumiForm?.get('airDate')?.value;
        if (!value) {
            return '未知';
        }
        const airDate = value instanceof Date ? value : new Date(value);
        return Number.isNaN(airDate.valueOf()) ? '未知' : this.weekdayNames[airDate.getDay()];
    }

    constructor(private adminService: AdminService,
                private formBuilder: FormBuilder,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,) {
        this.toastRef = toastService.makeText();
    }

    ngOnInit() {
        this.subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    isFieldLocked(fieldName: LockableBangumiField): boolean {
        return this.bangumiForm?.get(`lockedFields.${fieldName}`)?.value === true;
    }

    toggleFieldLock(fieldName: LockableBangumiField): void {
        if (this.isBusy) {
            return;
        }
        const control = this.bangumiForm.get(`lockedFields.${fieldName}`);
        control?.setValue(!control.value);
        control?.markAsDirty();
    }

    lockButtonTitle(fieldName: LockableBangumiField): string {
        return this.isFieldLocked(fieldName)
            ? '已锁定；上游同步不会覆盖此字段。点击解锁。'
            : '未锁定；上游同步可以覆盖此字段。点击锁定。';
    }

    reset(): void {
        if (!this.isBusy) {
            this.buildForm();
        }
    }

    save(): void {
        if (this.isBusy || this.bangumiForm.invalid || !this.bangumiForm.dirty) {
            return;
        }

        const formValue = this.bangumiForm.getRawValue();
        const updatedBangumi: BangumiAdminEntity = {
            ...this.bangumi,
            name: formValue.name.trim(),
            nameCn: formValue.nameCn.trim(),
            summary: formValue.summary.trim(),
            airDate: (formValue.airDate as Date).toISOString(),
            epsNoOffset: formValue.epsNoOffset,
            status: formValue.status,
            maintainedByUid: formValue.maintainedByUid || undefined,
            alertTimeout: formValue.alertTimeout,
            lockedFields: this.buildLockedFields()
        };

        this.isSaving = true;
        this.subscription.add(
            this.adminService.updateBangumi(updatedBangumi)
                .pipe(
                    switchMap(() => this.adminService.getBangumi(this.bangumi.id)),
                    finalize(() => { this.isSaving = false; })
                )
                .subscribe({
                    next: bangumi => {
                        this.replaceBangumi(bangumi);
                        this.toastRef.show('更新成功');
                    },
                    error: (error: BaseError) => {
                        this.toastRef.show(error?.message || '更新失败');
                    }
                })
        );
    }

    syncBangumi(): void {
        if (this.isBusy || this.bangumiForm.dirty || !this.bangumi.itemId) {
            return;
        }

        this.isSyncing = true;
        this.subscription.add(
            this.adminService.syncBangumi(this.bangumi.id)
                .pipe(
                    switchMap(() => this.adminService.getBangumi(this.bangumi.id)),
                    finalize(() => { this.isSyncing = false; })
                )
                .subscribe({
                    next: bangumi => {
                        this.replaceBangumi(bangumi);
                        this.toastRef.show('已从上游同步');
                    },
                    error: (error: BaseError) => {
                        this.toastRef.show(error?.message || '同步失败');
                    }
                })
        );
    }

    private buildForm(): void {
        const lockedFields = this.bangumi.lockedFields ?? {};
        const nonBlank = [Validators.required, Validators.pattern(/\S/)];
        this.bangumiForm = this.formBuilder.group({
            name: [this.bangumi.name ?? '', nonBlank],
            nameCn: [this.bangumi.nameCn ?? '', nonBlank],
            summary: [this.bangumi.summary ?? '', nonBlank],
            airDate: [this.parseAirDate(this.bangumi.airDate), Validators.required],
            epsNoOffset: [this.bangumi.epsNoOffset ?? null],
            status: [this.bangumi.status, Validators.required],
            maintainedByUid: [this.bangumi.maintainedByUid ?? ''],
            alertTimeout: [this.bangumi.alertTimeout ?? 2, Validators.required],
            lockedFields: this.formBuilder.group({
                name: lockedFields['name'] === true,
                nameCn: lockedFields['nameCn'] === true,
                summary: lockedFields['summary'] === true,
                airDate: lockedFields['airDate'] === true
            })
        });
    }

    private buildLockedFields(): Record<string, boolean> {
        const lockedFields = {...(this.bangumi.lockedFields ?? {})};
        for (const fieldName of this.lockableFields) {
            if (this.isFieldLocked(fieldName)) {
                lockedFields[fieldName] = true;
            } else {
                delete lockedFields[fieldName];
            }
        }
        return lockedFields;
    }

    private parseAirDate(value?: string): Date | null {
        if (!value) {
            return null;
        }
        const date = new Date(value);
        return Number.isNaN(date.valueOf()) ? null : date;
    }

    private replaceBangumi(bangumi: BangumiAdminEntity): void {
        this.bangumi = bangumi;
        this.bangumiChange.emit(bangumi);
    }
}
