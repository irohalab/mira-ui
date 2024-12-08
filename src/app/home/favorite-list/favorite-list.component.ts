
import { interval as observableInterval, Subscription, Subject } from 'rxjs';

import {mergeMap, map, take} from 'rxjs/operators';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HomeService } from '../home.service';
import { Bangumi } from '../../entity/bangumi';
import { Home } from '../home.component';
import { DARK_THEME, DarkThemeService, InfiniteList, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { CARD_HEIGHT_REM } from '../bangumi-card/bangumi-card.component';
import { getRemPixel } from '../../../helpers/dom';
import { BaseError } from '../../../helpers/error/BaseError';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

let lastType: number;
let lastScrollPosition: number = 0;
let lastSort: string;
let lastStatus: number;
let lastSortField: string;

@Component({
    selector: 'favorite-list',
    templateUrl: './favorite-list.html',
    styleUrls: ['./favorite-list.less'],
    standalone: false
})
export class FavoriteListComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _statusSubject = new Subject<number>();
    private _toastRef: UIToastRef<UIToastComponent>;
    private _favoriteList: Bangumi[];

    favoriteStatus = Bangumi.WATCHING;

    favoriteList: Bangumi[];

    isLoading = true;

    sort = 'desc';
    type = -1;
    sort_field = 'favorite_update_time';

    typeMenuLabel: {[idx: string]: string} = {
        '-1': '全部',
        '2': '动画',
        '6': '电视剧'
    };

    sortFieldLabel: {[k: string]: string} = {
        'favorite_update_time': '按我修改的时间',
        'eps_update_time': '按最近更新的时间',
        'air_date': '按开播时间'
    };

    cardHeight: number;
    timestampList: number[];

    lastScrollPosition: number;
    isDarkTheme: boolean;

    @ViewChild(InfiniteList, {static: true}) infiniteList: InfiniteList;

    constructor(private _homeService: HomeService,
                private _homeComponent: Home,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                titleService: Title) {
        titleService.setTitle(`我的收藏 - ${environment.siteTitle}`);
        if (window) {
            this.cardHeight = getRemPixel(CARD_HEIGHT_REM)
        }
        this._subscription.add(
            _homeComponent.sidebarToggle
                .subscribe(
                    () => {
                        if (this.infiniteList) {
                            setTimeout(() => {
                                this.infiniteList.requestMeasure();
                            });
                        }
                    }
                )
        );
        if (Number.isFinite(lastScrollPosition)) {
            this.lastScrollPosition = lastScrollPosition;
        }
        if (lastSort) {
            this.sort = lastSort;
        }
        if (Number.isInteger(lastType)) {
            this.type = lastType;
        }
        if (Number.isInteger(lastStatus)) {
            this.favoriteStatus = lastStatus;
        }
        if (lastSortField) {
            this.sort_field = lastSortField;
        }
        this._toastRef = toastService.makeText();
    }

    filterFavorites() {
        this.favoriteList = this._favoriteList
            .filter(bangumi => {
                if (this.type === -1) {
                    return true;
                }
                return bangumi.type === this.type;
            })
            .sort((bgm1: Bangumi, bgm2: Bangumi) => {
                if (this.sort_field === 'air_date' || bgm1[this.sort_field] === bgm2[this.sort_field]) {
                    let t1, t2;
                    t1 = bgm1.air_date ? Date.parse(bgm1.air_date).valueOf() : Date.now();
                    t2 = bgm2.air_date ? Date.parse(bgm2.air_date).valueOf() : Date.now();
                    return this.sort === 'asc' ? t1 - t2 : t2 - t1;
                }
                return this.sort === 'asc' ? bgm1[this.sort_field] - bgm2[this.sort_field] : bgm2[this.sort_field] - bgm1[this.sort_field];
            });
        this.timestampList = this._favoriteList
            .filter(bangumi => {
                if (this.type === -1) {
                    return true;
                }
                return bangumi.type === this.type;
            })
            .sort((bgm1: Bangumi, bgm2: Bangumi) => {
                if (this.sort_field === 'air_date' || bgm1[this.sort_field] === bgm2[this.sort_field]) {
                    let t1, t2;
                    t1 = bgm1.air_date ? Date.parse(bgm1.air_date).valueOf() : Date.now();
                    t2 = bgm2.air_date ? Date.parse(bgm2.air_date).valueOf() : Date.now();
                    return this.sort === 'asc' ? t1 - t2 : t2 - t1;
                }
                return this.sort === 'asc' ? bgm1[this.sort_field] - bgm2[this.sort_field] : bgm2[this.sort_field] - bgm1[this.sort_field];
            })
            .map(bangumi => {
                if (this.sort_field === 'air_date') {
                    return bangumi.air_date ? Date.parse(bangumi.air_date) : Date.now();
                } else {
                    return bangumi[this.sort_field];
                }

            });
    }

    onClickFilterContainer() {
        const step = 10;
        let totalDistance = lastScrollPosition;
        const co = totalDistance / ((step - 1) * (step -1));
        this._subscription.add(
            observableInterval(30).pipe(
                take(step),
                map((t) => {
                    return Math.floor(totalDistance - co * t * t);
                }),)
                .subscribe((d) => {
                    this.lastScrollPosition = d;
                })
        );
    }

    onOrderChange(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.sort === 'desc') {
            this.sort = 'asc';
        } else {
            this.sort = 'desc';
        }
        lastSort = this.sort;
        this.filterFavorites();
    }

    onTypeChange(type: number) {
        this.type = type;
        lastType = this.type;
        this.filterFavorites();
    }

    onSortFieldChange(sortField: string) {
        this.sort_field = sortField;
        lastSortField = this.sort_field;
        this.filterFavorites();
    }

    onScrollPositionChange(p: number) {
        lastScrollPosition = p;
    }

    onStatusChange(status: number) {
        this.favoriteStatus = status;
        lastStatus = this.favoriteStatus;
        this._statusSubject.next(lastStatus);
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME; })
        );
        this._subscription.add(
            this._statusSubject.asObservable().pipe(
                mergeMap((status) => {
                    this.isLoading = true;
                    return this._homeService.myBangumi(status);
                }))
                .subscribe((bangumiList) => {
                    this._favoriteList = bangumiList;
                    this.filterFavorites();
                    this.isLoading = false;
                },
                (error: BaseError) => {
                    this._toastRef.show(error.message);
                    this.isLoading = false;
                })
        );
        this._statusSubject.next(this.favoriteStatus);
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

}
