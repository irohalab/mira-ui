
import {fromEvent as observableFromEvent,  Subscription ,  Observable } from 'rxjs';

import {tap, mergeMap, filter, map} from 'rxjs/operators';
import {
    AfterViewInit, Component, ElementRef, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output,
    ViewChild
} from '@angular/core';
import { PreviewContainer, VideoCapture, PreviewImageParams, IMAGE_PROPERTY_NAME } from '../../core/video-capture.service';
import { UIDialog } from '@irohalab/deneb-ui';
import { CapturedImageOperationDialog } from './operation-dialog/operation-dialog.component';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { VideoControls } from '../controls.component';
import { VideoPlayer } from '../../video-player.component';

@Component({
    selector: 'video-captured-frame-list',
    templateUrl: './captured-frame-list.html',
    styleUrls: ['./captured-frame-list.less'],
    animations: [
        trigger('showState', [
            state('in', style({
                transform: 'translateY(0)'
            })),
            state('out', style({
                transform: 'translateY(-100%)'
            })),
            transition('out => in', animate('100ms ease-in')),
            transition('in => out', animate('100ms ease-out'))
        ])
    ],
    standalone: false
})
export class CapturedFrameList implements OnInit, AfterViewInit, OnDestroy, PreviewContainer {
    private _subscription = new Subscription();
    private _imageCount = 0;

    @Input()
    showControls: boolean;

    @Output()
    motion = new EventEmitter<any>();

    @HostBinding('@showState')
    get showState(): string {
        return this.showControls && this._imageCount > 0 ? 'in' : 'out';
    }

    @ViewChild('wrapper', {static: false}) previewWrapper: ElementRef;

    constructor(private _videoPlayer: VideoPlayer,
                private _videoCapture: VideoCapture,
                private _controls: VideoControls,
                private _dialogService: UIDialog) {
    }

    addImage(dataURI: string, params: PreviewImageParams) {
        let previewWrapperElement = this.previewWrapper.nativeElement as HTMLElement;
        let image = new Image();
        image.src = dataURI;
        image.style.display = 'inline-block';
        image.style.width = 'auto';
        image.style.height = '100%';
        image.style.cursor = 'pointer';
        image.style.marginLeft = '0.3rem';
        image.style.marginRight = '0.3rem';
        (image as any)[IMAGE_PROPERTY_NAME] = params;
        previewWrapperElement.appendChild(image);
        this._imageCount++;
        this.motion.emit(1);
    }

    ngOnInit(): void {
        this._videoCapture.registerPreviewContainer(this);
    }

    ngAfterViewInit(): void {
        let previewWrapperElement = this.previewWrapper.nativeElement as HTMLElement;
        this._subscription.add(
            observableFromEvent(previewWrapperElement, 'click').pipe(
                map((event: Event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this._videoPlayer.requestFocus();
                    return event.target as HTMLElement;
                }),
                filter(element => element.tagName.toUpperCase() === 'IMG'),
                mergeMap(image => {
                    let nextSibling = image.nextSibling;
                    let dialogRef = this._dialogService.open(CapturedImageOperationDialog, {
                        stickyDialog: false,
                        backdrop: true
                    }, this._controls.controlWrapper);

                    dialogRef.componentInstance.image = image as HTMLImageElement;
                    return dialogRef.afterClosed().pipe(
                        tap((result: any) => {
                            if (!result || !result.remove) {
                                previewWrapperElement.insertBefore(image, nextSibling);
                            }
                        }))
                }),)
                .subscribe((result) => {
                    if (result && result.remove) {
                        this._imageCount--;
                    }
                    this._videoPlayer.requestFocus();
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
        this._videoCapture.unregisterPreviewContainer();
    }

}
