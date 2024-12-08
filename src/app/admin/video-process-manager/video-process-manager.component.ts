import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { VideoProcessManagerService } from './video-process-manager.service';
import { getRemPixel } from '../../../helpers/dom';
import { filter, switchMap } from 'rxjs/operators';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { JobType } from '../../entity/JobType';

const JOB_CARD_HEIGHT_REM = 4.5;

@Component({
    selector: 'video-process-manager',
    templateUrl: './video-process-manager.html',
    styleUrls: ['./video-process-manager.less'],
    standalone: false
})
export class VideoProcessManagerComponent implements OnInit, OnDestroy {
    private _jobListSub = new Subscription();
    private _sub = new Subscription();
    private _jobList: VideoProcessJob[];

    cardHeight: number;
    isLoading: boolean;
    jobList: VideoProcessJob[];
    eJobStatus = VideoProcessJobStatus;
    selectJobStatus: VideoProcessJobStatus | 'all' = VideoProcessJobStatus.Running;
    isShowMetaJobs: boolean = true;

    constructor(private _videoProcessManagerService: VideoProcessManagerService,
                private _route: ActivatedRoute,
                titleService: Title) {
        titleService.setTitle(`视频管理 - ${environment.siteTitle}`);
        if (window) {
            this.cardHeight = getRemPixel(JOB_CARD_HEIGHT_REM)
        }
    }

    ngOnDestroy(): void {
        this._jobListSub.unsubscribe();
        this._sub.unsubscribe();
    }

    ngOnInit(): void {
        this._sub.add(
            this._route.queryParams
                .pipe(
                    filter((params) => {
                        return params['status'];
                    })
                )
                .subscribe((params) => {
                    this.selectJobStatus = params['status'] as VideoProcessJobStatus | 'all';
                    this.updateJobList();
                })
        );
        this.updateJobList();
    }

    private updateJobList() {
        this._jobListSub.unsubscribe();
        this._jobListSub = new Subscription();
        this._jobListSub.add(
            this._videoProcessManagerService.listJobs(this.selectJobStatus).pipe(
                switchMap((jobs: VideoProcessJob[]) => {
                    this._jobList = jobs;
                    this.filterJob();
                    return interval(500000);
                }),
                switchMap(() => this._videoProcessManagerService.listJobs(this.selectJobStatus))
            ).subscribe((jobs: VideoProcessJob[]) => {
                this._jobList = jobs;
                this.filterJob();
            })
        );
    }

    public filterJob() {
        this.jobList = this._jobList.filter((job) => {
            return this.isShowMetaJobs ? true : job.jobMessage.jobType !== JobType.META_JOB;
        });
    }

}
