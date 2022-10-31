import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { VideoProcessManagerService } from './video-process-manager.service';
import { getRemPixel } from '../../../helpers/dom';
import { switchMap } from 'rxjs/operators';

const JOB_CARD_HEIGHT_REM = 4.5;

@Component({
    selector: 'video-process-manager',
    templateUrl: './video-process-manager.html',
    styleUrls: ['./video-process-manager.less']
})
export class VideoProcessManagerComponent implements OnInit, OnDestroy {
    private _jobListSub = new Subscription();
    private _sub = new Subscription();

    cardHeight: number;
    isLoading: boolean;
    jobList: VideoProcessJob[];
    eJobStatus = VideoProcessJobStatus;
    selectJobStatus: VideoProcessJobStatus = VideoProcessJobStatus.Running;

    constructor(private _videoProcessManagerService: VideoProcessManagerService) {
        if (window) {
            this.cardHeight = getRemPixel(JOB_CARD_HEIGHT_REM)
        }
    }

    ngOnDestroy(): void {
        this._jobListSub.unsubscribe();
        this._sub.unsubscribe();
    }

    ngOnInit(): void {
        this.updateJobList();
    }

    onChangeStatus(status: VideoProcessJobStatus) {
        this.selectJobStatus = status;
        this.updateJobList();
    }

    private updateJobList() {
        this._jobListSub.unsubscribe();
        this._jobListSub = new Subscription();
        this._jobListSub.add(
            this._videoProcessManagerService.listJobs(this.selectJobStatus).pipe(
                switchMap((jobs: VideoProcessJob[]) => {
                    this.jobList = jobs;
                    return interval(500000);
                }),
                switchMap(() => this._videoProcessManagerService.listJobs(this.selectJobStatus))
            ).subscribe((jobs: VideoProcessJob[]) => {
                this.jobList = jobs;
            })
        );
    }

}
