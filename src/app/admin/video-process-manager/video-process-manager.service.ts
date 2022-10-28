import { BaseService } from '../../../helpers/base.service';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { Vertex } from '../../entity/Vertex';
import { LogType } from './LogType';

type ReqData = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: any;
    params?: {[key: string]: string};
}

@Injectable()
export class VideoProcessManagerService extends BaseService {
    private _baseUrl = '/api/video-rule/proxy';
    private _sessionId: string;
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

    createSocketSession(): Observable<string> {
        const reqData: ReqData = {
            method: 'POST',
            url: `/job/session`
        };
        return this.sendRequest<{data: string, status: number}>(reqData)
            .pipe(
                map(res => res.data)
            );
    }

    public streamingJobLog(jobId: string): Observable<LogType> {
        return this.streamingLog('/job-log', {
            jobId
        });
    }

    public streamingVertexLog(jobId: string, vertexId: string): Observable<LogType> {
        return this.streamingLog('/vertex-log', {
            jobId,
            vertexId
        })
    }

    private streamingLog(namespace: string, payload: any): Observable<LogType> {
        let sessionObservable: Observable<string>;
        if (!this._sessionId) {
            sessionObservable = this.createSocketSession()
                .pipe(tap((sessionId) => {
                    this._sessionId = sessionId;
                }));
        } else {
            sessionObservable = of(this._sessionId);
        }
        return sessionObservable.pipe(
            switchMap((sessionId) => {
                console.log(sessionId);
                payload.sessionId = sessionId;
                return new Observable<LogType>(function subscribe(subscriber) {
                    const socket = io(namespace);
                    let isComplete = false;
                    socket.on('connect', () => {
                        socket.emit('log_stream', payload);
                        console.log('connected to socket ' + namespace);
                    });
                    socket.on('connect_error', () => {
                        console.log('connect_error to socket ' + namespace);
                    });
                    socket.on('disconnect', (reason) => {
                        if (reason !== 'io client disconnect' && !isComplete) {
                            subscriber.error(new Error(reason));
                            console.log(reason);
                        }
                    });
                    socket.on('log:line', (data) => {
                        try {
                            if (data && data.trim()) {
                                subscriber.next(JSON.parse(data) as LogType);
                            }
                        } catch (e) {
                            console.log('error when parsing line: ' + e);
                            console.log('error content is ' + data);
                            isComplete = true;
                            socket.disconnect();
                            subscriber.error(e);
                        }
                    });
                    socket.on('log:line_end', () => {
                        console.log('line_end');
                        isComplete = true;
                        subscriber.complete();
                    });

                    socket.on('error', (error) => {
                        console.log('error' + JSON.stringify(error));
                    });

                    return function unsubscribe() {
                        socket.disconnect();
                    };
                });
            })
        );
    }
}
