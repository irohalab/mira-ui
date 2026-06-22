import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { JobType } from '../../entity/JobType';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'video-process-job-card',
    templateUrl: './video-process-job-card.html',
    styleUrls: ['./video-process-job-card.less'],
    imports: [RouterLink, NgClass]
})
export class VideoProcessJobCardComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    public job: VideoProcessJob;

    eJobStatus = VideoProcessJobStatus;

    eJobType = JobType;

    isDarkTheme: boolean;

    constructor(private _darkThemeService: DarkThemeService) {
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
