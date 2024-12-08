import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { DownloadJob } from '../../../entity/DownloadJob';
import { interval, Subscription } from 'rxjs';
import { DownloadManagerService } from '../download-manager.service';
import { switchMap, takeWhile } from 'rxjs/operators';
import { DownloadJobStatus } from '../../../entity/DownloadJobStatus';
import { TorrentFile } from '../../../entity/TorrentFile';

@Component({
    selector: 'download-job-detail',
    templateUrl: './download-job-detail.html',
    styleUrls: ['./download-job-detail.less'],
    standalone: false
})
export class DownloadJobDetailComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    mJobStatus = DownloadJobStatus;

    @Input()
    job: DownloadJob;

    jobContent: TorrentFile[];

    constructor(private _dialogRef: UIDialogRef<DownloadJobDetailComponent>,
                private _downloadManagerService: DownloadManagerService,
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
