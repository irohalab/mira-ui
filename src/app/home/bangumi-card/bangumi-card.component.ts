import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Optional,
    SimpleChanges,
    ViewEncapsulation
} from '@angular/core';
import { Bangumi } from '../../entity/bangumi';
import { FAVORITE_LABEL } from '../../entity/constants';
import { DARK_THEME, DarkThemeService, InfiniteList, SCROLL_STATE } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { ImageLoadingStrategy } from './image-loading-strategy.service';

export const CARD_HEIGHT_REM = 16;

export const IMAGE_LOAD_DELAY = 1000;

@Component({
    selector: 'bangumi-card',
    templateUrl: './bangumi-card.html',
    styleUrls: ['./bangumi-card.less'],
    encapsulation: ViewEncapsulation.Emulated,
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class BangumiCard implements OnInit, OnDestroy, OnChanges {
    private _subscription = new Subscription();
    private _imageLoadDelayTimerId: number;

    @Input()
    bangumi: Bangumi;

    @Input()
    isInit: boolean;

    @Input()
    index: number;

    FAVORITE_LABEL = FAVORITE_LABEL;

    scrollState: SCROLL_STATE;
    imageLoaded: boolean = false;

    lazy: boolean;

    imageUrl: string;

    isDarkTheme: boolean;

    // @ViewChild('image') imageRef: ElementRef;

    constructor(@Optional() private _infiniteList: InfiniteList,
                private _imageLoadingStrategy: ImageLoadingStrategy,
                private _darkThemeService: DarkThemeService) {
        this.lazy = !!_infiniteList;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('bangumi' in changes && changes['bangumi'].currentValue) {
            if (changes['bangumi'].currentValue !== changes['bangumi'].previousValue) {
                this.imageLoaded = false;
            }
            this.checkIfCanloadImage();
        }
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        if (this.lazy) {
            this._subscription.add(
                this._infiniteList.scrollStateChange
                    .subscribe(
                        (state) => {
                            this.scrollState = state;
                            if (state === SCROLL_STATE.SCROLLING) {
                                this.checkIfCanloadImage();
                            } else if (state === SCROLL_STATE.IDLE) {
                                this.checkIfCanloadImage();
                            }
                        }
                    )
            );
        }
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    onImageLoad() {
        this._imageLoadingStrategy.addLoadedUrl(this.bangumi.coverImage.url);
    }

    private checkIfCanloadImage() {
        if (this.imageLoaded || !this.isInit || !this.bangumi) {
            return;
        }
        if (!this.lazy) {
            this.imageUrl = this.bangumi.coverImage.url;
            return;
        }
        this.imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=';
        if (this._imageLoadingStrategy.hasLoaded(this.bangumi.coverImage.url)) {
            this.imageUrl = this.bangumi.coverImage.url;
        }
        if (this.scrollState === SCROLL_STATE.IDLE) {
            this._imageLoadDelayTimerId = window.setTimeout(() => {
                this.imageUrl = this.bangumi.coverImage.url;
            }, IMAGE_LOAD_DELAY);
        } else if (this.scrollState === SCROLL_STATE.SCROLLING) {
            clearTimeout(this._imageLoadDelayTimerId);
        }
    }
}
