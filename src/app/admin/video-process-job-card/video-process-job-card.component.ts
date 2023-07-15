import { Component, Input } from '@angular/core';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { JobType } from '../../entity/JobType';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';

@Component({
    selector: 'video-process-job-card',
    templateUrl: './video-process-job-card.html',
    styleUrls: ['./video-process-job-card.less']
})
export class VideoProcessJobCardComponent {
    @Input()
    public job: VideoProcessJob;

    eJobStatus = VideoProcessJobStatus;

    eJobType = JobType;
}
