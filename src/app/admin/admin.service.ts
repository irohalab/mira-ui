import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseService } from '../../helpers/base.service';
import { Bangumi, Episode, MainItem } from '../entity';
import { VideoFile } from '../entity/video-file';
import { BangumiRaw } from '../entity/BangumiRaw';


@Injectable()
export class AdminService extends BaseService {

    private baseUrl = '/api/admin';

    constructor(private http: HttpClient) {
        super();
    }

    queryBangumi(bgmId: number): Observable<MainItem> {
        let queryUrl = this.baseUrl + '/query/' + bgmId;
        return this.http.get<any>(queryUrl).pipe(
            map<any, MainItem>(res => new MainItem(res)),
            catchError(this.handleError));
    }

    searchBangumi(params: {keyword: string, type: number, offset: number, count: number}): Observable<{data: BangumiRaw[], total: number}> {
        return this.http.get<{data: BangumiRaw[], total: number}>(`${this.baseUrl}/bangumi/search`, {
            params
        }).pipe(
            catchError(this.handleError),);
    }

    addBangumi(itemId: string): Observable<BangumiRaw> {
        return this.http.post<BangumiRaw>(`${this.baseUrl}/bangumi`, null, {
            params: {
                itemId
            }
        });
    }

    getTimeline(params: {type: number, eps: number, sort: string, orderBy: string}): Observable<number[]> {
        return this.http.get<{data: string[]}>(`${this.baseUrl}/bangumi/timeline`, {
            params
        }).pipe(map(res => res.data.map(date => new Date(date).valueOf())));
    }

    listBangumi(params: {
        offset: number,
        limit: number,
        eps?: number,
        orderBy: string,
        sort: string,
        keyword?: string,
        type?: string,
        subType?: string}): Observable<{ data: BangumiRaw[], total: number }> {
        return this.http.get<{ data: BangumiRaw[], total: number }>(`${this.baseUrl}/bangumi`, {
            params
        }).pipe(
            catchError(this.handleError),);
    }

    getBangumi(id: string): Observable<Bangumi> {
        let queryUrl = this.baseUrl + '/bangumi/' + id;
        return this.http.get<Bangumi>(queryUrl).pipe(
            catchError(this.handleError),)
    }

    updateBangumi(bangumi: Bangumi): Observable<any> {
        let id = bangumi.id;
        let queryUrl = this.baseUrl + '/bangumi/' + id;
        return this.http.put<any>(queryUrl, bangumi).pipe(
            catchError(this.handleError),);
    }

    deleteBangumi(bangumi_id: string): Observable<{delete_delay: number}> {
        return this.http.delete<{ data: {delete_delay: number} }>(`${this.baseUrl}/bangumi/${bangumi_id}`).pipe(
            map(res => res.data),
            catchError(this.handleError),)
    }

    getEpisode(episode_id: string): Observable<Episode> {
        return this.http.get<{ data: Episode }>(`${this.baseUrl}/episode/${episode_id}`).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    addEpisode(episode: Episode): Observable<string> {
        return this.http.post<{ data: {id: string} }>(`${this.baseUrl}/episode`, episode).pipe(
            map(res => <string> res.data.id),
            catchError(this.handleError),);
    }

    updateEpisode(episode: Episode): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/episode/${episode.id}`, episode).pipe(
            catchError(this.handleError),);
    }

    deleteEpisode(episode_id: string): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/episode/${episode_id}`).pipe(
            catchError(this.handleError),)
    }

    getEpisodeVideoFiles(episodeId: string): Observable<VideoFile[]> {
        return this.http.get<{data: VideoFile[]}>(`${this.baseUrl}/video-file`, {
            params: {
                episodeId
            }
        }).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    deleteVideoFile(video_file_id: string): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/video-file/${video_file_id}`).pipe(
            catchError(this.handleError),);
    }

    addVideoFile(videoFile: VideoFile): Observable<string> {
        return this.http.post<{data: string}>(`${this.baseUrl}/video-file`, videoFile).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    updateVideoFile(videoFile: VideoFile): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/video-file/${videoFile.id}`, videoFile).pipe(
            catchError(this.handleError),);
    }

    downloadDirectly(bangumiId: string,
                     urlEpsList: {downloadUrl: string, epsNo: number, filePath: string, fileName: string}[]): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/episode/download-directly`, {
            bangumiId,
            urlEpsList
        }).pipe(catchError(this.handleError),);
    }

    syncEpisodes(bangumiId: string, bgmId: number): Observable<{
        data: {
            new_episodes?: Episode[],
            removed_episodes?: Episode[],
            updated_episodes?: Episode[]
        },
        msg?: string,
        status?: number
    }> {
        return this.http.post<{
            data: {
                new_episodes?: Episode[],
                removed_episodes?: Episode[],
                updated_episodes?: Episode[]
            },
            msg?: string,
            status?: number
        }>(`${this.baseUrl}/sync-episodes`, {
            bangumi_id: bangumiId,
            bgm_id: bgmId
        }).pipe(catchError(this.handleError),);
    }
}
