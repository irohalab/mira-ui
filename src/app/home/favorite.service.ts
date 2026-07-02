import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
    externalFavoriteStatusToNumber,
    FavoriteStatus,
    favoriteStatusToNumber, isStatusEqual,
    NUMBER_TO_EXTERNAL_FAVORITE_STATUS,
    NUMBER_TO_FAVORITE_STATUS
} from '../entity/FavoriteStatus';
import { EMPTY, forkJoin, Observable, of } from 'rxjs';
import { Favorite } from '../entity/Favorite';
import { map, switchMap, tap } from 'rxjs/operators';
import { Bangumi } from '../entity';
import { VideoPlayerService } from '../video-player/video-player.service';
import { environment } from '../../environments/environment';
import {
    DefaultMira,
    Favorite as ExternalFavorite,
    FavoriteStatus as ExternalFavoriteStatus, SubItem, SubItemFavorite
} from '@irohalab/mira-sdk-angular';
import { ConflictDialogComponent } from './favorite-chooser/conflict-dialog/conflict-dialog.component';
import { UIDialog } from '@irohalab/deneb-ui';
import { WatchProgress } from '../entity/watch-progress';
import EpisodeTypeEnum = SubItem.EpisodeTypeEnum;

export type FavoriteChangeEvent = {
    op: 'change' | 'remove';
    favorite: Partial<Favorite> | Favorite;
};

const baseUrl = `${environment.resourceProvider}/favorite`;

@Injectable({
    providedIn: 'root'
})
export class FavoriteService {
    constructor(private http: HttpClient,
                private miraApiService: DefaultMira,
                private dialog: UIDialog,
                videoPlayerService: VideoPlayerService,) {
        videoPlayerService.onBangumiFavoriteChange
            .subscribe((bangumi) => {
                this.changeFavorite(bangumi.favorite.status, bangumi.favorite.id, bangumi).subscribe((favorite) => {console.log(favorite)});
            });
    }

    favoriteChecked: EventEmitter<{bangumi_id: string, check_time: string}> = new EventEmitter<{bangumi_id: string, check_time: string}>();
    favoriteChanged: EventEmitter<FavoriteChangeEvent> = new EventEmitter<FavoriteChangeEvent>();

    checkFavorite(bangumi_id: string) {
        this.http.post<any>(`${baseUrl}/check/${bangumi_id}`, null)
            .subscribe((data) => {
                this.favoriteChecked.emit({bangumi_id: bangumi_id, check_time: data.data});
                console.log(`bangumi ${bangumi_id} checked`);
            });
    }

    listFavorite(params: {status: FavoriteStatus,
        offset: number,
        limit: number,
        countUnwatched: boolean,
        enableEpsUpdateTime: boolean,
        orderBy: string,
        sort: string,
        coverImage: boolean}): Observable<{data: Favorite[], total: number}> {
        return this.http.get<{data: Favorite[], total: number}>(baseUrl, {
            params
        });
    }

    addOrUpdateFavorite(changePayload: {bangumiId: string, status: FavoriteStatus, review: string, rating: number, syncToUpstream: boolean}, bangumi: Bangumi) {
        return this.http.post<Favorite>(baseUrl, changePayload)
            .pipe(tap((fav: Favorite) => {
                fav.bangumi = Object.assign({}, bangumi);
                fav.bangumi.favorite = null;
                this.favoriteChanged.emit({
                    op: 'change',
                    favorite: fav
                })
            }));
    }

    changeFavorite(status: string, favoriteId: string, bangumi: Bangumi): Observable<any> {
        return this.http.put<any>(`${baseUrl}/${favoriteId}`, null, {
            params: {
                status,
                syncToUpstream: true
            }
        })
            .pipe(tap((fav: Favorite) => {
                fav.bangumi = bangumi;
                this.favoriteChanged.emit({
                    op: 'change',
                    favorite: fav
                });
            }));
    }

    deleteFavorite(favoriteId: string): Observable<any> {
        return this.http.delete<any>(`${baseUrl}/${favoriteId}`)
            .pipe(tap(() => {
                this.favoriteChanged.emit({
                    op: 'remove',
                    favorite: {id: favoriteId}
                });
            }));
    }

    syncFavorite(overrideOnConflict: boolean): Observable<any> {
        return this.http.post(`${baseUrl}/sync`, null, {
            params: {
                overrideOnConflict: `${overrideOnConflict}`
            }
        })
    }

    updateEpisodeProgress(bangumiId: string, subItemFavoriteList: SubItemFavorite[]): Observable<any> {
        return this.http.post<any>(`${baseUrl}/progress`, {
            subItemFavorites: subItemFavoriteList,
            bangumiId
        });
    }

    /**
     * Sync between local backend and external backend, prompt user to choose side if conflict occurs. return boolean to indicate whether a reload episodes is needed.
     * @param externalFavorite
     * @param subItemFavoriteList
     * @param bangumi
     */
    resolveConflict(externalFavorite: ExternalFavorite, subItemFavoriteList: SubItemFavorite[], bangumi: Bangumi): Observable<boolean> {
        if (bangumi.favorite) {
            if (externalFavorite) {
                const sfSet = new Set<string>(subItemFavoriteList
                    .filter(sf => sf.subItem.episodeType === EpisodeTypeEnum.Episode).map(sf => sf.subItem.id));

                let localEpisodeProgress = 0;
                const subItemStatusMapping: {[subItemId: string]: boolean} = {};
                let episodeStatusDifferent = false;
                for (const episode of bangumi.episodes) {
                    const watchProgress = episode.watchProgress;
                    if (watchProgress && watchProgress.watchStatus === WatchProgress.WATCHED) {
                        localEpisodeProgress++;
                        subItemStatusMapping[episode.subItemId] = true;
                        if (!sfSet.has(episode.subItemId)) {
                            episodeStatusDifferent = true;
                        }
                    } else {
                        subItemStatusMapping[episode.subItemId] = false;
                        if (sfSet.has(episode.subItemId)) {
                            episodeStatusDifferent = true;
                        }
                    }
                }

                if (!isStatusEqual(externalFavorite.status, bangumi.favorite.status) || episodeStatusDifferent) {
                    let conflictDialogRef = this.dialog.open(ConflictDialogComponent, {
                        stickyDialog: true,
                        backdrop: true
                    });
                    conflictDialogRef.componentInstance.bangumiName = bangumi.nameCn || bangumi.name;
                    conflictDialogRef.componentInstance.siteStatus = bangumi.favorite.status;
                    conflictDialogRef.componentInstance.externalStatus = externalFavorite.status;
                    conflictDialogRef.componentInstance.siteProgress = localEpisodeProgress;
                    conflictDialogRef.componentInstance.externalProgress = sfSet.size;
                    return conflictDialogRef.afterClosed()
                        .pipe(switchMap((which: 'site' | 'external') => {
                            if (which === 'site') {
                                return this.miraApiService.patchFavorite(externalFavorite.id, {
                                    status: NUMBER_TO_EXTERNAL_FAVORITE_STATUS[favoriteStatusToNumber(bangumi.favorite.status)] as ExternalFavoriteStatus
                                }).pipe(
                                    switchMap(() => {
                                        return this.miraApiService.syncSubItemFavoritesByFavoriteId(externalFavorite.id, {
                                            subItemStatusMapping
                                        })
                                    }),
                                    switchMap((res) => {
                                        return this.updateEpisodeProgress(bangumi.id, res.data);
                                    }),
                                    map(() => {
                                        return false;
                                    })
                                );
                            } else {
                                return this.changeFavorite(NUMBER_TO_FAVORITE_STATUS[externalFavoriteStatusToNumber(externalFavorite.status)], bangumi.favorite.id, bangumi)
                                    .pipe(
                                        switchMap((favorite) => {
                                            bangumi.favorite = favorite;
                                            return this.updateEpisodeProgress(bangumi.id, subItemFavoriteList);
                                        }),
                                        map(() => {
                                            return true;
                                        })
                                    );
                            }
                        }));
                }
            } else {
                return this.addOrUpdateFavorite({
                    bangumiId: bangumi.id,
                    status: bangumi.favorite.status,
                    rating: bangumi.favorite.rating || 0,
                    review: bangumi.favorite.reviewComment || '',
                    syncToUpstream: true
                }, bangumi)
                    .pipe(
                        switchMap((fav) => {
                            bangumi.favorite = fav;
                            return this.miraApiService.createSubItemFavorites({
                                subItemIdList: bangumi.episodes.filter(ep => {
                                    return ep.type === EpisodeTypeEnum.Episode && ep.watchProgress?.watchStatus === WatchProgress.WATCHED;
                                }).map(ep => ep.subItemId)
                            });
                        }),
                        switchMap((res) => {
                            return this.updateEpisodeProgress(bangumi.id, res.data);
                        }),
                        map(() => {
                            return false;
                        })
                    );
            }
        } else {
            if (externalFavorite) {
                return forkJoin([
                    this.addOrUpdateFavorite({
                        bangumiId: bangumi.id,
                        status: NUMBER_TO_FAVORITE_STATUS[externalFavoriteStatusToNumber(externalFavorite.status)] as FavoriteStatus,
                        rating: externalFavorite.rating || 0,
                        review: externalFavorite.reviewComment || '',
                        syncToUpstream: false
                    }, bangumi),
                    this.updateEpisodeProgress(bangumi.id, subItemFavoriteList)
                ])
                    .pipe(
                        tap(([fav, _]) => {
                            bangumi.favorite = fav;
                        }),
                        map(() => {
                            return true;
                        })
                    );
            }
        }
        return of(false);
    }
}
