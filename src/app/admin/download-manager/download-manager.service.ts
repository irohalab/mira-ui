import { BaseService } from '../../../helpers/base.service';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { JobStatus } from '../../entity/JobStatus';
import { Observable } from 'rxjs';
import { DownloadJob } from '../../entity/DownloadJob';
import { catchError, map } from 'rxjs/operators';
import { FileMapping } from '../../entity/FileMapping';

@Injectable()
export class DownloadManagerService extends BaseService {
    private _baseUrl = '/api/download-manager';
    constructor(private _httpClient: HttpClient) {
        super();
    }

    public list_jobs(status: JobStatus): Observable<DownloadJob[]> {
        return this._httpClient.get<{data: DownloadJob[], total: number}>(`${this._baseUrl}/job`, {
            params: new HttpParams().set('status', status)
        })
            .pipe(map(res => {
                return res.data.map(job => {
                    job.progress = job.progress * 100;
                    return job;
                });
            }),
                catchError((err) => {
                    console.log(err);
                    return [];
                }));
    }

    public enhance_file_mapping(fileMapping: FileMapping[]): Observable<FileMapping[]> {
        return this._httpClient.post<{data: FileMapping[], total: number}>(`${this._baseUrl}/file-mapping`, fileMapping)
            .pipe(map(res => res.data),
                catchError(this.handleError));
    }
}
