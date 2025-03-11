import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import { LogType } from '../../video-process-manager/LogType';
import { VideoProcessManagerService } from '../../video-process-manager/video-process-manager.service';
import { auditTime, delay, fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { filter, tap } from 'rxjs/operators';

@Component({
    selector: 'stream-log-viewer',
    templateUrl: './stream-log.html',
    styleUrls: ['./stream-log.less'],
    standalone: false
})
export class StreamLogViewerComponent implements AfterViewInit, OnInit, OnDestroy {
    private _subscription = new Subscription();
    private scrollContainerElement: HTMLElement;
    private lastLogLength = 0;
    private checkSubject = new Subject<any>();
    private logCache: LogType[] = [];

    @Input()
    logLineSource: Observable<LogType>;

    logLines: LogType[] = [];

    lineHeight: number = 30;
    currentScrollPosition: number;

    scrollMode: 'tail' | 'scrollable' = 'tail';
    lockPanel = true;
    showPanel = true;

    @ViewChild('listContainer', {read: ElementRef}) listContainer: ElementRef;
    @ViewChild('controlContainer') controlContainer: ElementRef;

    constructor(private _videoProcessManagerService: VideoProcessManagerService) {
    }

    ngOnInit(): void {
        this._subscription.add(
            this.logLineSource
                .pipe(
                    tap((line) => {
                        this.logCache.push(line);
                    }),
                    auditTime(50)
                )
                .subscribe(() => {
                    this.logLines = this.logLines.concat(this.logCache);
                    this.logCache = [];
                    this.checkLogLength();
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.scrollContainerElement = this.listContainer.nativeElement.querySelector('.infinite-list');
        const controlContainer = this.controlContainer.nativeElement;
        this._subscription.add(fromEvent(controlContainer, 'mouseenter')
            .subscribe(() => {
                this.showPanel = true;
            })
        );
        this._subscription.add(fromEvent(controlContainer, 'mouseleave')
            .pipe(filter(() => !this.lockPanel))
            .subscribe(() => {
                this.showPanel = false;
            })
        );
        this._subscription.add(
            this.checkSubject
                .pipe(delay(50))
                .subscribe(() => {
                    const clientHeight = this.scrollContainerElement.clientHeight;
                    const scrollHeight = this.scrollContainerElement.scrollHeight;
                    if (Math.abs(scrollHeight - clientHeight - this.currentScrollPosition) >= 1) {
                        this.currentScrollPosition = scrollHeight - clientHeight;
                    }
                })
        )
    }

    onScrollPositionChange(p: number) {
        this.currentScrollPosition = p;
    }

    clearLog(): void {
        this.logLines = [];
    }

    toggleScrollMode(): void {
        if (this.scrollMode === 'tail') {
            this.scrollMode = 'scrollable';
        } else {
            this.scrollMode = 'tail';
        }
    }

    toggleLockPanel(): void {
        this.lockPanel = !this.lockPanel;
    }

    private checkLogLength(): void {
        if (this.logLines
            && this.logLines.length > this.lastLogLength
            && this.scrollContainerElement
            && this.scrollMode === 'tail') {
            this.lastLogLength = this.logLines.length;
            this.checkSubject.next(1);
        }
    }
}
