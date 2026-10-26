import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../admin.service';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { BaseError } from '../../../../helpers/error';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NgClass } from '@angular/common';
import { EpisodeAdminEntity, EpisodeAdminPayload, EpisodeUpstreamFieldsResult } from '../../../entity/admin/EpisodeAdminEntity';
import { EpisodeType } from '../../../entity/admin/EpisodeType';
import { isItemProperties } from '../../../entity/ItemProperties';
import { User } from '../../../entity/user';
import { UserService } from '../../../user-service/user.service';
import { calendarDateValidator, itemPropertiesValidator, UUID_PATTERN } from '../../../../helpers/admin-form-validators';
import { extractErrorMessage } from '../../../../helpers/http-error-helper';

@Component({
    selector: 'episode-detail',
    templateUrl: './episode-detail.html',
    styleUrls: ['./episode-detail.less'],
    imports: [FormsModule, ReactiveFormsModule, NgClass]
})
export class EpisodeDetail implements OnInit, OnDestroy {

    private _toastRef: UIToastRef<UIToastComponent>;
    private _subscription = new Subscription();

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    episodeStatus = [
        {text: '未下载', labelColor: 'red'},
        {text: '下载中', labelColor: 'blue'},
        {text: '已下载', labelColor: 'teal'}
    ];

    @Input()
    episode: EpisodeAdminEntity;

    readonly episodeForm = this._fb.group({
        bangumiId: ['', [Validators.required, Validators.pattern(UUID_PATTERN)]],
        subItemId: ['', Validators.pattern(UUID_PATTERN)],
        type: this._fb.control<EpisodeType | null>(null),
        bgmEpsId: [0, [Validators.required, Validators.min(-2147483648), Validators.max(2147483647), Validators.pattern(/^-?\d+$/)]],
        episodeNo: [0, [Validators.required, Validators.min(-2147483648), Validators.max(2147483647), Validators.pattern(/^-?\d+$/)]],
        sort: [0, [Validators.required, Validators.min(-3.4028234663852886e38), Validators.max(3.4028234663852886e38)]],
        name: this._fb.control<string | null>(null),
        nameCn: this._fb.control<string | null>(null),
        properties: ['{}', [Validators.required, itemPropertiesValidator]],
        duration: this._fb.control<string | null>(null),
        airdate: this._fb.control<string | null>(null, calendarDateValidator),
        status: [0, [Validators.required, Validators.min(0), Validators.max(2), Validators.pattern(/^\d$/)]]
    });

    busy = false;
    isSuperAdmin = false;
    upstreamWarnings: EpisodeUpstreamFieldsResult['warnings'] = [];

    constructor(private _adminService: AdminService,
                private _dialogRef: UIDialogRef<EpisodeDetail>,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                private _fb: FormBuilder,
                private userService: UserService) {
        this._toastRef = toastService.makeText();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this._subscription.add(this.userService.userInfo.subscribe(user => {
            this.isSuperAdmin = user?.role === User.SUPER_ADMIN_ROLE;
        }));
        if (this.episode) {
            this.episodeForm.patchValue({
                ...this.episode,
                bangumiId: this.episode.bangumi.id,
                subItemId: this.episode.subItemId ?? '',
                type: this.episode.type ?? null,
                properties: JSON.stringify(this.episode.properties, null, 2),
                airdate: this.episode.airdate ?? null
            });
        }
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    cancel(): void {
        this._dialogRef.close(false);
    }

    saveEpisode(): void {
        if (this.busy) return;
        if (this.episodeForm.controls.status.invalid || this.isSuperAdmin && this.episodeForm.invalid) {
            this.episodeForm.markAllAsTouched();
            this._toastRef.show('Please correct the invalid episode fields.');
            return;
        }
        const value = this.episodeForm.getRawValue();
        let request;
        if (this.isSuperAdmin) {
            const properties: unknown = JSON.parse(value.properties);
            if (!isItemProperties(properties)) {
                this._toastRef.show('properties must be an ItemProperties JSON object.');
                return;
            }
            const payload: EpisodeAdminPayload = {
                ...value,
                subItemId: value.subItemId || null,
                properties,
                name: value.name ?? null,
                nameCn: value.nameCn ?? null,
                duration: value.duration ?? null,
                airdate: value.airdate || null
            };
            request = this._adminService.updateEpisodeFields(this.episode.id, payload);
        } else {
            request = this._adminService.updateEpisodeStatus(this.episode.id, value.status);
        }
        this.busy = true;
        this._subscription.add(request.pipe(finalize(() => { this.busy = false; }))
            .subscribe({
                next: () => {
                    this._toastRef.show('更新成功');
                    this._dialogRef.close(true);
                },
                error: (error: BaseError | HttpErrorResponse) => this.showError(error)
            })
        );
    }

    setTextFieldNull(field: 'name' | 'nameCn' | 'duration'): void {
        if (!this.isSuperAdmin || this.busy) return;
        this.episodeForm.controls[field].setValue(null);
        this.episodeForm.controls[field].markAsDirty();
    }

    fillFromUpstream(): void {
        if (!this.isSuperAdmin || this.busy) return;
        const subItemId = this.episodeForm.controls.subItemId.value;
        if (!subItemId || this.episodeForm.controls.subItemId.invalid) {
            this._toastRef.show('Set a valid subItemId before fetching upstream fields.');
            return;
        }
        this.busy = true;
        this._subscription.add(
            this._adminService.getEpisodeUpstreamFields(this.episode.id, subItemId)
                .pipe(finalize(() => { this.busy = false; }))
                .subscribe({
                    next: ({fields, warnings}) => {
                        this.upstreamWarnings = warnings;
                        const {properties, airdate, ...values} = fields;
                        this.episodeForm.patchValue(values);
                        if (airdate !== undefined) {
                            this.episodeForm.controls.airdate.setValue(airdate?.slice(0, 10) ?? null);
                        }
                        if (properties !== undefined) {
                            this.episodeForm.controls.properties.setValue(JSON.stringify(properties, null, 2));
                        }
                        this.episodeForm.markAsDirty();
                        this._toastRef.show(warnings.length
                            ? 'Upstream fields filled. Some fields were skipped; review the warnings before saving.'
                            : 'Upstream fields filled. Review the values and save to apply.');
                    },
                    error: (error: BaseError | HttpErrorResponse) => this.showError(error)
                })
        );
    }

    private showError(error: BaseError | HttpErrorResponse): void {
        this._toastRef.show(error instanceof HttpErrorResponse ? extractErrorMessage(error) : error.message);
    }
}
