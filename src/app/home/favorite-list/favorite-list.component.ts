import { interval as observableInterval, Subject, Subscription } from 'rxjs';

import { map, mergeMap, take } from 'rxjs/operators';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HomeService } from '../home.service';
import { Home } from '../home.component';
import { DARK_THEME, DarkThemeService, InfiniteList, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { CARD_HEIGHT_REM } from '../bangumi-card/bangumi-card.component';
import { getRemPixel } from '../../../helpers/dom';
import { BaseError } from '../../../helpers/error';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { FavoriteStatus } from '../../entity/FavoriteStatus';
import { Favorite } from '../../entity/Favorite';
import { FavoriteService } from '../favorite.service';

let lastType: string;
let lastScrollPosition: number = 0;
let lastSort: string;
let lastStatus: FavoriteStatus;
let lastSortField: string;

@Component({
    selector: 'favorite-list',
    templateUrl: './favorite-list.html',
    styleUrls: ['./favorite-list.less'],
    standalone: false
})
export class FavoriteListComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _statusSubject = new Subject<FavoriteStatus>();
    private _toastRef: UIToastRef<UIToastComponent>;
    private _favoriteList: Favorite[];

    favoriteStatus = FavoriteStatus.WATCHING;
    eFavoriteStatus = FavoriteStatus;

    favoriteList: Favorite[];

    isLoading = true;

    sort = 'desc';
    type = 'all';
    orderBy = 'updateTime';

    typeMenuLabel: {[idx: string]: string} = {
        'all': '全部',
        'anime': '动画',
        'real': '电视剧'
    };

    sortFieldLabel: {[k: string]: string} = {
        'updateTime': '按我修改的时间',
        'eps_update_time': '按最近更新的时间',
        'airDate': '按开播时间'
    };

    cardHeight: number;
    timestampList: number[];

    lastScrollPosition: number;
    isDarkTheme: boolean;

    @ViewChild(InfiniteList, {static: true}) infiniteList: InfiniteList;

    constructor(private _homeService: HomeService,
                private _homeComponent: Home,
                private favoriteService: FavoriteService,
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
        // if (Number.isInteger(lastStatus)) {
        //     this.favoriteStatus = lastStatus;
        // }
        if (lastSortField) {
            this.orderBy = lastSortField;
        }
        this._toastRef = toastService.makeText();
    }

    filterFavorites() {
        this.favoriteList = this._favoriteList
            .filter(favorite => {
                if (this.type === 'all') {
                    return true;
                }
                return favorite.bangumi.type === this.type;
            })
            .sort(this.sortFunc);
        this.timestampList = this._favoriteList
            .filter(fav => {
                if (this.type === 'all') {
                    return true;
                }
                return fav.bangumi.type === this.type;
            })
            .sort(this.sortFunc)
            .map(fav => {
                if (this.orderBy === 'airDate') {
                    return fav.bangumi.airDate ? Date.parse(fav.bangumi.airDate) : Date.now();
                } else {
                    return fav.bangumi[this.orderBy] ? Date.parse(fav.bangumi[this.orderBy]) : Date.now();
                }

            });
    }

    sortFunc(fav1: Favorite, fav2: Favorite): number {
        let delta = 0;
        if (this.orderBy === 'air_date' || fav1[this.orderBy] === fav2[this.orderBy]) {
            delta = fav1.bangumi.airDate === fav2.bangumi.airDate ? 0 : (fav1.bangumi.airDate < fav2.bangumi.airDate ? -1 : 1);
            if (this.sort === 'desc') {
                delta = 0 - delta;
            }
        } else {
            delta = fav1[this.orderBy] === fav2[this.orderBy] ? 0 : (fav1[this.orderBy] < fav2[this.orderBy] ? -1 : 1);
            if (this.sort === 'desc') {
                delta = 0 - delta;
            }
        }
        return delta;
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

    onTypeChange(type: string) {
        this.type = type;
        lastType = this.type;
        this.filterFavorites();
    }

    onSortFieldChange(sortField: string) {
        this.orderBy = sortField;
        lastSortField = this.orderBy;
        this.filterFavorites();
    }

    onScrollPositionChange(p: number) {
        lastScrollPosition = p;
    }

    onStatusChange(status: FavoriteStatus) {
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
                    return this.favoriteService.listFavorite({
                        status,
                        offset: 0,
                        limit: -1,
                        countUnwatched: false,
                        enableEpsUpdateTime: true,
                        coverImage: true
                    });
                }))
                .subscribe({
                    next: ({data, total}) => {
                    this._favoriteList = data;
                    this.filterFavorites();
                    this.isLoading = false;
                },
                error: (error: BaseError) => {
                    this._toastRef.show(error.message);
                    this.isLoading = false;
                }})
        );
        this._statusSubject.next(this.favoriteStatus);
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

}
