
import {interval as observableInterval, fromEvent as observableFromEvent,  Observable ,  Subscription } from 'rxjs';

import {takeUntil, mergeMap, tap, distinctUntilChanged} from 'rxjs/operators';
import {
    AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output,
    ViewChild
} from '@angular/core';
import { VideoPlayerHelpers } from '../../core/helpers';
import { VideoPlayer } from '../../video-player.component';

@Component({
    selector: 'video-volume-control',
    templateUrl: './volume-control.html',
    styleUrls: ['./volume-control.less'],
    standalone: false
})
export class VideoVolumeControl implements AfterViewInit, OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _dragEventEmitSubscription: Subscription;
    private _isDragging = false;
    private _volume: number;

    muted: boolean;

    get volume(): number {
        if (this.muted) {
            return 0;
        }
        return this._volume;
    }

    get volumeLevelClass(): string {
        if (this._volume === 0 || this.muted) {
            return 'off';
        } else if (this._volume < 0.5) {
            return 'down';
        }
        return 'up';
    }

    @Output()
    motion = new EventEmitter<any>();

    @ViewChild('slider', {static: false}) slider: ElementRef;

    constructor(private _videoPlayer: VideoPlayer) {
    }

    onMuteButtonClick(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this._videoPlayer.setMuted(!this.muted);
    }

    ngOnInit(): void {
        this._subscription.add(
            this._videoPlayer.volume.pipe(
                distinctUntilChanged())
                .subscribe((vol: number) => {
                    this._volume = vol;
                    this.motion.emit(1);
                })
        );
        this._subscription.add(
            this._videoPlayer.muted.pipe(
                distinctUntilChanged())
                .subscribe((muted: boolean) => {
                    this.muted = muted;
                    this.motion.emit(1);
                })
        );
    }

    ngAfterViewInit(): void {
        let sliderElement = this.slider.nativeElement as HTMLElement;
        this._subscription.add(
            observableFromEvent<MouseEvent>(sliderElement, 'mousedown').pipe(
                tap((event: MouseEvent) => {
                    this.unmute();
                    this._videoPlayer.setVolume(VideoPlayerHelpers.calcSliderRatio(sliderElement.getBoundingClientRect(), event.clientX));
                    this.startDrag();
                }),
                mergeMap(() => {
                    return observableFromEvent<MouseEvent>(document, 'mousemove').pipe(
                        takeUntil(observableFromEvent<MouseEvent>(document, 'mouseup').pipe(
                            tap(() => {
                                this.stopDrag();
                            }))));
                }),)
                .subscribe((event: MouseEvent) => {
                    this.unmute();
                    this._videoPlayer.setVolume(VideoPlayerHelpers.calcSliderRatio(sliderElement.getBoundingClientRect(), event.clientX));
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    private startDrag() {
        this._isDragging = true;
        this._dragEventEmitSubscription = observableInterval(100).subscribe(() => {
            this.motion.emit(1);
        })
    }

    private stopDrag() {
        this._isDragging = false;
        this._dragEventEmitSubscription.unsubscribe();
    }

    private unmute() {
        this._videoPlayer.setMuted(false);
    }
}
