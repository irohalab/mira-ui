import { Component, Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import { DownloadJob } from '../../entity/DownloadJob';
import { DownloadJobStatus } from '../../entity/DownloadJobStatus';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { FileMappingListComponent } from './file-mapping-list/file-mapping-list.component';
import { DownloadManagerService } from '../download-manager/download-manager.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'download-job-card',
    templateUrl: './download-job-card.html',
    styleUrls: ['./download-job-card.less'],
    encapsulation: ViewEncapsulation.None
})
export class DownloadJobCardComponent implements OnDestroy {
    private _subscription = new Subscription();
    private _toast: UIToastRef<UIToastComponent>;

    @Input()
    job: DownloadJob;

    mJobStatus = DownloadJobStatus;

    constructor(private _dialog: UIDialog,
                private downloadManagerService: DownloadManagerService,
                toastService: UIToast) {
        this._toast = toastService.makeText();
    }

    onViewFileMapping() {
        const dialogRef = this._dialog.open(FileMappingListComponent, {stickyDialog: false, backdrop: true})
        dialogRef.componentInstance.fileMapping = this.job.fileMapping;
        dialogRef.componentInstance.jobId = this.job.id;
    }

    resendCompleteMessage() {
        this._subscription.add(
            this.downloadManagerService.resendJobCompleteMessage(this.job.id)
                .subscribe((status) => {
                    if (status === 0) {
                        this._toast.show('Successfully resent!');
                    } else {
                        this._toast.show('Resent failed!');
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
