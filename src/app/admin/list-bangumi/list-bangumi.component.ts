import { lastValueFrom, Subscription } from 'rxjs';

import { map } from 'rxjs/operators';
import { Component, ElementRef, HostBinding, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { getRemPixel } from '../../../helpers/dom';
import {
    DARK_THEME,
    DarkThemeService,
    InfiniteDataBucketsStub,
    UIDialog,
    UIToast,
    UIToastComponent,
    UIToastRef
} from '@irohalab/deneb-ui';
import { CARD_HEIGHT_REM } from '../bangumi-card/bangumi-card.component';
import { SearchBangumi } from '../search-bangumi';
import { ListBangumiService } from './list-bangumi.service';
import { environment } from '../../../environments/environment';
import { BangumiRaw } from '../../entity/BangumiRaw';
import { groupByQuarters } from '../../../helpers/TimelineListHelpers';

@Component({
    selector: 'list-bangumi',
    templateUrl: './list-bangumi.html',
    styleUrls: ['./list-bangumi.less'],
    standalone: false
})
export class ListBangumi implements OnDestroy, OnInit {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    private _isMovie: boolean;

    @ViewChild('searchBox', {static: false}) searchBox: ElementRef;

    name: string;
    total: number = 0;
    orderBy!: string;
    sort!: string;
    type!: number;

    orderByMenuLabel: {[key: string]:string} = {
        createTime: '按创建时间',
        updateTime: '按修改时间',
        airDate: '按开播日期'
    };

    typeMenuLabel: {[key: number]:string} = {
        0: '全部',
        2: '动画',
        6: '电视剧'
    };

    bangumiList: BangumiRaw[] = [];
    bucketsStub: InfiniteDataBucketsStub;

    isLoading: boolean = false;

    cardHeight: number;
    timestampList: number[];

    lastScrollPosition: number;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    get isMovie(): boolean {
        if (typeof this._listBangumiService.isMovie !== 'undefined') {
            return this._listBangumiService.isMovie;
        }
        return this._isMovie;
    }

    set isMovie(v: boolean) {
        this._isMovie = v;
        this._listBangumiService.isMovie = v;
        this.loadFromServer();
    }

    constructor(private adminService: AdminService,
                private router: Router,
                private _dialog: UIDialog,
                private _listBangumiService: ListBangumiService,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                titleService: Title) {
        titleService.setTitle('新番管理 - ' + environment.siteTitle);
        this._toastRef = toastService.makeText();
        if (window) {
            this.cardHeight = getRemPixel(CARD_HEIGHT_REM)
        }
        if (Number.isFinite(this._listBangumiService.scrollPosition)) {
            this.lastScrollPosition = this._listBangumiService.scrollPosition;
        }
        if (this._listBangumiService.sort) {
            this.sort = this._listBangumiService.sort;
        }
        if (this._listBangumiService.orderBy) {
            this.orderBy = this._listBangumiService.orderBy;
        }
        this.type = this._listBangumiService.type;
    }

    onScrollPositionChange(p: number) {
        this._listBangumiService.scrollPosition = p;
    }

    onOrderChange(orderBy: string, isSortChange: boolean) {
        this.orderBy = orderBy;
        if (isSortChange) {
            this.sort = this.sort === 'desc' ? 'asc' : 'desc';
        }
        this._listBangumiService.orderBy = this.orderBy;
        this._listBangumiService.sort = this.sort;
        this.loadFromServer();
    }

    onTypeChange(type: number) {
        this.type = type;
        this._listBangumiService.type = this.type;
        this.loadFromServer();
    }

    addBangumi(): void {
        let dialogRef = this._dialog.open(SearchBangumi, {stickyDialog: true, backdrop: true});
        this._subscription.add(
            dialogRef.afterClosed()
                .subscribe(
                    (result: any) => {
                        console.log(result);
                        if (result === 'cancelled') {
                            return;
                        }

                        this.router.navigate(['/admin/bangumi', result as string]);
                    }
                )
        );
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME})
        );
        this.loadFromServer();
    }

    onFilterAction(): void {
        const searchBoxElement = this.searchBox.nativeElement;
        this.name = searchBoxElement.value;
        if (this.name) {
            this.searchFromServer();
        } else {
            this.loadFromServer();
        }
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    private searchFromServer(): void {
        this.isLoading = true;
        const eps = this.isMovie ? 1 : -1;
        const options: any = {
            offset: 0,
            limit: 100,
            orderBy: this.orderBy,
            sort: this.sort,
            keyword: this.name,
            type: this.type,
        }
        this._subscription.add(
            this.adminService.listBangumi(options)
                .subscribe({
                    next: result => {
                        this.bangumiList = result.data;
                        this.isLoading = false;
                    },
                    error: err => {
                        this._toastRef.show(err.message || 'Server Error');
                        this.bangumiList = [];
                        this.isLoading = false;
                    }
                })
        );
    }

    private loadFromServer() {
        this.isLoading = true;
        const eps = this.isMovie ? 1 : -1;
        this._subscription.add(
            this.adminService.getTimeline({
                type: this.type,
                orderBy: this.orderBy,
                sort: this.sort,
                eps
            }).subscribe({
                next: (result) => {
                    this.timestampList = result;
                    const buckets = groupByQuarters(result);
                    this.bucketsStub = new InfiniteDataBucketsStub(buckets, this, this.onLoadBucket);
                    this.bangumiList = [];
                    this.isLoading = false
                },
                error: (err) => {
                    console.log(err);
                    this._toastRef.show(err.message);
                    this.isLoading = false
                }
            })
        );
    }

    private onLoadBucket(bucketIndex: number): Promise<Iterable<any>> {
        const bucket = this.bucketsStub.buckets[bucketIndex];
        const options: any = {
            offset: bucket.start,
            limit: bucket.end - bucket.start + 1,
            orderBy: this.orderBy,
            sort: this.sort,
        }

        if (this.isMovie) {
            options.eps = 1;
        }

        if (this.type !== 0) {
            options.type = this.type;
        }

        return lastValueFrom(this.adminService.listBangumi(options).pipe(map(res => res.data)));
    }

    public editBangumi(bangumi: BangumiRaw): void {
        this.router.navigate(['/admin/bangumi', bangumi.id]);
    }

    // filterBangumiList() {
    //     if (!this._allBangumiList) {
    //         return;
    //     }
    //     this.bangumiList = this._allBangumiList
    //         .filter(bangumi => {
    //             if (this.isMovie) {
    //                 return bangumi.eps === 1;
    //             }
    //             return true;
    //         })
    //         .filter(bangumi => {
    //             if (this.type === 0) {
    //                 return true;
    //             }
    //             return bangumi.type === this.type;
    //         })
    //         .filter(bangumi => {
    //             if (this.name) {
    //                 return Bangumi.containKeyword(bangumi, this.name);
    //             }
    //             return true;
    //         })
    //         .sort((bgm1: Bangumi, bgm2: Bangumi) => {
    //             let t1, t2;
    //             if (this.orderBy === 'air_date') {
    //                 t1 = bgm1.airDate ? Date.parse(bgm1.airDate).valueOf() : Date.now();
    //                 t2 = bgm2.airDate ? Date.parse(bgm2.airDate).valueOf() : Date.now();
    //             } else {
    //                 t1 = bgm1[this.orderBy];
    //                 t2 = bgm2[this.orderBy];
    //             }
    //             return this.sort === 'asc' ? t1 - t2 : t2 - t1;
    //         });
    // }

}
