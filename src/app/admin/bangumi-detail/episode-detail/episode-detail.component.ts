import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { Episode } from '../../../entity';
import { AdminService } from '../../admin.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { BaseError } from '../../../../helpers/error';
import { Subscription } from 'rxjs';
import { NgClass } from '@angular/common';

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
    episode: Episode;

    @Input()
    bangumi_id: string;

    episodeForm: FormGroup;

    busy: boolean = false;

    constructor(private _adminService: AdminService,
                private _dialogRef: UIDialogRef<EpisodeDetail>,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                private _fb: FormBuilder) {
        this._toastRef = toastService.makeText();
        this.episodeForm = _fb.group({
            episodeNo: 0,
            name: '',
            nameCn: '',
            bgmEpsId: 0,
            airdate: '',
            duration: '',
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
        let modelValue = this.episodeForm.value;
        let episode = Object.assign({}, this.episode);
        episode.bangumi_id = this.bangumi_id;
        episode.episodeNo = modelValue.episodeNo as number;
        episode.bgmEpsId = modelValue.bgmEpsId as number;
        episode.name = modelValue.name as string;
        episode.nameCn = modelValue.nameCn as string;
        episode.airdate = modelValue.airdate as string;
        episode.status = modelValue.status as number;
        if (!episode.airdate) {
            episode.airdate = null;
        }
        episode.duration = modelValue.duration as string;
        let saveObservable;
        if (episode.id) {
            saveObservable = this._adminService.updateEpisode(episode);
        } else {
            saveObservable = this._adminService.addEpisode(episode);
        }
        this._subscription.add(saveObservable
            .subscribe({
                next: () => {
                    this.busy = false;
                    this._toastRef.show(episode.id ? '添加成功' : '更新成功');
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
