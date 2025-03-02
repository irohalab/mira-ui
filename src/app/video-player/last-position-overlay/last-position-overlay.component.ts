import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { interval as observableInterval } from 'rxjs/internal/observable/interval';
import { take } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { VideoPlayer } from '../video-player.component';
import { PlayState } from '../core/state';
import { VideoPlayerHelpers } from '../core/helpers';
import { PersistStorage } from '../../user-service';
import { CorePlayer } from '../core/settings';

const countDownTimer = 5; // unit second

@Component({
    selector: 'last-position-overlay',
    templateUrl: './last-position-overlay.html',
    styleUrls: ['./last-position-overlay.less'],
    standalone: false
})
export class LastPositionOverlayComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private _lastEpisodeId: string;
    private _progress: number = 1;
    private timerSub: Subscription;

    get progress(): string {
        return this._progress + '%';
    }

    get lastPositionReadableTime(): string {
        if (!this.lastPosition) {
            return '-';
        }
        return VideoPlayerHelpers.convertTime(this.lastPosition);
    }

    @Input()
    touchControl: boolean;

    lastPosition: number;

    isShowOverlay = false;

    constructor(private _videoPlayer: VideoPlayer,
                private _persistStorage: PersistStorage,) {
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.subscription.add(
            this._videoPlayer.state
                .subscribe((state) => {
                    if (state === PlayState.INITIAL) {
                        // close overlay if exists
                        this.closeOverlay();
                        const autoPlayFromLastPosition = this._persistStorage.getItem(CorePlayer.AUTO_PLAY_FROM_LAST_POSITION, 'false');
                        if (autoPlayFromLastPosition !== 'true' && this._lastEpisodeId !== this._videoPlayer.videoFile.episode.id) {
                            if (this._videoPlayer.videoFile.duration && this._videoPlayer.lastPlayedPosition && this._videoPlayer.lastPlayedPosition < this._videoPlayer.videoFile.duration - 1) {
                                this.popupOverlay();
                            }
                        }
                        this._lastEpisodeId = this._videoPlayer.videoFile.episode.id;
                    }
                })
        );

        this.subscription.add(
            this._videoPlayer.state.subscribe()
        );
    }

    playFromLastPosition(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this._videoPlayer.jumpToPosition(this.lastPosition);
        this.closeOverlay();
    }

    playFromBeginning(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this._videoPlayer.jumpToPosition(0);
        this.closeOverlay();
    }

    private popupOverlay(): void {
        this.lastPosition = this._videoPlayer.lastPlayedPosition;
        this.isShowOverlay = true;
        this.timerSub = observableInterval(50).pipe(
            take(countDownTimer * 20))
            .subscribe({
                next:(t) => {
                    this._progress = t;
                },
                error: () => {
                    // do nothing
                },
                complete: () => {
                    this.closeOverlay();
                }});
        this.subscription.add(
            this.timerSub
        );
    }

    private closeOverlay() {
        this.isShowOverlay = false;
        if (this.timerSub) {
            this.timerSub.unsubscribe();
        }
    }
}
