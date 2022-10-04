import { JobStatus } from '../../entity/JobStatus';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DownloadJob } from '../../entity/DownloadJob';
import { getRemPixel } from '../../../helpers/dom';
import { interval, Subscription } from 'rxjs';
import { DownloadManagerService } from './download-manager.service';
import { switchMap } from 'rxjs/operators';
const JOB_CARD_HEIGHT_REM = 4.5;

@Component({
    selector: 'download-manager',
    templateUrl: './download-manager.html',
    styleUrls: ['./download-manager.less']
})
export class DownloadManagerComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _updateJobListSubscription = new Subscription();

    mJobStatus = JobStatus

    selectJobStatus: JobStatus = JobStatus.Downloading;

    isLoading: boolean;
    jobList: DownloadJob[];

    cardHeight: number;

    constructor(private _downloadManagerService: DownloadManagerService) {
        if (window) {
            this.cardHeight = getRemPixel(JOB_CARD_HEIGHT_REM)
        }
    }

    ngOnDestroy(): void {
        this._updateJobListSubscription.unsubscribe();
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.updateList();

    }
    onChangeStatus(status: JobStatus): void {
        this.selectJobStatus = status;
        this.updateList();
    }

    private updateList(): void {
        this._updateJobListSubscription.unsubscribe();
        this._updateJobListSubscription = new Subscription();
        this._updateJobListSubscription.add(
            this._downloadManagerService.list_jobs(this.selectJobStatus).pipe(
                switchMap(jobs => {
                    this.jobList = jobs;
                    return interval(5000);
                }),
                switchMap(() => this._downloadManagerService.list_jobs(this.selectJobStatus))
            )
            .subscribe(jobs => {
                this.jobList = jobs;
            })
        );
    }
}
