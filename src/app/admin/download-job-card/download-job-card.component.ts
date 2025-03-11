import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
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
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class DownloadJobCardComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toast: UIToastRef<UIToastComponent>;

    @Output()
    selectCard = new EventEmitter<string>();

    @Output()
    viewDetail = new EventEmitter<DownloadJob>();

    @Input()
    job: DownloadJob;

    @Input()
    debugUtil: boolean;

    mJobStatus = DownloadJobStatus;

    episodeNoList: string[]

    constructor(private _dialog: UIDialog,
                private downloadManagerService: DownloadManagerService,
                toastService: UIToast) {
        this._toast = toastService.makeText();
    }

    onViewFileMapping(event: Event) {
        event.stopPropagation();
        const dialogRef = this._dialog.open(FileMappingListComponent, {stickyDialog: false, backdrop: true})
        dialogRef.componentInstance.fileMapping = this.job.fileMapping;
        dialogRef.componentInstance.jobId = this.job.id;
    }

    resendCompleteMessage(event: Event) {
        event.stopPropagation();
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

    ngOnInit(): void {
        if (this.job.fileMapping) {
            this.episodeNoList = this.job.fileMapping
                .map(mapping => mapping.episode)
                .filter(eps => !!eps)
                .map(eps => eps.episodeNo + '');
        }
    }

    onClickCard(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.selectCard.emit(this.job.id);
    }

    onViewDetail(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.viewDetail.emit(this.job);
    }
}
