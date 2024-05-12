
import { fromEvent as observableFromEvent, Subscription } from 'rxjs';

import {filter, tap, mergeMap} from 'rxjs/operators';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HomeChild, HomeService } from "../home.service";
import { Bangumi, Episode, User } from "../../entity";
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PersistStorage, UserService } from '../../user-service';
import { ChromeExtensionService, ENABLED_STATUS } from '../../browser-extension/chrome-extension.service';
import { DARK_THEME, DarkThemeService, UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { AuthError } from '../../../helpers/error';
import { WatchService } from '../watch.service';
import { environment } from '../../../environments/environment';

const LAYOUT_TYPE: string = 'layout_type';
const LAYOUT_TYPES = {
    GRID: 'grid_layout',
    LIST: 'list_layout'
}

const SORT_ORDER: string = 'bangumi_detail_eps_sort_order';

@Component({
    selector: 'view-bangumi-detail',
    templateUrl: './bangumi-detail.html',
    styleUrls: ['./bangumi-detail.less']
})
export class BangumiDetail extends HomeChild implements OnInit, OnDestroy {
    private _toastRef: UIToastRef<UIToastComponent>;
    private _subscription = new Subscription();
    private _coverExpanded = false;

    user: User;

    bangumi: Bangumi;

    orientation: 'landscape' | 'portrait';
    coverRevealerHeight: string;

    @ViewChild('bangumiCover', {static: false}) bangumiCoverRef: ElementRef;

    isExtraInfoEnabled = false;
    extraInfo: any;

    isDarkTheme: boolean;

    layoutType: string;
    eLayoutTypes = LAYOUT_TYPES;
    sortOrder: 'asc' | 'desc' = 'asc';

    private _reversedEpisodeList: Episode[];
    get episodeList(): Episode[] {
        if (this.sortOrder === 'desc') {
            if (!this._reversedEpisodeList) {
                let firstUnfinished = -1;
                this._reversedEpisodeList = this.bangumi.episodes
                    .filter((eps, index) => {
                        if (firstUnfinished === -1 && eps.status !== Episode.STATUS_DOWNLOADED) {
                            firstUnfinished = index;
                            return true;
                        }
                        return eps.status === Episode.STATUS_DOWNLOADED
                    })
                    .reverse();
            }
            return this._reversedEpisodeList;
        } else {
            return this.bangumi.episodes;
        }
    }

    constructor(homeService: HomeService,
                userService: UserService,
                private _darkThemeService: DarkThemeService,
                private _chromeExtensionService: ChromeExtensionService,
                private _dialog: UIDialog,
                private _route: ActivatedRoute,
                private _titleService: Title,
                private _changeDetector: ChangeDetectorRef,
                private _watchService: WatchService,
                private _persistStorage: PersistStorage,
                toast: UIToast) {
        super(homeService);
        this._toastRef = toast.makeText();
        this._subscription.add(
            userService.userInfo
                .subscribe(user => {
                    this.user = user;
                })
        );
    }

    toggleSortOrder(): void {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        this._persistStorage.setItem(SORT_ORDER, this.sortOrder);
    }

    toggleCover() {
        if (this._coverExpanded) {
            this.checkViewport();
        } else {
            this.coverRevealerHeight = (this.bangumiCoverRef.nativeElement.clientHeight - 14) + 'px';
        }
        this._coverExpanded = !this._coverExpanded;
    }

    reloadEpisodes() {
        this._subscription.add(
            this.homeService.bangumi_detail(this.bangumi.id)
                .subscribe(bangumi => {
                    this.bangumi.episodes = bangumi.episodes;
                    this._changeDetector.detectChanges();
                })
        );
    }

    changeLayoutType(layoutType: string): void {
        this.layoutType = layoutType;
        this._persistStorage.setItem(LAYOUT_TYPE, layoutType);
    }

    ngOnInit(): void {
        this.layoutType = this._persistStorage.getItem(LAYOUT_TYPE, LAYOUT_TYPES.LIST);
        this.sortOrder = this._persistStorage.getItem(SORT_ORDER, 'asc') as 'asc' | 'desc';
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this._subscription.add(
            this._route.params.pipe(
                mergeMap((params) => {
                    return this.homeService.bangumi_detail(params['bangumi_id']);
                }),
                tap(bangumi => {
                    this.homeService.checkFavorite(bangumi.id);
                }),
                mergeMap(bangumi => {
                    let bgmTitle = `${bangumi.name} - ${environment.siteTitle}`;
                    this._titleService.setTitle(bgmTitle);
                    this.bangumi = bangumi;
                    return this._chromeExtensionService.isEnabled
                }),
                tap(isEnabled => {
                    this.isExtraInfoEnabled = isEnabled === ENABLED_STATUS.TRUE;
                }),
                filter(isEnabled => isEnabled === ENABLED_STATUS.TRUE),
                mergeMap(() => {
                    return this._chromeExtensionService.invokeBangumiMethod('bangumiDetail', [this.bangumi.bgm_id]);
                }),)
                .subscribe({
                    next: (extraInfo) => {
                        // console.log(extraInfo);
                        this.extraInfo = extraInfo;
                    },
                    error: (error) => {
                        console.log(error);
                        if (error instanceof AuthError && (error as AuthError).isPermission()) {
                            this._toastRef.show('没有权限');
                        } else {
                            this._toastRef.show(error.message);
                        }
                    }
                })
        );
        this.checkViewport();

        this._subscription.add(
            observableFromEvent(window, 'resize')
                .subscribe(
                    () => {
                        this.checkViewport();
                    }
                )
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    private checkViewport() {
        let viewportWidth = window.innerWidth;
        let viewportHeight = window.innerHeight;
        if (viewportWidth < 768) {
            this.orientation = 'portrait';
            this.coverRevealerHeight = Math.round(viewportHeight / 4) + 'px';
        } else {
            this.orientation = 'landscape';
            this.coverRevealerHeight = 0 + '';
        }
    }
}
