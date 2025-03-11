import { fromEvent as observableFromEvent, Subscription } from 'rxjs';

import { map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HomeChild, HomeService } from "../home.service";
import { Bangumi, Episode, User } from "../../entity";
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { PersistStorage, UserService } from '../../user-service';
import { DARK_THEME, DarkThemeService, UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { AuthError } from '../../../helpers/error';
import { WatchService } from '../watch.service';
import { environment } from '../../../environments/environment';
import { FavoriteService } from '../favorite.service';

const LAYOUT_TYPE: string = 'layout_type';
const LAYOUT_TYPES = {
    GRID: 'grid_layout',
    LIST: 'list_layout'
}

const SORT_ORDER: string = 'bangumi_detail_eps_sort_order';

@Component({
    selector: 'view-bangumi-detail',
    templateUrl: './bangumi-detail.html',
    styleUrls: ['./bangumi-detail.less'],
    standalone: false
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
                private userService: UserService,
                private darkThemeService: DarkThemeService,
                private dialog: UIDialog,
                private route: ActivatedRoute,
                private titleService: Title,
                private changeDetector: ChangeDetectorRef,
                private favoriteService: FavoriteService,
                private watchService: WatchService,
                private persistStorage: PersistStorage,
                toast: UIToast) {
        super(homeService);
        this._toastRef = toast.makeText();
    }

    toggleSortOrder(): void {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        this.persistStorage.setItem(SORT_ORDER, this.sortOrder);
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
                    this.changeDetector.detectChanges();
                })
        );
    }

    changeEpStatus(episode: Episode, status: number): void {
        this._subscription.add(
            this.watchService.updateEpisodeWatchStatus(
                this.bangumi.id,
                episode.id,
                status)
                .subscribe((watchProgress) => {
                    episode.watchProgress = watchProgress;
                    this._toastRef.show('已更新');
                })
        );
    }

    changeLayoutType(layoutType: string): void {
        this.layoutType = layoutType;
        this.persistStorage.setItem(LAYOUT_TYPE, layoutType);
    }

    ngOnInit(): void {
        this.layoutType = this.persistStorage.getItem(LAYOUT_TYPE, LAYOUT_TYPES.LIST);
        this.sortOrder = this.persistStorage.getItem(SORT_ORDER, 'asc') as 'asc' | 'desc';
        this._subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this._subscription.add(
            this.route.params.pipe(
                switchMap((params) => {
                    return this.userService.userInfo.pipe(map((user) => {
                        this.user = user;
                        return {bangumiId: params['bangumi_id'], user};
                    }))
                }),
                mergeMap((params) => {
                    return this.homeService.bangumi_detail(params.bangumiId);
                }),
                tap(bangumi => {
                    if (this.user.id !== User.ID_INITIAL_USER && this.user.role !== User.GUEST_ROLE) {
                        this.favoriteService.checkFavorite(bangumi.id);
                    }
                }),)
                .subscribe({
                    next: (bangumi) => {
                        let bgmTitle = `${bangumi.name} - ${environment.siteTitle}`;
                        this.titleService.setTitle(bgmTitle);
                        this.bangumi = bangumi;
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

    protected readonly User = User;
}
