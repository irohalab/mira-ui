import { animate, state, style, transition, trigger } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { VideoFile } from '../../entity/video-file';
import { VideoPlayer } from '../../video-player/video-player.component';

export interface PVManifest {
    name: string,
    name_cn?: string,
    bgm_id?: number,
    image?: string,
    summary?: string,
    air_date?: string,
    timestamp: string;
}

@Component({
    selector: 'preview-video',
    templateUrl: './preview-video.html',
    styleUrls: ['./preview-video.less'],
    animations: [
        trigger('timing', [
            state('active', style({
                transform: 'translateX(0)',
                opacity: 1
            })),
            state('leave', style({
                transform: 'translateX(-50%)',
                opacity: 0
            })),
            state('enter', style({
                transform: 'translateX(50%)',
                opacity: 0
            })),
            transition('enter => active', animate('150ms linear')),
            transition('active => leave', animate('150ms linear'))
        ])
    ],
    standalone: false
})
export class PreviewVideoComponent implements OnInit, OnDestroy {
    videoFile: VideoFile;
    manifest: PVManifest[];
    currentTime: number;

    currentPV: PVManifest;

    currentPVState = 'enter';

    @ViewChild(VideoPlayer, {static: true}) videoPlayer: VideoPlayer;

    constructor(private _http: HttpClient) {
    }

    focusVideoPlayer(event: Event) {
        let target = event.target as HTMLElement;
        if (target.classList.contains('theater-backdrop')) {
            this.videoPlayer.requestFocus();
        }
    }

    onProgressUpdate(currentTime: number) {
        this.currentTime = currentTime;
        if (!!this.currentPV && this.currentPVState === 'active') {
            let [startTime, endTime] = this.parseTimestamp(this.currentPV.timestamp);
            if (currentTime < startTime || currentTime > endTime) {
                this.currentPVState = 'leave';
                return;
            }
        }
        if (!!this.manifest && this.manifest.length > 0) {
            let activatedPV = this.manifest.find((pv) => {
                let [st, et] = this.parseTimestamp(pv.timestamp);
                return st <= currentTime && et >= currentTime;
            });
            if (!!activatedPV) {
                this.currentPV = activatedPV;
                this.currentPVState = 'active';
            } else {
                this.currentPVState = 'enter';
            }
        }
    }

    ngOnInit(): void {
        const queryString = window.location.search;
        const params = new URLSearchParams(queryString);
        const videoPath = params.get('p');
        let staticDomain = params.get('d');
        if (!staticDomain) {
            staticDomain = window.location.host;
        }
        this.videoFile = {
            url: `//${staticDomain}/video/preview-video/${videoPath}.mp4`
        } as VideoFile;

        let videoPathDir = videoPath.substring(0, videoPath.indexOf('/'));

        this._http.get<PVManifest[]>(`//${staticDomain}/video/preview-video/${videoPathDir}/manifest.json`)
            .subscribe((mainfest: PVManifest[]) => {
                this.manifest = mainfest;
                this.currentPV = this.manifest[0];
            });
    }

    ngOnDestroy(): void {
    }

    private parseTimestamp(timestamp: string): number[] {
        let match = timestamp.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
        let startTimeMatch = match[1].match(/(\d{2}):(\d{2})/);
        let endTimeMatch = match[2].match(/(\d{2}):(\d{2})/);
        let startTimeBySec = parseInt(startTimeMatch[1]) * 60 + parseInt(startTimeMatch[2]);
        let endTimeBySec = parseInt(endTimeMatch[1]) * 60 + parseInt(endTimeMatch[2]);
        return [startTimeBySec, endTimeBySec];
    }

}
