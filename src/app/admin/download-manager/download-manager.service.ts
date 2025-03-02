import { BaseService } from '../../../helpers/base.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DownloadJobStatus } from '../../entity/DownloadJobStatus';
import { Observable, of } from 'rxjs';
import { DownloadJob } from '../../entity/DownloadJob';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { FileMapping } from '../../entity/FileMapping';
import { Bangumi } from '../../entity';
import { AdminService } from '../admin.service';
import { TorrentFile } from '../../entity/TorrentFile';

type ReqData = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: any;
    params?: { [key: string]: string };
}

@Injectable()
export class DownloadManagerService extends BaseService {
    private _baseUrl = '/api/admin/download';
    private bangumiDict: { [bgmId: string]: Bangumi };

    constructor(private _httpClient: HttpClient, private _adminService: AdminService) {
        super();
        this.bangumiDict = {};
    }

    private sendRequest<T>(reqData: ReqData): Observable<T> {
        return this._httpClient.post<T>(`${this._baseUrl}/proxy`, reqData)
            .pipe(
                catchError(this.handleError)
            );
    }

    public list_jobs(status: DownloadJobStatus | 'all'): Observable<DownloadJob[]> {
        const reqData: ReqData = {
            method: 'GET',
            url: '/download/job',
            params: {status}
        };
        return this.sendRequest<{ data: DownloadJob[], total: number }>(reqData)
            .pipe(
                map(res => {
                    return res.data.map(job => {
                        job.progress = Math.floor(job.progress * 100 * 10) / 10;
                        return job;
                    });
                }),
                switchMap(jobs => {
                    const idsDict: { [key: string]: boolean } = {};
                    jobs.forEach(job => {
                        idsDict[job.bangumiId] = true;
                    });
                    return this.getBangumiFromIds(Object.keys(idsDict))
                        .pipe(map((bangumiList: Bangumi[]) => {
                            jobs.forEach(job => {
                                job.bangumi = bangumiList.find(bangumi => bangumi.id === job.bangumiId);
                            });
                            return jobs;
                        }));
                }),
                catchError((err) => {
                    console.log(err);
                    return [];
                }));
    }

    public getJob(jobId: string): Observable<DownloadJob> {
        const reqData: ReqData = {
            method: 'GET',
            url: `/download/job/${jobId}`
        };
        return this.sendRequest<{ data: DownloadJob, status: number }>(reqData)
            .pipe(switchMap(res => {
                const job = res.data;
                job.progress = Math.floor(job.progress * 100 * 10) / 10;
                return this.getBangumiFromIds([job.bangumiId])
                    .pipe(map((bangumiList: Bangumi[]) => {
                        job.bangumi = bangumiList[0];
                        return job;
                    }));
            }));
    }

    public jobOperation(jobId: string, operation: 'pause' | 'resume' | 'delete'): Observable<any> {
        const reqData: ReqData = {
            method: 'PUT',
            url: `/download/job/${jobId}`,
            body: {
                action: operation
            }
        };
        return this.sendRequest<{ message: string, status: number }>(reqData)
            .pipe(map(res => res.message));
    }

    public enhance_file_mapping(fileMapping: FileMapping[]): Observable<FileMapping[]> {
        return this._httpClient.post<{ data: FileMapping[], total: number }>(`${this._baseUrl}/file-mapping`, fileMapping)
            .pipe(map(res => res.data),
                catchError(this.handleError));
    }

    public resendJobCompleteMessage(jobId: string): Observable<number> {
        const reqData: ReqData = {
            method: 'PUT',
            url: `/download/job/${jobId}/resend-finish-message`
        }
        return this.sendRequest<{ status: number }>(reqData)
            .pipe(map(res => res.status), catchError(this.handleError));
    }

    public getJobContent(jobId: string): Observable<TorrentFile[]> {
        const reqData: ReqData = {
            method: 'GET',
            url: `/download/job/${jobId}/content`
        };
        return this.sendRequest<{data: TorrentFile[], status: number}>(reqData)
            .pipe(map(res => res.data), catchError(this.handleError));
    }

    public getBangumi(id: string): Observable<Bangumi> {
        if (this.bangumiDict[id]) {
            return of(this.bangumiDict[id]);
        } else {
            return this._adminService.getBangumi(id)
                .pipe(tap(bangumi => {
                    this.bangumiDict[id] = bangumi;
                }));
        }
    }

    public getBangumiFromIds(ids: string[]): Observable<Bangumi[]> {
        const nonCachedIds = ids.filter(id => {
            return !this.bangumiDict.hasOwnProperty(id);
        });
        if (nonCachedIds.length > 0) {
            return this._httpClient.post<{ data: Bangumi[], total: number }>(`${this._baseUrl}/bangumi`, {
                ids: nonCachedIds
            }).pipe(
                map((res) => {
                    res.data.forEach(bgm => {
                        this.bangumiDict[bgm.id] = bgm;
                    });
                    return ids.map(id => this.bangumiDict[id]).filter(bgm => !!bgm);
                }));
        } else {
            return of(ids.filter(id => {
                return this.bangumiDict.hasOwnProperty(id);
            }).map(id => this.bangumiDict[id]));
        }
    }
}
