import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { BaseError } from '../../../../helpers/error';
import { Subscription } from 'rxjs';
import { NgClass } from '@angular/common';
import { EpisodeAdminEntity } from '../../../entity/admin/EpisodeAdminEntity';

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

    episodeForm: FormGroup;

    busy: boolean = false;

    constructor(private _adminService: AdminService,
                private _dialogRef: UIDialogRef<EpisodeDetail>,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                private _fb: FormBuilder) {
        this._toastRef = toastService.makeText();
        this.episodeForm = _fb.group({
            status: 0
        });
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        if (this.episode) {
            this.episodeForm.patchValue(this.episode);
        }
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    cancel(): void {
        this._dialogRef.close(false);
    }

    saveEpisode(): void {
        this.busy = true;
        const status = this.episodeForm.value.status as number;
        this._subscription.add(this._adminService.updateEpisodeStatus(this.episode.id, status)
            .subscribe({
                next: () => {
                    this.episode.status = status;
                    this.busy = false;
                    this._toastRef.show('更新成功');
                    this._dialogRef.close(true);
                },
                error: (error: BaseError) => {
                    this.busy = false;
                    this._toastRef.show(error.message);
                }
            })
        );
    }
}
