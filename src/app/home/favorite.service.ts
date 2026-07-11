import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FavoriteStatus } from '../entity/FavoriteStatus';
import { Observable } from 'rxjs';
import { Favorite } from '../entity/Favorite';
import { tap } from 'rxjs/operators';
import { Bangumi } from '../entity';
import { VideoPlayerService } from '../video-player/video-player.service';
import { environment } from '../../environments/environment';

export type FavoriteChangeEvent = {
    id: number;
    op: 'change' | 'remove';
    favorite: Partial<Favorite> | Favorite;
};

const baseUrl = `${environment.resourceProvider}/favorite`;

@Injectable({
    providedIn: 'root'
})
export class FavoriteService {
    constructor(private http: HttpClient,) {
    }

    favoriteChecked: EventEmitter<{bangumi_id: string, check_time: string}> = new EventEmitter<{bangumi_id: string, check_time: string}>();
    favoriteChanged: EventEmitter<FavoriteChangeEvent> = new EventEmitter<FavoriteChangeEvent>();

    /**
     * Generate a random id, should be only used for scenario with no penalty for collision.
     */
    getEventId(): number {
        return Math.random() * 100000;
    }

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

    addOrUpdateFavorite(changePayload: {bangumiId: string, status: FavoriteStatus, review: string, rating: number, syncToUpstream: boolean}, bangumi: Bangumi, eventId?: number) {
        return this.http.post<Favorite>(baseUrl, changePayload)
            .pipe(tap((fav: Favorite) => {
                fav.bangumi = Object.assign({}, bangumi);
                delete fav.bangumi.favorite;
                this.favoriteChanged.emit({
                    id: eventId ? eventId : this.getEventId(),
                    op: 'change',
                    favorite: fav
                })
            }));
    }

    changeFavorite(status: string, favoriteId: string, bangumi: Bangumi, eventId?: number): Observable<any> {
        return this.http.put<any>(`${baseUrl}/${favoriteId}`, null, {
            params: {
                status,
                syncToUpstream: true
            }
        })
            .pipe(tap((fav: Favorite) => {
                fav.bangumi = bangumi;
                this.favoriteChanged.emit({
                    id: eventId ? eventId : this.getEventId(),
                    op: 'change',
                    favorite: fav
                });
            }));
    }

    deleteFavorite(favoriteId: string, eventId?: number): Observable<any> {
        return this.http.delete<any>(`${baseUrl}/${favoriteId}`)
            .pipe(tap(() => {
                this.favoriteChanged.emit({
                    id: eventId ? eventId : this.getEventId(),
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
}
