import { DownloadJobStatus } from '../../entity/DownloadJobStatus';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DownloadJob } from '../../entity/DownloadJob';
import { getRemPixel } from '../../../helpers/dom';
import { interval, Subscription } from 'rxjs';
import { DownloadManagerService } from './download-manager.service';
import { switchMap } from 'rxjs/operators';
import { AdminService } from '../admin.service';
import { UIDialog } from '@irohalab/deneb-ui';
import { DownloadJobDetailComponent } from './download-job-detail/download-job-detail.component';

const JOB_CARD_HEIGHT_REM = 4.5;

type SearchType = 'Job ID' | 'Bangumi ID' | 'Bangumi Name';

@Component({
    selector: 'download-manager',
    templateUrl: './download-manager.html',
    styleUrls: ['./download-manager.less']
})
export class DownloadManagerComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _updateJobListSubscription = new Subscription();
    private _jobList: DownloadJob[];

    mJobStatus = DownloadJobStatus

    selectJobStatus: DownloadJobStatus = DownloadJobStatus.Downloading;
    searchType: SearchType = 'Job ID';

    isLoading: boolean;
    jobList: DownloadJob[];
    selectedJobId: string;
    isDebugUtilityEnabled: boolean = false;

    cardHeight: number;

    @ViewChild('searchBox') searchBox: ElementRef;

    @HostListener('click', ['$event'])
    onHostClick(event: Event): void {
        event.stopPropagation();
        this.selectedJobId = null;
    }

    get selectedJobStatus(): DownloadJobStatus | null {
        let selectedJob: DownloadJob = null;
        if (this.selectedJobId) {
            const jobList = this._jobList || this.jobList;
            selectedJob = jobList.find(job => job.id === this.selectedJobId);
        }
        return selectedJob ? selectedJob.status : null;
    }

    constructor(private _downloadManagerService: DownloadManagerService,
                private _adminService: AdminService,
                private _dialog: UIDialog) {
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

    pauseOrResumeJob(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        if (this.selectedJobId) {
            const jobList = this._jobList || this.jobList;
            const selectedJob = jobList.find(job => job.id === this.selectedJobId);
            let action: 'pause' | 'resume' | 'delete';
            switch (selectedJob.status) {
                case DownloadJobStatus.Paused:
                    action ='resume';
                    break;
                case DownloadJobStatus.Downloading:
                case DownloadJobStatus.Pending:
                    action = 'pause';
                    break;
                default:
                    return;
            }
            this._subscription.add(
                this._downloadManagerService.jobOperation(selectedJob.id, action)
                    .subscribe(() => {
                        this.updateList();
                    })
            );
        }
    }

    deleteJob(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        if (this.selectedJobId) {
            const jobList = this._jobList || this.jobList;
            const selectedJob = jobList.find(job => job.id === this.selectedJobId);
            if (selectedJob.status === DownloadJobStatus.Removed) {
                return;
            }
            this._subscription.add(
                this._downloadManagerService.jobOperation(selectedJob.id, 'delete')
                    .subscribe(() => {
                        this.updateList();
                    })
            );
        }
    }

    onChangeSearchType(searchType: SearchType): void {
        this.searchType = searchType;
        this.filterList();
    }

    onChangeStatus(status: DownloadJobStatus): void {
        this.selectJobStatus = status;
        this.updateList();
    }

    onSelectJob(jobId: string) {
        this.selectedJobId = jobId;
    }

    onViewDetail(job: DownloadJob) {
        const dialogRef = this._dialog.open(DownloadJobDetailComponent, {stickyDialog: false, backdrop: false});
        dialogRef.componentInstance.job = job;
        this._subscription.add(dialogRef.afterClosed()
            .subscribe(() => {
                console.log('close dialog')
            }));
    }

    private updateList(): void {
        this._updateJobListSubscription.unsubscribe();
        this._updateJobListSubscription = new Subscription();
        this._updateJobListSubscription.add(
            this._downloadManagerService.list_jobs(this.selectJobStatus).pipe(
                switchMap((jobs) => {
                    this.jobList = jobs;
                    this._jobList = null;
                    this.filterList();
                    return interval(5000);
                }),
                switchMap(() => this._downloadManagerService.list_jobs(this.selectJobStatus))
            )
            .subscribe(jobs => {
                this.jobList = jobs;
                this._jobList = null;
                this.filterList();
            })
        );
    }

    filterList(): void {
        if (this.searchBox) {
            const inputElement = this.searchBox.nativeElement;
            const value = inputElement.value.trim();
            if (!this._jobList) {
                this._jobList = this.jobList;
            }
            if (!value) {
                this.jobList = this._jobList;
                return;
            }
            switch (this.searchType) {
                case 'Job ID':
                    this.jobList = this._jobList.filter(job => this.searchString(job.id, value));
                    break;
                case 'Bangumi ID':
                    this.jobList = this._jobList.filter(job => this.searchString(job.bangumiId, value));
                    break;
                case 'Bangumi Name':
                    this.jobList = this._jobList.filter(job => {
                        let bangumiNameMatch = this.searchString(job.bangumi.name, value);
                        if (!bangumiNameMatch) {
                            bangumiNameMatch = this.searchString(job.bangumi.name_cn, value);
                        }
                        return bangumiNameMatch;
                    });
                    break;
                // no default
            }
        }
    }

    private searchString(val1: string, val2: string): boolean {
        return val1.indexOf(val2) !== -1;
    }
}
