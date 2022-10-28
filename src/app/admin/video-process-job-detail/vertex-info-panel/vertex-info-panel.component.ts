import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { LogType } from '../../video-process-manager/LogType';
import { Vertex } from '../../../entity/Vertex';
import { Subject, Subscription } from 'rxjs';
import { VideoProcessManagerService } from '../../video-process-manager/video-process-manager.service';
import {
    getMaxCharacterPerLineForContainer,
    processLineForStreamLogViewer
} from '../stream-log-viewer/stream-log-helper';
import { ActionType } from '../../../entity/action-type';
import { UIDialogRef } from '@irohalab/deneb-ui';

@Component({
    selector: 'vertex-info-panel',
    templateUrl: './vertex-info-panel.html',
    styleUrls: ['./vertex-info-panel.less']
})
export class VertexInfoPanelComponent implements OnDestroy {
    private _subscription = new Subscription();
    private vertexLogContainerMaxCharacter: number;

    eActionType = ActionType;

    vertexLogLines = new Subject<LogType>();

    @Input()
    vertex: Vertex;
    shouldShowVertexLog = false;

    @ViewChild('vertexLogWrapper') vertexLogContainer: ElementRef;

    constructor(private _videoProcessManagerService: VideoProcessManagerService,
                private _dialogRef: UIDialogRef<VertexInfoPanelComponent>) {
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
