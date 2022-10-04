import { BaseService } from '../../../helpers/base.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { VideoProcessRule } from '../../entity/VideoProcessRule';
import { JobStatus } from '../../entity/JobStatus';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { Injectable } from '@angular/core';

type ReqData = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: any;
    params?: {[key: string]: string};
}

@Injectable()
export class VideoProcessManagerService extends BaseService {
    private _baseUrl = '/api/video-rule/proxy';
    constructor(private _httpClient: HttpClient) {
        super();
    }

    private sendRequest<T>(reqData: ReqData): Observable<T> {
        return this._httpClient.post<T>(`${this._baseUrl}`, reqData)
            .pipe(
                catchError(this.handleError)
            );
    }

    listJobs(status: VideoProcessJobStatus): Observable<VideoProcessJob[]> {
        const reqData: ReqData = {
            method: 'GET',
            url: '/job',
            params: { status }
        }
        return this.sendRequest<{data: VideoProcessJob[]}>(reqData)
            .pipe(
                map(res => {
                    const jobs = res.data;
                    for (const job of jobs) {
                        job.progress = job.progress + 1;
                    }
                    return jobs;
                })
            );
    }

}
