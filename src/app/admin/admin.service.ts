import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { BaseService } from '../../helpers/base.service';
import { BangumiAdminEntity } from '../entity/admin/BangumiAdminEntity';
import { environment } from '../../environments/environment';
import { ResourceGroup } from '../entity/ResourceGroup';
import dayjs from 'dayjs';
import { ScanStatusResponse } from '../entity/ScanStatusResponse';
import { EpisodeAdminEntity } from '../entity/admin/EpisodeAdminEntity';
import { VideoFileAdminEntity, VideoFileAdminPayload } from '../entity/admin/VideoFileAdminEntity';
import { BangumiSearchResult } from '../entity/admin/BangumiSearchResult';

// This is the same with backend. It should be retrieved from backend, but we hardcode this for convenient.
const DELETE_DELAY_MINUTES = 10;

const baseUrl = `${environment.resourceProvider}/admin`;

@Injectable({
    providedIn: 'root'
})
export class AdminService extends BaseService {

    constructor(private http: HttpClient) {
        super();
    }

    getStatus(): Observable<ScanStatusResponse> {
        return this.http.get<{data: ScanStatusResponse}>(`${baseUrl}/scan/status`)
            .pipe(map(res => res.data), catchError(this.handleError));
    }

    searchBangumi(params: {keyword: string, type: number, offset: number, limit: number}): Observable<{data: BangumiSearchResult[], total: number}> {
        return this.http.get<{data: BangumiSearchResult[], total: number}>(`${baseUrl}/bangumi/search`, {
            params
        }).pipe(
            catchError(this.handleError),);
    }

    addBangumi(itemId: string): Observable<BangumiAdminEntity> {
        return this.http.post<BangumiAdminEntity>(`${baseUrl}/bangumi`, null, {
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
        subType?: string}): Observable<{ data: BangumiAdminEntity[], total: number }> {
        return this.http.get<{ data: BangumiAdminEntity[], total: number }>(`${baseUrl}/bangumi`, {
            params: {...params, includeDeleted: true},
        }).pipe(
            tap(res => {
                res.data.forEach(bangumi => {
                    const deleteMarkDate = bangumi.deleteMark && dayjs(bangumi.deleteMark);
                    if (deleteMarkDate && deleteMarkDate.isValid()) {
                        bangumi.deleteEta = dayjs().to(deleteMarkDate.add(DELETE_DELAY_MINUTES, 'm'));
                    }
                });
            }),
            catchError(this.handleError),);
    }

    getBangumi(id: string): Observable<BangumiAdminEntity> {
        return this.http.get<BangumiAdminEntity>(`${baseUrl}/bangumi/${id}`).pipe(
            tap(bangumi => {
                const deleteMarkDate = bangumi.deleteMark && dayjs(bangumi.deleteMark);
                if (deleteMarkDate && deleteMarkDate.isValid()) {
                    bangumi.deleteEta = dayjs().to(deleteMarkDate.add(DELETE_DELAY_MINUTES, 'm'));
                }
            }),
            catchError(this.handleError),)
    }

    updateBangumi(bangumi: BangumiAdminEntity): Observable<any> {
        let id = bangumi.id;
        let queryUrl = baseUrl + '/bangumi/' + id;
        return this.http.put<any>(queryUrl, bangumi).pipe(
            catchError(this.handleError),);
    }

    deleteBangumi(bangumi_id: string): Observable<never> {
        return this.http.delete<never>(`${baseUrl}/bangumi/${bangumi_id}`).pipe(
            catchError(this.handleError),)
    }

    restorePendingDeleteBangumi(bangumiId: string): Observable<never> {
        return this.http.post<never>(`${baseUrl}/bangumi/restore/${bangumiId}`, null)
            .pipe(catchError(this.handleError));
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
        return this.http.delete<never>(`${baseUrl}/bangumi/${bangumiId}/resource-group/${resourceGroupId}`).pipe(catchError(this.handleError));
    }

    listEpisode(bangumiId: string): Observable<EpisodeAdminEntity[]> {
        return this.http.get<EpisodeAdminEntity[]>(`${baseUrl}/episode`, {
            params: {
                bangumi: bangumiId,
            }
        }).pipe(catchError(this.handleError));
    }

    updateEpisodeStatus(episodeId: string, status: number): Observable<any> {
        return this.http.put<any>(`${baseUrl}/episode/${episodeId}`, null, {
            params: {status}
        }).pipe(
            catchError(this.handleError),);
    }

    deleteEpisode(episode_id: string): Observable<any> {
        return this.http.delete<any>(`${baseUrl}/episode/${episode_id}`).pipe(
            catchError(this.handleError),)
    }

    getEpisodeVideoFiles(episodeId: string, resourceGroupId?: string): Observable<VideoFileAdminEntity[]> {
        const params: {[p: string]: string} = {episodeId};
        if (resourceGroupId) {
            params['resourceGroupId'] = resourceGroupId;
        }
        return this.http.get<{data: VideoFileAdminEntity[]}>(`${baseUrl}/video-file`, {
            params
        }).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    deleteVideoFile(video_file_id: string): Observable<any> {
        return this.http.delete<any>(`${baseUrl}/video-file/${video_file_id}`).pipe(
            catchError(this.handleError),);
    }

    addVideoFile(videoFile: VideoFileAdminPayload): Observable<string> {
        return this.http.post<VideoFileAdminEntity>(`${baseUrl}/video-file`, videoFile).pipe(
            map(res => res.id),
            catchError(this.handleError),);
    }

    updateVideoFile(videoFile: VideoFileAdminPayload): Observable<any> {
        return this.http.put<any>(`${baseUrl}/video-file/${videoFile.id}`, videoFile).pipe(
            catchError(this.handleError),);
    }

    downloadDirectly(bangumiId: string,
                     rgId: string,
                     urlEpsList: {downloadUrl: string, epsNo: number, filePath: string, fileName: string}[]): Observable<any> {
        return this.http.post<any>(`${baseUrl}/episode/download-directly`, {
            bangumiId,
            rgId,
            urlEpsList
        }).pipe(catchError(this.handleError),);
    }

    syncEpisodes(bangumiId: string): Observable<{
        newEpisodes: EpisodeAdminEntity[],
        updatedEpisodes: EpisodeAdminEntity[],
        removableEpisodes: EpisodeAdminEntity[]
    }> {
        return this.http.post<{
            newEpisodes: EpisodeAdminEntity[],
            updatedEpisodes: EpisodeAdminEntity[],
            removableEpisodes: EpisodeAdminEntity[]
        }>(`${baseUrl}/bangumi/${bangumiId}/sync-episodes`, null).pipe(catchError(this.handleError),);
    }
}
