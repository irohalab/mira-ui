import { DownloadJobStatus } from '../../entity/DownloadJobStatus';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DownloadJob } from '../../entity/DownloadJob';
import { getRemPixel } from '../../../helpers/dom';
import { fromEvent, interval, Subscription } from 'rxjs';
import { DownloadManagerService } from './download-manager.service';
import { debounceTime, filter, switchMap } from 'rxjs/operators';
const JOB_CARD_HEIGHT_REM = 4.5;

@Component({
    selector: 'download-manager',
    templateUrl: './download-manager.html',
    styleUrls: ['./download-manager.less']
})
export class DownloadManagerComponent implements AfterViewInit, OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _updateJobListSubscription = new Subscription();
    private _jobList: DownloadJob[];

    mJobStatus = DownloadJobStatus

    selectJobStatus: DownloadJobStatus = DownloadJobStatus.Downloading;

    isLoading: boolean;
    jobList: DownloadJob[];

    cardHeight: number;

    @ViewChild('searchBox') searchBox: ElementRef;

    constructor(private _downloadManagerService: DownloadManagerService) {
        if (window) {
            this.cardHeight = getRemPixel(JOB_CARD_HEIGHT_REM)
        }
    }

    ngAfterViewInit(): void {
        const inputElement = this.searchBox.nativeElement;
        this._subscription.add(
            fromEvent(inputElement, 'input')
                .pipe(debounceTime(800))
                .subscribe(() => {
                    this.filterList();
                })
        );
        this._subscription.add(
            fromEvent<KeyboardEvent>(inputElement, 'keyup')
                .pipe(filter((event) => event.key === 'Enter')) // enter key
                .subscribe(() => {
                    this.filterList();
                })
        );
    }

    ngOnDestroy(): void {
        this._updateJobListSubscription.unsubscribe();
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.updateList();

    }
    onChangeStatus(status: DownloadJobStatus): void {
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
                this._jobList = null;
            })
        );
    }

    private filterList(): void {
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
            this.jobList = this._jobList.filter(job => {
                const idMatch = this.searchString(job.id, value);
                let bangumiNameMatch = false;
                if (job.bangumi) {
                    bangumiNameMatch = this.searchString(job.bangumi.name, value);
                }
                return idMatch || bangumiNameMatch;
            });
        }
    }

    private searchString(val1: string, val2: string): boolean {
        return val1.indexOf(val2) !== -1;
    }
}
