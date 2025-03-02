import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { WatchProgress } from '../../../entity/watch-progress';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { getRemPixel } from '../../../../helpers/dom';

export const CARD_HEIGHT_REM = 16;

const THUMBNAIL_WIDTH = 8;
const THUMBNAIL_HEIGHT = 4.5;

@Component({
    selector: 'history-card',
    templateUrl: './history-card.html',
    styleUrls: ['./history-card.less'],
    encapsulation: ViewEncapsulation.Emulated,
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class HistoryCardComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    isDarkTheme: boolean;

    eWatchStatus = WatchProgress;

    @Input()
    watchProgress: WatchProgress;

    thumbnailBgPosX: number = 0;
    thumbnailBgPosY: number = 0;
    thumbnailUrl: string;
    bgScaleW: string;
    bgScaleH: string;

    constructor(private _router: Router,
                private _darkThemeService: DarkThemeService) {
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.setImage();
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }

    private setImage(): void {
        const videoFile = this.watchProgress.episode.videoFiles[0];
        if (!videoFile.kfImagePathList || videoFile.kfImagePathList.length === 0) {
            return;
        }
        const tileSize = videoFile.kfTileSize;
        const scaledX = getRemPixel(THUMBNAIL_WIDTH);
        const scaledY = getRemPixel(THUMBNAIL_HEIGHT);
        let keyframeSeq = Math.round(this.watchProgress.lastWatchPosition / 2);
        let imgSeq = Math.floor(keyframeSeq / (tileSize * tileSize));
        keyframeSeq = keyframeSeq - imgSeq * tileSize * tileSize;
        this.thumbnailBgPosX = -1 * keyframeSeq % tileSize * scaledX;
        this.thumbnailBgPosY = -1 * Math.floor(keyframeSeq / tileSize) * scaledY;
        this.thumbnailUrl = videoFile.kfImagePathList[imgSeq];
        this.bgScaleW = getRemPixel(THUMBNAIL_WIDTH) * videoFile.kfTileSize + 'px';
        this.bgScaleH = getRemPixel(THUMBNAIL_HEIGHT) * videoFile.kfTileSize  + 'px';
    }
}
