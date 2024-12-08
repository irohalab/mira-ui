import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Optional,
    SimpleChanges,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { Bangumi } from '../../entity/bangumi';
import { FAVORITE_LABEL } from '../../entity/constants';
import { DARK_THEME, DarkThemeService, InfiniteList, SCROLL_STATE } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { ImageLoadingStrategy } from './image-loading-strategy.service';
import { Router } from '@angular/router';

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

    FAVORITE_LABEL = FAVORITE_LABEL;

    scrollState: SCROLL_STATE;
    imageLoaded: boolean = false;

    lazy: boolean;

    imageUrl: string;

    isDarkTheme: boolean;

    // @ViewChild('image') imageRef: ElementRef;

    constructor(@Optional() private _infiniteList: InfiniteList,
                private _router: Router,
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

    jumpTo(bangumi_id: string) {
        this._router.navigate(['/bangumi', bangumi_id]);
    }

    onImageLoad() {
        this._imageLoadingStrategy.addLoadedUrl(this.bangumi.cover_image.url);
    }

    private checkIfCanloadImage() {
        // let image = this.imageRef.nativeElement as HTMLImageElement;
        if (this.imageLoaded || !this.bangumi) {
            return;
        }
        // let {width, height} = BangumiCard.getImageDimension();
        // let imageUrl = `${this.bangumi.cover}?size=${width}x${height}`;
        if (!this.lazy) {
            this.imageUrl = this.bangumi.cover_image.url;
            return;
        }
        this.imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=';
        if (this._imageLoadingStrategy.hasLoaded(this.bangumi.cover_image.url)) {
            this.imageUrl = this.bangumi.cover_image.url;
        }
        if (this.scrollState === SCROLL_STATE.IDLE) {
            this._imageLoadDelayTimerId = window.setTimeout(() => {
                this.imageUrl = this.bangumi.cover_image.url;
            }, IMAGE_LOAD_DELAY);
        } else if (this.scrollState === SCROLL_STATE.SCROLLING) {
            clearTimeout(this._imageLoadDelayTimerId);
        }
    }

    // static getImageDimension(): { width: number, height: number } {
    //     return {
    //         width: getRemPixel(10),
    //         height: getRemPixel(13)
    //     };
    // }
}
