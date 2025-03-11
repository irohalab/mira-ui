import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FavoriteStatus } from '../entity/FavoriteStatus';
import { Observable } from 'rxjs';
import { Favorite } from '../entity/Favorite';
import { tap } from 'rxjs/operators';
import { Bangumi } from '../entity';
import { VideoPlayerService } from '../video-player/video-player.service';

export type FavoriteChangeEvent = {
    op: 'change' | 'remove';
    favorite: Partial<Favorite> | Favorite;
};

@Injectable()
export class FavoriteService {
    constructor(private http: HttpClient,
                videoPlayerService: VideoPlayerService,) {
        videoPlayerService.onBangumiFavoriteChange
            .subscribe((bangumi) => {
                this.changeFavorite(bangumi.favorite.status, bangumi).subscribe((favorite) => {console.log(favorite)});
            });
    }

    favoriteChecked: EventEmitter<{bangumi_id: string, check_time: string}> = new EventEmitter<{bangumi_id: string, check_time: string}>();
    favoriteChanged: EventEmitter<FavoriteChangeEvent> = new EventEmitter<FavoriteChangeEvent>();

    checkFavorite(bangumi_id: string) {
        this.http.post<any>(`/api/favorite/check/${bangumi_id}`, null)
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
        coverImage: boolean}): Observable<{data: Favorite[], total: number}> {
        return this.http.get<{data: Favorite[], total: number}>('/api/favorite', {
            params
        });
    }

    changeFavorite(status: string, bangumi: Bangumi): Observable<Favorite> {
        return this.http.post<any>('/api/favorite', null, {
            params: {
                bangumi_id: bangumi.id,
                status
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
        return this.http.delete<any>(`/api/favorite/${favoriteId}`)
            .pipe(tap(() => {
                this.favoriteChanged.emit({
                    op: 'remove',
                    favorite: {id: favoriteId}
                });
            }));
    }
}
