import { Component, Input } from '@angular/core';
import { VideoProcessJob } from '../../entity/VideoProcessJob';

@Component({
    selector: 'video-process-job-card',
    templateUrl: './video-process-job-card.html',
    styleUrls: ['./video-process-job-card.less']
})
export class VideoProcessJobCardComponent {
    @Input()
    public job: VideoProcessJob;
}
