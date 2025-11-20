import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseService } from '../../helpers/base.service';
import { Bangumi, Episode, MainItem } from '../entity';
import { VideoFile } from '../entity/video-file';
import { BangumiRaw } from '../entity/BangumiRaw';
import { environment } from '../../environments/environment';
import { ResourceGroup } from '../entity/ResourceGroup';

const baseUrl = `${environment.resourceProvider}/admin`;

@Injectable()
export class AdminService extends BaseService {

    constructor(private http: HttpClient) {
        super();
    }

    queryBangumi(bgmId: number): Observable<MainItem> {
        let queryUrl = baseUrl + '/query/' + bgmId;
        return this.http.get<any>(queryUrl).pipe(
            map<any, MainItem>(res => new MainItem(res)),
            catchError(this.handleError));
    }

    searchBangumi(params: {keyword: string, type: number, offset: number, count: number}): Observable<{data: BangumiRaw[], total: number}> {
        return this.http.get<{data: BangumiRaw[], total: number}>(`${baseUrl}/bangumi/search`, {
            params
        }).pipe(
            catchError(this.handleError),);
    }

    addBangumi(itemId: string): Observable<BangumiRaw> {
        return this.http.post<BangumiRaw>(`${baseUrl}/bangumi`, null, {
            params: {
                itemId
            }
        });
    }

    getTimeline(params: {type: number, eps: number, sort: string, orderBy: string}): Observable<number[]> {
        return this.http.get<{data: string[]}>(`${baseUrl}/bangumi/timeline`, {
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
        return this.http.get<{ data: BangumiRaw[], total: number }>(`${baseUrl}/bangumi`, {
            params
        }).pipe(
            catchError(this.handleError),);
    }

    getBangumi(id: string): Observable<Bangumi> {
        let queryUrl = baseUrl + '/bangumi/' + id;
        return this.http.get<Bangumi>(queryUrl).pipe(
            catchError(this.handleError),)
    }

    updateBangumi(bangumi: Bangumi): Observable<any> {
        let id = bangumi.id;
        let queryUrl = baseUrl + '/bangumi/' + id;
        return this.http.put<any>(queryUrl, bangumi).pipe(
            catchError(this.handleError),);
    }

    deleteBangumi(bangumi_id: string): Observable<{delete_delay: number}> {
        return this.http.delete<{ data: {delete_delay: number} }>(`${baseUrl}/bangumi/${bangumi_id}`).pipe(
            map(res => res.data),
            catchError(this.handleError),)
    }

    listResourceGroups(bangumiId: string, populateVideoFiles: boolean): Observable<ResourceGroup[]> {
        return this.http.get<ResourceGroup[]>(`${baseUrl}/bangumi/${bangumiId}/resource-group`, {
            params: {
                videoFiles: populateVideoFiles ? 'true' : undefined,
            }
        }).pipe(catchError(this.handleError));
    }

    addResourceGroup(resourceGroup: ResourceGroup): Observable<ResourceGroup> {
        return this.http.post<ResourceGroup>(`${baseUrl}/bangumi/${resourceGroup.bangumi.id}/resource-group`, resourceGroup)
            .pipe(catchError(this.handleError));
    }

    updateResourceGroup(resourceGroup: ResourceGroup): Observable<ResourceGroup> {
        return this.http.put<ResourceGroup>(`${baseUrl}/bangumi/${resourceGroup.bangumi.id}/resource-group/${resourceGroup.id}`, resourceGroup)
            .pipe(catchError(this.handleError));
    }

    deleteResourceGroup(bangumiId: string, resourceGroupId: string): Observable<void> {
        return this.http.delete<never>(`${baseUrl}/bangumi/${bangumiId}/${resourceGroupId}`).pipe(catchError(this.handleError));
    }

    getEpisode(episode_id: string): Observable<Episode> {
        return this.http.get<{ data: Episode }>(`${baseUrl}/episode/${episode_id}`).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    listEpisode(bangumiId: string): Observable<Episode[]> {
        return this.http.get<Episode[]>(`${baseUrl}/episode`, {
            params: {
                bangumi: bangumiId,
            }
        }).pipe(catchError(this.handleError));
    }

    addEpisode(episode: Episode): Observable<string> {
        return this.http.post<{ data: {id: string} }>(`${baseUrl}/episode`, episode).pipe(
            map(res => <string> res.data.id),
            catchError(this.handleError),);
    }

    updateEpisode(episode: Episode): Observable<any> {
        return this.http.put<any>(`${baseUrl}/episode/${episode.id}`, episode).pipe(
            catchError(this.handleError),);
    }

    deleteEpisode(episode_id: string): Observable<any> {
        return this.http.delete<any>(`${baseUrl}/episode/${episode_id}`).pipe(
            catchError(this.handleError),)
    }

    getEpisodeVideoFiles(episodeId: string, resourceGroupId?: string): Observable<VideoFile[]> {
        const params: {[p: string]: string} = {episodeId};
        if (resourceGroupId) {
            params['resourceGroupId'] = resourceGroupId;
        }
        return this.http.get<{data: VideoFile[]}>(`${baseUrl}/video-file`, {
            params
        }).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    deleteVideoFile(video_file_id: string): Observable<any> {
        return this.http.delete<any>(`${baseUrl}/video-file/${video_file_id}`).pipe(
            catchError(this.handleError),);
    }

    addVideoFile(videoFile: VideoFile): Observable<string> {
        return this.http.post<{data: string}>(`${baseUrl}/video-file`, videoFile).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    updateVideoFile(videoFile: VideoFile): Observable<any> {
        return this.http.put<any>(`${baseUrl}/video-file/${videoFile.id}`, videoFile).pipe(
            catchError(this.handleError),);
    }

    downloadDirectly(bangumiId: string,
                     urlEpsList: {downloadUrl: string, epsNo: number, filePath: string, fileName: string}[]): Observable<any> {
        return this.http.post<any>(`${baseUrl}/episode/download-directly`, {
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
        }>(`${baseUrl}/sync-episodes`, {
            bangumi_id: bangumiId,
            bgm_id: bgmId
        }).pipe(catchError(this.handleError),);
    }
}
