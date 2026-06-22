import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { DownloadJob } from '../../../entity/DownloadJob';
import { interval, Subscription } from 'rxjs';
import { DownloadManagerService } from '../download-manager.service';
import { switchMap, takeWhile } from 'rxjs/operators';
import { DownloadJobStatus } from '../../../entity/DownloadJobStatus';
import { TorrentFile } from '../../../entity/TorrentFile';
import { RouterLink } from '@angular/router';
import { NgClass, PercentPipe } from '@angular/common';
import { ReadableUnit } from '../../../pipes/readable-unit';

@Component({
    selector: 'download-job-detail',
    templateUrl: './download-job-detail.html',
    styleUrls: ['./download-job-detail.less'],
    imports: [RouterLink, NgClass, PercentPipe, ReadableUnit]
})
export class DownloadJobDetailComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    mJobStatus = DownloadJobStatus;

    @Input()
    job: DownloadJob;

    jobContent: TorrentFile[];

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _dialogRef: UIDialogRef<DownloadJobDetailComponent>,
                private _downloadManagerService: DownloadManagerService,
                private _darkThemeService: DarkThemeService,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }
    closePanel(): void {
        this._dialogRef.close(null);
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        if (this.job.status === DownloadJobStatus.Complete) {
            this._subscription.add(
                this._downloadManagerService.getJobContent(this.job.id)
                    .subscribe({
                        next: (content) => {
                            this.jobContent = content;
                        },
                        error: (error) => {
                            this._toastRef.show(error.message || error);
                        }
                    })
            );
        } else {
            this._subscription.add(
                interval(5000)
                    .pipe(
                        takeWhile(() => {
                            return this.job.status === DownloadJobStatus.Downloading
                                || this.job.status === DownloadJobStatus.Pending
                                || this.job.status === DownloadJobStatus.Paused;
                        }),
                        switchMap(() => {
                            return this._downloadManagerService.getJob(this.job.id);
                        }),
                        switchMap((job) => {
                            this.job = job;
                            return this._downloadManagerService.getJobContent(job.id);
                        }))
                    .subscribe({
                        next: (content) => {
                            this.jobContent = content;
                        },
                        error: (error) => {
                            this._toastRef.show(error.message || error);
                        }
                    })
            );
        }
    }
}
