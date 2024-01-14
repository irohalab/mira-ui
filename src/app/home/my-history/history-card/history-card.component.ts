import { Bangumi, Episode } from '../../../entity';
import {
    ChangeDetectionStrategy,
    Component, Input,
    OnChanges,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewEncapsulation
} from '@angular/core';
import { WatchProgress } from '../../../entity/watch-progress';
import { ImageLoadingStrategy } from '../../bangumi-card/image-loading-strategy.service';
import { DARK_THEME, DarkThemeService, InfiniteList, SCROLL_STATE } from '@irohalab/deneb-ui';
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
    changeDetection: ChangeDetectionStrategy.Default
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
        const videoFile = this.watchProgress.video_file;
        if (!videoFile.kf_image_path_list || videoFile.kf_image_path_list.length === 0) {
            return;
        }
        const tileSize = videoFile.kf_tile_size;
        const scaledX = getRemPixel(THUMBNAIL_WIDTH);
        const scaledY = getRemPixel(THUMBNAIL_HEIGHT);
        let keyframeSeq = Math.round(this.watchProgress.last_watch_position / 2);
        let imgSeq = Math.floor(keyframeSeq / (tileSize * tileSize));
        keyframeSeq = keyframeSeq - imgSeq * tileSize * tileSize;
        this.thumbnailBgPosX = -1 * keyframeSeq % tileSize * scaledX;
        this.thumbnailBgPosY = -1 * Math.floor(keyframeSeq / tileSize) * scaledY;
        this.thumbnailUrl = videoFile.kf_image_path_list[imgSeq];
        this.bgScaleW = getRemPixel(THUMBNAIL_WIDTH) * videoFile.kf_tile_size + 'px';
        this.bgScaleH = getRemPixel(THUMBNAIL_HEIGHT) * videoFile.kf_tile_size  + 'px';
    }
}
