import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { BaseService } from '../../helpers/base.service';
import { PersistStorage } from '../user-service';
import { WatchProgress } from '../entity/watch-progress';
import { environment } from '../../environments/environment';
import { Favorite } from '../entity/Favorite';
import { FavoriteService } from './favorite.service';
import { Bangumi, Episode } from '../entity';

export const PREFIX = 'watch_history';

export const TASK_INTERVAL = 3 * 60 * 1000;

export const WATCH_HISTORY_RECORD_VERSION = 2;
export interface WatchHistoryRecord {
    bangumiId: string;
    episodeId: string;
    lastWatchPosition: number;
    lastWatchTime: string;
    percentage: number;
    isFinished: boolean;
    version: number;
}

const baseUrl = `${environment.resourceProvider}/episode`;

@Injectable({
    providedIn: 'root'
})
export class WatchService extends BaseService {

    constructor(private http: HttpClient, private _persistStorage: PersistStorage,
                private favoriteService: FavoriteService) {
        super();
        this.synchronizeWatchProgress();
        this.runPeriodTask();
    }

    /**
     * WatchProgress can be non-persistent temporary object.
     */
    watchProgressChanged: EventEmitter<WatchProgress> = new EventEmitter<WatchProgress>();

    updateEpisodeWatchStatus(bangumiId: string, episodeId: string, watchStatus: number): Observable<WatchProgress> {
        return this.http.post<any>(`${baseUrl}/watch`, {
            bangumi: {id: bangumiId},
            episode: {id: episodeId},
            watchStatus,
        }).pipe(
            tap((watchProgress: WatchProgress) => {
                this.watchProgressChanged.emit(watchProgress);
            }),
            catchError(this.handleError),);
    }

    list_history(offset: number, limit: number): Observable<{data: WatchProgress[], total: number}> {
        return this.http.get<{data: WatchProgress[], total: number}>(`${baseUrl}/watch/history`, {
            params: {
                offset,
                limit
            }
        }).pipe(catchError(this.handleError));
    }

    updateWatchProgress(bangumiId: string, episodeId: string, lastWatchPosition: number, percentage: number, isFinished: boolean): void {
        const watchHistoryRecord: WatchHistoryRecord = {
            bangumiId: bangumiId,
            episodeId: episodeId,
            lastWatchPosition: lastWatchPosition,
            lastWatchTime: new Date().toISOString(),
            isFinished: isFinished,
            percentage: percentage,
            version: WATCH_HISTORY_RECORD_VERSION
        };
        const wp = new WatchProgress();
        wp.watchStatus = isFinished ? WatchProgress.WATCHED : WatchProgress.WATCHING;
        wp.bangumi = {id: bangumiId} as Bangumi;
        wp.episode = {id: episodeId} as Episode;
        wp.bangumi_id = bangumiId;
        wp.episode_id = episodeId;
        wp.lastWatchPosition = lastWatchPosition;
        wp.lastWatchTime = watchHistoryRecord.lastWatchTime;
        wp.percentage = percentage;
        this.watchProgressChanged.emit(wp);
        this._persistStorage.setItem(`${PREFIX}:${episodeId}`, JSON.stringify(watchHistoryRecord));
    }

    getLocalWatchHistory(episode_id: string): WatchHistoryRecord | null {
        let recordStr = this._persistStorage.getItem(`${PREFIX}:${episode_id}`, null);
        if (recordStr) {
            const record = JSON.parse(recordStr) as WatchHistoryRecord;
            return record.version === WATCH_HISTORY_RECORD_VERSION ? record : null;
        }
        return null;
    }

    synchronizeWatchProgress(): void {
        let iterator = this._persistStorage.iterator();
        let watchHistoryRecords: WatchHistoryRecord[] = [];
        for (const item of iterator) {
            if(this._persistStorage.startsWith(item.key, PREFIX) && item.value) {
                const record = JSON.parse(item.value) as WatchHistoryRecord;
                if (record.version === WATCH_HISTORY_RECORD_VERSION) {
                    watchHistoryRecords.push(record);
                }
            }
        }
        if (watchHistoryRecords.length === 0) {
            return;
        }
        this.http.post<{changedFavorites: Favorite[]}>(`${baseUrl}/watch/sync`, {
            records: watchHistoryRecords
        }).pipe(
            catchError(this.handleError),)
            .subscribe({
                next: ({changedFavorites}) => {
                    if (changedFavorites.length > 0) {
                        for (const favorite of changedFavorites) {
                            this.favoriteService.favoriteChanged.emit({
                                id: this.favoriteService.getEventId(),
                                op: 'change',
                                favorite: favorite
                            });
                        }
                    }
                    watchHistoryRecords.forEach(record => {
                        let key = `${PREFIX}:${record.episodeId}`;
                        let recordInStorageStr = this._persistStorage.getItem(key, null);
                        if (recordInStorageStr) {
                            let recordInStorage = JSON.parse(recordInStorageStr) as WatchHistoryRecord;
                            if (recordInStorage.lastWatchTime === record.lastWatchTime) {
                                // we delete same records because they are not updated.
                                this._persistStorage.removeItem(key);
                            }
                        }
                    });
                }, error: (error) => {
                    console.log(error);
                }
            });
    }

    runPeriodTask() {
        setInterval(() => {
            console.log('synchronize history records');
            this.synchronizeWatchProgress();
        }, TASK_INTERVAL);
    }
}
