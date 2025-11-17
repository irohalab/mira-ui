import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseService } from '../../../helpers/base.service';
import { Bangumi, Episode } from '../../entity';
import { environment } from '../../../environments/environment';

const baseUrl = `${environment.resourceProvider}/task`;

@Injectable()
export class TaskService extends BaseService {

    constructor(private _http: HttpClient) {
        super();
    }

    listPendingDeleteBangumi(): Observable<{data: Bangumi[], delete_delay: number}> {
        return this._http.get<{data: Bangumi[], delete_delay: number}>(`${baseUrl}/bangumi`).pipe(
            catchError(this.handleError),);
    }

    listPendingDeleteEpisode(): Observable<{data: Episode[], delete_delay: number}> {
        return this._http.get<{data: Episode[], delete_delay: number}>(`${baseUrl}/episode`).pipe(
            catchError(this.handleError),);
    }

    restoreBangumi(bangumi_id: string): Observable<any> {
        return this._http.post<any>(`${baseUrl}/restore/bangumi/${bangumi_id}`, null).pipe(
            catchError(this.handleError),);
    }

    restoreEpisode(episode_id: string): Observable<any> {
        return this._http.post<any>(`${baseUrl}/restore/episode/${episode_id}`, null).pipe(
            catchError(this.handleError),);
    }
}
