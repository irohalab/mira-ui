import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';

@Component({
    selector: 'video-process-job-card',
    templateUrl: './video-process-job-card.html',
    styleUrls: ['./video-process-job-card.less']
})
export class VideoProcessJobCardComponent implements OnInit, OnDestroy {
    @Input()
    public job: VideoProcessJob;
    public eJobStatus = VideoProcessJobStatus;

    /**
     * Percent progress of the job;
     */
    public get jobProgress(): number {
        let progress =  this.job ? 0 : (this.job.progress - 1);
        progress = progress >= 0 ? progress : 0;
        let actionCount = this.job ? 0 : this.job.jobMessage.actions.length;
        if (actionCount === 0) {
            return 0;
        }
        return progress / actionCount * 100;
    }

    public ngOnDestroy(): void {
    }

    public ngOnInit(): void {
    }
}
