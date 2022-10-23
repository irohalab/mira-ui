import { BaseService } from '../../../helpers/base.service';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { Vertex } from '../../entity/Vertex';

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
        this.setUpSocketIOConnection();
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
        };
        return this.sendRequest<{data: VideoProcessJob[]}>(reqData)
            .pipe(
                map(res => res.data)
            );
    }

    getJob(jobId: string): Observable<VideoProcessJob> {
        const reqData: ReqData = {
            method: 'GET',
            url: `/job/${jobId}`
        };
        return this.sendRequest<{data: VideoProcessJob, status: number}>(reqData)
            .pipe(
                map(({data, status}) => {
                    if (status !== 0) {
                        throw new Error('job not found or something goes wrong');
                    } else {
                        return data;
                    }
                })
            );
    }

    getVertices(jobId: string): Observable<Vertex[]> {
        const reqData: ReqData = {
            method: 'GET',
            url: `/job/${jobId}/vertex`
        };
        return this.sendRequest<{data: Vertex[]}>(reqData)
            .pipe(
                map(res => res.data)
            );
    }

    setUpSocketIOConnection(): void {
        console.log('set up socket.io');
        const socket = io('');
        socket.emit('chat_message', 'a quick silver fox jumps over a lazy brown dog');
    }

}
