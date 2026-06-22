import { AfterViewInit, Component, ElementRef, HostBinding, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { LogType } from '../../video-process-manager/LogType';
import { Vertex } from '../../../entity/Vertex';
import { Subject, Subscription } from 'rxjs';
import { VideoProcessManagerService } from '../../video-process-manager/video-process-manager.service';
import {
    getMaxCharacterPerLineForContainer,
    processLineForStreamLogViewer
} from '../stream-log-viewer/stream-log-helper';
import { ActionType } from '../../../entity/action-type';
import { DARK_THEME, DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import { StreamLogViewerComponent } from '../stream-log-viewer/stream-log-viewer.component';
import { NgClass } from '@angular/common';

@Component({
    selector: 'vertex-info-panel',
    templateUrl: './vertex-info-panel.html',
    styleUrls: ['./vertex-info-panel.less'],
    imports: [StreamLogViewerComponent, NgClass]
})
export class VertexInfoPanelComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private vertexLogContainerMaxCharacter: number;

    eActionType = ActionType;

    vertexLogLines = new Subject<LogType>();

    @Input()
    vertex: Vertex;
    shouldShowVertexLog = false;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @ViewChild('vertexLogWrapper') vertexLogContainer: ElementRef;

    constructor(private _videoProcessManagerService: VideoProcessManagerService,
                private _darkThemeService: DarkThemeService,
                private _dialogRef: UIDialogRef<VertexInfoPanelComponent>) {
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

    showLog(): void {
        const containerElement = this.vertexLogContainer.nativeElement as HTMLElement;
        this.vertexLogContainerMaxCharacter = getMaxCharacterPerLineForContainer(containerElement);
        this._subscription.add(
            this._videoProcessManagerService.streamingVertexLog(this.vertex.jobId, this.vertex.id)
                .subscribe((line: LogType) => {
                    const logLines: LogType[] = [];
                    processLineForStreamLogViewer(line, this.vertexLogContainerMaxCharacter, logLines);
                    logLines.forEach(logLine => {
                        this.vertexLogLines.next(logLine);
                    })
                })
        );
        this.shouldShowVertexLog = true;
    }

    closePanel(): void {
        this._dialogRef.close();
    }
}
