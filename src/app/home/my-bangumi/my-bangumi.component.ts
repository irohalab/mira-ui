import { Component, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { distinct, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { closest } from '../../../helpers/dom';
import { WatchProgress } from '../../entity/watch-progress';
import { VideoPlayerService } from '../../video-player/video-player.service';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Favorite } from '../../entity/Favorite';
import { FavoriteStatus } from '../../entity/FavoriteStatus';
import { WatchService } from '../watch.service';
import { FavoriteService } from '../favorite.service';
import { UserService } from '../../user-service';
import { User } from '../../entity';

@Component({
    selector: 'my-bangumi',
    templateUrl: './my-bangumi.html',
    styleUrls: ['./my-bangumi.less'],
    standalone: false
})
export class MyBangumiComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    favoriteList: Favorite[];

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private favoriteService: FavoriteService,
                private userService: UserService,
                private watchService: WatchService,
                private darkThemeService: DarkThemeService,
                private videoPlayerService: VideoPlayerService) {
        this.favoriteList = [];
    }

    @HostListener('click', ['$event'])
    onHostClick(event: Event) {
        let parent = closest(event.target, '.favorite-item');
        if (!parent) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => {
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
        this.subscription.add(
            this.videoPlayerService.onWatchStatusChanges
                .pipe(filter(episode => {
                    return episode.watchProgress
                        && (episode.watchProgress.watchStatus === WatchProgress.WATCHED
                            || episode.watchProgress.watchStatus === WatchProgress.WATCHING);
                }))
                .subscribe(episode => {
                    let bangumi = this.favoriteList.find(bangumi => bangumi.id === episode.bangumi.id);
                    if (bangumi && bangumi.unwatchedCount > 0) {
                        bangumi.unwatchedCount--;
                    }
                })
        );

        /**
         * We update my-bangumi list without refetch the resource from server due to the delay of refreshed data.
         * sometimes, this method is executed before the write operation is done at the backend.
         */

        this.subscription.add(
            this.favoriteService.favoriteChanged
                .subscribe(event => {
                    if (event.op === 'remove') {
                        for (let i = 0; i < this.favoriteList.length; ++i) {
                            if (event.favorite.id === this.favoriteList[i].id) {
                                this.favoriteList.splice(i, 1);
                                break;
                            }
                        }
                    } else if (event.op === 'change') {
                        const favorite = event.favorite as Favorite;
                        let found = false;
                        for (let i = 0; i < this.favoriteList.length; i++) {
                            if (this.favoriteList[i].id === favorite.id) {
                                if (favorite.status !== FavoriteStatus.WATCHING) {
                                    this.favoriteList.splice(i, 1);
                                } else {
                                    this.favoriteList[i] = favorite;
                                }
                                found = true;
                                break;
                            }
                        }
                        if (!found && favorite.status === FavoriteStatus.WATCHING) {
                            this.favoriteList.unshift(favorite);
                        }
                    }
                })
        );

        this.subscription.add(
            this.userService.userInfo.pipe(
                distinct(({id}) => id),
                filter((user) => user.id !== User.ID_INITIAL_USER && user.role !== User.GUEST_ROLE),
                switchMap(() => {
                    return this.favoriteService.listFavorite({
                        status: FavoriteStatus.WATCHING,
                        offset: 0,
                        limit: -1,
                        countUnwatched: true,
                        enableEpsUpdateTime: true,
                        coverImage: false
                    });
                })
            )
                .subscribe(({data, total}) => {
                    this.favoriteList = data;
                    console.log(data);
                })
        );

        this.subscription.add(
            this.favoriteService.favoriteChecked
                .subscribe((result) => {
                    let favorite = this.favoriteList.find(fav => fav.bangumi.id === result.bangumi_id);
                    if (favorite) {
                        favorite.checkTime = result.check_time;
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
