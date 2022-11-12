import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { DownloadJob } from '../../../entity/DownloadJob';
import { interval, Subscription } from 'rxjs';
import { DownloadManagerService } from '../download-manager.service';
import { switchMap, takeWhile } from 'rxjs/operators';
import { DownloadJobStatus } from '../../../entity/DownloadJobStatus';

@Component({
    selector: 'download-job-detail',
    templateUrl: './download-job-detail.html',
    styleUrls: ['./download-job-detail.less']
})
export class DownloadJobDetailComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    mJobStatus = DownloadJobStatus;

    @Input()
    job: DownloadJob;

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
                    }))
                .subscribe({
                    next: (job) => {
                        this.job = job;
                    },
                    error: (error) => {
                        this._toastRef.show(error.message || error);
                    }
                })
        );
    }
}
