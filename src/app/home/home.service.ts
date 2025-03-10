import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable } from "rxjs";
import { catchError, map, switchMap } from 'rxjs/operators';
import { BaseService } from "../../helpers/base.service";
// import {homeRoutes} from './home.routes';
import { Bangumi, Episode } from "../entity";
import { Announce } from '../entity/announce';
import { WatchProgress } from "../entity/watch-progress";
import { WatchService } from './watch.service';
import { Favorite } from '../entity/Favorite';

@Injectable()
export class HomeService extends BaseService {

    private _baseUrl = '/api/bangumi';

    constructor(private httpClient: HttpClient,
                private router: Router,
                private watchService: WatchService) {
        super();
        // let childRoutes = homeRoutes[0].children;
        this.router.events.subscribe(
            (event) => {
                if (event instanceof NavigationEnd) {
                    let urlSegements = this.parseUrl(event.url);
                    if (urlSegements.paths[0] === '') {
                        this.childRouteChanges.emit('Default');
                    } else if (urlSegements.paths[0] === 'play') {
                        this.childRouteChanges.emit('Play');
                    } else if (urlSegements.paths.length === 1 && urlSegements.paths[0] === 'bangumi') {
                        this.childRouteChanges.emit('Bangumi');
                    } else if (urlSegements.paths.length === 2 && urlSegements.paths[0] === 'bangumi') {
                        this.childRouteChanges.emit('BangumiDetail');
                    } else if (urlSegements.paths[0] === 'pv') {
                        this.childRouteChanges.emit('PV');
                    } else if (urlSegements.paths[0] === 'favorite') {
                        this.childRouteChanges.emit('Favorite');
                    } else if (urlSegements.paths[0] === 'history') {
                        this.childRouteChanges.emit('History');
                    }
                }
            }
        );
    }

    private parseUrl(url: string) {
        let [paths, queryStrings] = url.split(/[;?]/);
        let pathSegement = paths.split('/');
        return {
            paths: pathSegement.slice(1),
            queryString: queryStrings
        }
    }

    childRouteChanges: EventEmitter<any> = new EventEmitter();

    /**
     * @Deprecated
     */
    activateChild(routeName: string) {
        this.childRouteChanges.emit(routeName);
    }

    /**
     * recently updated, not used
     * @param {number} days
     * @returns {Observable<Episode[]>}
     */
    recentEpisodes(days?: number): Observable<Episode[]> {
        let queryUrl = this._baseUrl + '/recent';
        if (days) {
            queryUrl = queryUrl + '?days=' + days;
        }
        return this.httpClient.get<{ data: Episode[] }>(queryUrl).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    /**
     * All on air Bangumi
     * @param {number} type
     * @returns {Observable<Bangumi[]>}
     */
    onAir(type: string): Observable<Bangumi[]> {
        return this.httpClient.get<{ data: Bangumi[] }>(`/api/bangumi/on-air?type=${type}`).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    episode_detail(episode_id: string): Observable<Episode> {
        return this.httpClient.get<Episode>(`/api/episode/${episode_id}`, {
            params: {loadBangumiEpisodes: true, loadFavorite: true}
        }).pipe(
            map(episode => this.synchronizeWatchProgressWithLocal(episode)),
            catchError(this.handleError),);
    }

    bangumi_detail(bangumi_id: string): Observable<Bangumi> {
        return this.httpClient.get<Bangumi>(`/api/bangumi/${bangumi_id}`).pipe(
            map(bangumi => {
                if (bangumi.episodes && bangumi.episodes.length > 0) {
                    bangumi.episodes = bangumi.episodes.map(episode => this.synchronizeWatchProgressWithLocal(episode));
                }
                return bangumi;
            }),
            catchError(this.handleError),);
    }

    timeline(sort: string, type?: string, eps?: number): Observable<number[]> {
        const params: any = {sort};
        if (Number.isInteger(eps)) {
            params.eps = eps;
        }
        if (type) {
            params.type = type;
        }
        return this.httpClient.get<{data: string[]}>('/api/bangumi/timeline', {
            params
        }).pipe(map(res => res.data.map(date => new Date(date).valueOf())));
    }

    listBangumi(params: {
        keyword?: string,
        offset: number,
        limit: number,
        orderBy: string,
        sort: string,
        type?: string,
        subType?: string,
        eps?: number}): Observable<{ data: Bangumi[], total: number }> {
        return this.httpClient.get<{ data: Bangumi[], total: number }>('/api/bangumi', {
            params
        }).pipe(
            catchError(this.handleError),);
    }

    myBangumi(status: string): Observable<{data: Favorite[], total: number}> {
        return this.httpClient.get<{data: Favorite[], total: number}>('/api/favorite', {
            params: { status, limit: -1 }
        });
    }

    listAnnounce(): Observable<Announce[]> {
        return this.httpClient.get<Announce[]>('/api/announce').pipe(
            catchError(this.handleError),);
    }

    sendFeedback(episode_id: string, video_file_id: string, message: string): Observable<any> {
        return this.httpClient.post<any>(`${this._baseUrl}/feedback`, {
            episode_id: episode_id,
            video_file_id: video_file_id,
            message: message
        }).pipe(
            catchError(this.handleError),);
    }

    private synchronizeWatchProgressWithLocal(episode: Episode): Episode {
        let record = this.watchService.getLocalWatchHistory(episode.id);
        console.log('record', record);
        if (record && (!episode.watchProgress || record.lastWatchTime > episode.watchProgress.lastWatchTime)) {
            if (!episode.watchProgress) {
                episode.watchProgress = new WatchProgress();
            }
            episode.watchProgress.lastWatchTime = record.lastWatchTime;
            episode.watchProgress.lastWatchPosition = record.lastWatchPosition;
            episode.watchProgress.percentage = record.percentage;
            episode.watchProgress.watchStatus = record.isFinished ? WatchProgress.WATCHED : WatchProgress.WATCHING;
        }
        return episode;
    }
}

/**
 * Communicate between Home Component and its children
 */
export abstract class HomeChild {

    constructor(protected homeService: HomeService) {

    }

}
