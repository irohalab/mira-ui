import { interval as observableInterval, lastValueFrom, Subscription } from 'rxjs';

import { map, take, tap } from 'rxjs/operators';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HomeChild, HomeService } from '../home.service';
import { Bangumi } from '../../entity';
import { ActivatedRoute } from '@angular/router';
import {
    DARK_THEME,
    DarkThemeService,
    InfiniteDataBucketsStub,
    InfiniteList,
    UIToast,
    UIToastComponent,
    UIToastRef
} from '@irohalab/deneb-ui';
import { CARD_HEIGHT_REM } from '../bangumi-card/bangumi-card.component';
import { getRemPixel } from '../../../helpers/dom';
import { Home } from '../home.component';
import { BangumiListService } from './bangumi-list.service';
import { groupByQuarters } from '../../../helpers/TimelineListHelpers';

@Component({
    selector: 'bangumi-list',
    templateUrl: './bangumi-list.html',
    styleUrls: ['./bangumi-list.less'],
    standalone: false
})
export class BangumiList extends HomeChild implements OnInit, OnDestroy {

    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private _isMovie: boolean;

    name: string;

    isLoading = true;

    sort!: string;
    type!: string;

    bangumiList: Bangumi[] = [];

    typeMenuLabel: { [idx: string]: string } = {
        all: '全部',
        anime: '动画',
        real: '电视剧'
    };

    cardHeight: number;

    get timestampList(): number[] {
        return this.bangumiListService.timelineCache[this.stubCacheKey];
    }

    lastScrollPosition: number;

    isDarkTheme: boolean;

    get stubCacheKey(): string {
        return `${this.type}_${this.isMovie ? 'movie' : 'all'}_${this.sort}`;
    }

    get bucketsStub(): InfiniteDataBucketsStub {
        return this.bangumiListService.bucketsStubCache[this.stubCacheKey];
    }

    get isMovie(): boolean {
        if (typeof this.bangumiListService.isMovie !== 'undefined') {
            return this.bangumiListService.isMovie;
        }
        return this._isMovie;
    }

    set isMovie(v: boolean) {
        this._isMovie = v;
        this.bangumiListService.isMovie = v;
        this.loadTimeline();
    }

    @ViewChild(InfiniteList, {static: true}) infiniteList: InfiniteList;

    constructor(homeService: HomeService,
                private darkThemeService: DarkThemeService,
                home: Home,
                private activatedRoute: ActivatedRoute,
                private bangumiListService: BangumiListService,
                toastService: UIToast) {
        super(homeService);
        this.toastRef = toastService.makeText();
        if (window) {
            this.cardHeight = getRemPixel(CARD_HEIGHT_REM)
        }
        this.subscription.add(
            home.sidebarToggle
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
        if (Number.isFinite(this.bangumiListService.scrollPosition)) {
            this.lastScrollPosition = this.bangumiListService.scrollPosition;
        }
        if (this.bangumiListService.sort) {
            this.sort = this.bangumiListService.sort;
        }
        if (this.bangumiListService.type) {
            this.type = this.bangumiListService.type;
        }
    }

    onClickFilterContainer() {
        const step = 10;
        let totalDistance = this.bangumiListService.scrollPosition;
        const co = totalDistance / ((step - 1) * (step - 1));
        this.subscription.add(
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

    onScrollPositionChange(p: number) {
        this.bangumiListService.scrollPosition = p;
    }

    searchBangumi() {
        this.isLoading = true;
        this.subscription.add(
            this.homeService.listBangumi({
                keyword: this.name,
                offset: 0,
                limit: 100,
                orderBy: 'airDate',
                sort: 'desc'
            })
                .subscribe({
                    next: ({data, total}) => {
                        this.bangumiList = data;
                        this.isLoading = false;
                    }, error: err => {
                        this.toastRef.show(err.message || 'Server Error');
                        this.isLoading = false;
                    }
                })
        );
    }

    loadTimeline() {
        this.isLoading = true;
        if (!this.bucketsStub) {
            console.log('no bucketsStub');
            this.subscription.add(
                this.homeService.timeline(this.sort, this.type, this.isMovie ? 1 : undefined)
                    .subscribe((timeline) => {
                        this.bangumiListService.timelineCache[this.stubCacheKey] = timeline;
                        const buckets = groupByQuarters(timeline);
                        console.log(buckets);
                        this.bangumiListService.bucketsStubCache[this.stubCacheKey] = new InfiniteDataBucketsStub(buckets, this, this.onLoadBucket);
                        this.bangumiList = [];
                        this.isLoading = false;
                    }));
        } else {
            console.log('has bucketsStub', this.bucketsStub);
            this.bucketsStub.buckets.forEach((bucket) => {
                bucket.filled = false;
                bucket.fetching = false;
            });
            this.bangumiList = [];
            this.isLoading = false;
        }
    }

    onLoadBucket(bucketIndex: number): Promise<Iterable<any>> {
        const bucket = this.bucketsStub.buckets[bucketIndex];
        console.log('offset: ' + bucket.start + ' limit: ' + (bucket.end - bucket.start + 1));
        const options: any = {
            offset: bucket.start,
            limit: bucket.end - bucket.start + 1,
            orderBy: 'air_date',
            sort: this.sort
        };
        if (this.isMovie) {
            options.eps = 1;
        }

        if (this.type !== 'all') {
            options.type = this.type;
        }

        const cachedBangumiList = this.bangumiListService.tryGetBangumi(this.stubCacheKey, bucket.start, bucket.end);
        console.log(cachedBangumiList);
        if (cachedBangumiList) {
            return Promise.resolve(cachedBangumiList);
        }

        return lastValueFrom(this.homeService.listBangumi(options)
            .pipe(
                map((result) => result.data),
                tap((bangumiList => {
                    const length = this.timestampList.length;
                    this.bangumiListService.cacheBangumiIds(this.stubCacheKey, bucket.start, length, bangumiList);
                }))
            ));
    }

    onOrderChange(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.sort === 'desc') {
            this.sort = 'asc';
        } else {
            this.sort = 'desc';
        }
        this.bangumiListService.sort = this.sort;
        this.loadTimeline();
    }

    onTypeChange(type: string) {
        this.type = type;
        this.bangumiListService.type = this.type;
        this.loadTimeline();
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => {
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
        this.subscription.add(
            this.activatedRoute.params
                .subscribe((params) => {
                    this.name = params['name'];
                    if (this.name) {
                        this.searchBangumi();
                    } else {
                        this.loadTimeline();
                    }
                })
        );
    }


    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
