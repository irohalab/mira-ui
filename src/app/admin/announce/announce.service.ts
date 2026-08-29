import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { BaseService } from '../../../helpers/base.service';
import { Announce } from '../../entity/announce';
import { environment } from '../../../environments/environment';

const baseUrl = `${environment.resourceProvider}/admin/announce`;

@Injectable({
    providedIn: 'root'
})
export class AnnounceService extends BaseService {

    constructor(private _http: HttpClient) {
        super();
    }

    listAnnounce(position: number, offset: number, limit: number, content?: string): Observable<{data: Announce[], total: number}> {
        return this._http.get<{data: Array<Omit<Announce, 'startTime'|'endTime'> & {startTime: string, endTime: string}>, total: number}>(baseUrl, {
            params: { position, offset, limit, content }
        }).pipe(
            map(res => {
                return {
                    data: res.data.map((announceResp) => Announce.fromResponse(announceResp)),
                    total: res.total
                };
            }),
            catchError(this.handleError),);
    }

    addAnnounce(announce: Announce): Observable<any> {
        return this._http.post<any>(baseUrl, announce).pipe(
            catchError(this.handleError),);
    }

    updateAnnounce(announce_id: string, announce: Announce): Observable<any> {
        return this._http.put<any>(`${baseUrl}/${announce_id}`, announce).pipe(
            catchError(this.handleError),);
    }

    deleteAnnounce(announce_id: string): Observable<any> {
        return this._http.delete<any>(`${baseUrl}/${announce_id}`).pipe(
            catchError(this.handleError),);
    }
}
