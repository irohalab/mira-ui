import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseService } from '../../../helpers/base.service';
import { Account } from '../../entity/Account';

@Injectable()
export class UserManagerSerivce extends BaseService {
    private _baseUrl = '/api/admin/account';

    constructor(private _http: HttpClient) {
        super()
    }

    listUser(
        offset: number,
        limit: number,
        queryField?: string,
        queryValue?: string): Observable<{data: Account[], total: number}> {
        const params: {[key: string]: any} = {
            limit,
            offset,
        };
        if (queryField && queryValue) {
            params['$filter'] = `${queryField} eq ${queryValue}`;
        }
        return this._http.get<{data: Account[], total: number}>(this._baseUrl, {
            params
        }).pipe(
            catchError(this.handleError),);
    }

    promoteUser(accountId: string, role: string): Observable<any> {
        return this._http.put<any>(`${this._baseUrl}/${accountId}`, { role }).pipe(
            catchError(this.handleError),);
    }

    listUnusedInviteCode(): Observable<string[]> {
        return this._http.get<{data: string[]}>(`${this._baseUrl}/invitation`).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }

    createInviteCode(num: number = 1): Observable<string> {
        return this._http.post<{data: string}>(`${this._baseUrl}/invitation`, null).pipe(
            map(res => res.data),
            catchError(this.handleError),);
    }
}
