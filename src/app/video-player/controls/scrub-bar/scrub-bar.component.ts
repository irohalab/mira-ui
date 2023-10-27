
import {interval as observableInterval, fromEvent as observableFromEvent,  Subscription } from 'rxjs';

import {takeUntil, mergeMap, tap, map, filter} from 'rxjs/operators';
import {
    AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit,
    Output, Self,
    ViewChild
} from '@angular/core';
import { VideoPlayerHelpers } from '../../core/helpers';
import { VideoPlayer } from '../../video-player.component';
import { getRemPixel } from '../../../../helpers/dom';

@Component({
    selector: 'video-player-scrub-bar',
    templateUrl: './scrub-bar.html',
    styleUrls: ['./scrub-bar.less']
})
export class VideoPlayerScrubBar implements AfterViewInit, OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _dragProgressRatio = -1;
    private _isDragging = false;
    private _isSeeking = false;
    private _controlVisibleState = false;

    buffered = 0;

    currentTime = 0;

    duration = Number.NaN;

    notMobileDevice = !VideoPlayerHelpers.isMobileDevice();

    previewKeyframeWidth: number;
    previewKeyframeHeight: number;
    previewBgPosX: number;
    previewBgPosY: number;
    previewBgImageUrl: string;

    get previewOffset(): number {
        return -(getRemPixel(1.7 + 1 + 0.8) + this.previewKeyframeHeight ?? 0);
    }

    @Input()
    set showControls(s: boolean) {
        this._controlVisibleState = s;
        if (!s) {
            this.hideToolTip();
        }
    }

    get controlVisibleState(): boolean {
        return this._controlVisibleState;
    }

    @Output()
    motion = new EventEmitter<any>();

    pointPosition: string;
    pointTransform: string;
    visibility: string;

    @ViewChild('tip', {static: false}) tipRef: ElementRef;
    @ViewChild('scrubBarWrapper', {static: false}) scrubBarWrapper: ElementRef;

    get playProgressPercentage(): number {
        if (this._isDragging) {
            return Math.round(this._dragProgressRatio * 1000) / 10;
        } else if (Number.isNaN(this.duration)) {
            return 0;
        }
        return Math.round(this.currentTime / this.duration * 1000) / 10;
    }

    get bufferedPercentage(): number {
        if (Number.isNaN(this.duration)) {
            return 0;
        }
        return Math.round(this.buffered / this.duration * 1000) / 10;
    }

    constructor(private _videoPlayer: VideoPlayer) {
    }

    ngOnInit(): void {
        const videoFile= this._videoPlayer.videoFile;
        this.previewKeyframeWidth = videoFile.kf_frame_width;
        this.previewKeyframeHeight = videoFile.kf_frame_height;
        this.previewBgImageUrl = videoFile.kf_image_path_list[0];
        this._subscription.add(
            this._videoPlayer.currentTime.subscribe(time => this.currentTime = time)
        );
        this._subscription.add(
            this._videoPlayer.duration.subscribe(duration => {
                this._dragProgressRatio = -1;
                this.duration = duration;
            })
        );
        this._subscription.add(
            this._videoPlayer.buffered.subscribe(buffered => this.buffered = buffered)
        );
        this._subscription.add(
            this._videoPlayer.seeking.subscribe(isSeeking => this._isSeeking = isSeeking)
        );
    }

    ngAfterViewInit(): void {
        let interactiveAreaElement = this.scrubBarWrapper.nativeElement as HTMLElement;
        let tipElement = this.tipRef.nativeElement as HTMLElement;
        if (this.notMobileDevice) {
            this._subscription.add(
                observableFromEvent<MouseEvent>(interactiveAreaElement, 'mousedown').pipe(
                    filter(() => {
                        return !Number.isNaN(this.duration);
                    }),
                    map((event: MouseEvent) => {
                        return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                    }),
                    tap(({rect, event}: { rect: ClientRect, event: MouseEvent }) => {
                        event.preventDefault();
                        this._dragProgressRatio = VideoPlayerHelpers.calcSliderRatio(rect, event.clientX);
                        this.startDrag();
                        this.updateTip(rect, event, tipElement);
                        this.visibility = 'visible';
                    }),
                    mergeMap(() => {
                        return observableFromEvent<MouseEvent>(document, 'mousemove').pipe(
                            map((event: MouseEvent) => {
                                return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                            }),
                            takeUntil(observableFromEvent<MouseEvent>(document, 'mouseup').pipe(
                                map((event: MouseEvent) => {
                                    return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                                }),
                                tap(({rect, event}: { rect: ClientRect, event: MouseEvent }) => {
                                    this._videoPlayer.seek(VideoPlayerHelpers.calcSliderRatio(rect, event.clientX));
                                    this.stopDrag();
                                    if (!this.isEventInRect(rect, event)) {
                                        this.hideToolTip();
                                    }
                                }),)),);
                    }),)
                    .subscribe(
                        ({rect, event}: { rect: ClientRect, event: MouseEvent }) => {
                            this._dragProgressRatio = VideoPlayerHelpers.calcSliderRatio(rect, event.clientX);
                            this.updateTip(rect, event, tipElement);
                        }
                    )
            );

            this._subscription.add(
                observableFromEvent<MouseEvent>(interactiveAreaElement, 'mousemove').pipe(
                    filter(() => !Number.isNaN(this.duration)),
                    filter(() => !this._isDragging),
                    map((event: MouseEvent) => {
                        return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                    }),
                    filter(({rect, event}: { rect: ClientRect, event: MouseEvent }) => {
                        return this.isEventInRect(rect, event);
                    }),)
                    .subscribe(({rect, event}: { rect: ClientRect, event: MouseEvent }) => {
                        this.updateTip(rect, event, tipElement);
                    })
            );
            this._subscription.add(
                observableFromEvent<MouseEvent>(interactiveAreaElement, 'mouseenter').pipe(
                    filter(() => !this._isDragging),
                    map((event: MouseEvent) => {
                        return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                    }),)
                    .subscribe(({rect, event}: { rect: ClientRect, event: MouseEvent }) => {
                        this.updateTip(rect, event, tipElement);
                        this.visibility = 'visible';
                    })
            );
            this._subscription.add(
                observableFromEvent(interactiveAreaElement, 'mouseleave').pipe(
                    filter(() => !this._isDragging))
                    .subscribe(() => {
                        this.hideToolTip();
                    })
            );
        } else {
            this._subscription.add(
                observableFromEvent<TouchEvent>(interactiveAreaElement, 'touchstart').pipe(
                    filter(() => {
                        return this.controlVisibleState;
                    }),
                    filter(() => {
                        return !Number.isNaN(this.duration);
                    }),
                    map((event: TouchEvent) => {
                        return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                    }),
                    tap(({rect, event}: { rect: ClientRect, event: TouchEvent }) => {
                        event.preventDefault();
                        this._dragProgressRatio = VideoPlayerHelpers.calcSliderRatio(rect, event.changedTouches[0].clientX);
                        this.startDrag();
                    }),
                    mergeMap(() => {
                        return observableFromEvent<TouchEvent>(document, 'touchmove').pipe(
                            map((event: TouchEvent) => {
                                return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                            }),
                            takeUntil(observableFromEvent<TouchEvent>(document, 'touchend').pipe(
                                map((event: TouchEvent) => {
                                    return {rect: interactiveAreaElement.getBoundingClientRect(), event: event};
                                }),
                                tap(({rect, event}: { rect: ClientRect, event: TouchEvent }) => {
                                    this._videoPlayer.seek(VideoPlayerHelpers.calcSliderRatio(rect, event.changedTouches[0].clientX));
                                    this.stopDrag();
                                }),)),);
                    }),)
                    .subscribe(({rect, event}: { rect: ClientRect, event: TouchEvent }) => {
                        this._dragProgressRatio = VideoPlayerHelpers.calcSliderRatio(rect, event.changedTouches[0].clientX);
                    })
            );
        }

        this._subscription.add(
            observableInterval(100).pipe(
                filter(() => {
                    return this._isDragging || this._isSeeking;
                }))
                .subscribe(() => {
                    this.motion.emit(1);
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    private startDrag() {
        this._isDragging = true;
    }

    private stopDrag() {
        this._isDragging = false;
    }

    /**
     * update tip position and content.
     * @param rect - the hostElement
     * @param event
     * @param tipElement
     */
    private updateTip(rect: ClientRect, event: MouseEvent, tipElement: HTMLElement) {
        let rectOfTip = tipElement.getBoundingClientRect();
        let halfWidthOfTip = rectOfTip.width / 2;
        let ratio = VideoPlayerHelpers.calcSliderRatio(rect, event.clientX);
        let pointX = ratio * rect.width - halfWidthOfTip;

        if (pointX < 0) {
            pointX = 0;
        } else if (pointX + rectOfTip.width > rect.width) {
            pointX = rect.width - rectOfTip.width;
        }
        if (pointX === 0) {
            this.pointTransform = `translateX(${-halfWidthOfTip})`;
        } else {
            this.pointTransform = `translateX(${pointX}px)`;
        }
        this.pointPosition = VideoPlayerHelpers.convertTime(this.duration * ratio);
        this.updateKeyframePreview(ratio);
    }

    private hideToolTip(): void {
        this.visibility = 'collapse';
        // change to 0 so that any pointTransform change can be detected.
        this.pointTransform = `translateX(0)`;
    }

    private updateKeyframePreview(ratio: number): void {
        const videoFile= this._videoPlayer.videoFile;
        if (Array.isArray(videoFile.kf_image_path_list) && videoFile.kf_image_path_list.length > 0) {
            const tileSize= videoFile.kf_tile_size;
            // console.log(videoFile);
            let keyframeSeq = Math.round((this.duration * ratio) / 2);
            let imgSeq = Math.floor(keyframeSeq / (tileSize * tileSize));
            keyframeSeq = keyframeSeq - imgSeq * tileSize * tileSize;
            this.previewBgPosX = -1 * keyframeSeq % videoFile.kf_tile_size * videoFile.kf_frame_width;
            this.previewBgPosY = -1 * Math.floor(keyframeSeq / videoFile.kf_tile_size) * videoFile.kf_frame_height;
            this.previewBgImageUrl = videoFile.kf_image_path_list[imgSeq];
        }
    }

    private isEventInRect(rect: ClientRect, event: MouseEvent): boolean {
        let clientX = event.clientX;
        let clientY = event.clientY;
        return rect.right >= clientX && rect.left <= clientX
            && rect.top <= clientY && rect.bottom >= clientY;
    }
}
