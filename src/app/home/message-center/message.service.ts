import { Injectable } from '@angular/core';
import { BaseService } from '../../../helpers/base.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, Subject } from 'rxjs';
import { Message } from '../../entity/Message';
import { catchError, map, tap } from 'rxjs/operators';

const baseUrl = `${environment.resourceProvider}/message`;

@Injectable({
    providedIn: 'root'
})
export class MessageService extends BaseService {

    private _messageChange = new Subject<void>();

    /**
     * Emits whenever messages are mutated (marked as read or deleted) so that
     * different components displaying messages can stay in sync.
     */
    get messageChange(): Observable<void> {
        return this._messageChange.asObservable();
    }

    constructor(private http: HttpClient) {
        super();
    }

    listMessage(limit: number, offset: number): Observable<Message[]> {
        return this.http.get<{ data: Message[] }>(`${baseUrl}/inbox`, {
            params: {
                limit,
                offset
            }
        })
            .pipe(map((res) => res.data), catchError(this.handleError));
    }

    listSentMessages(limit: number, offset: number): Observable<Message[]> {
        return this.http.get<{data: Message[]}>(`${baseUrl}/sent`, {
            params: {limit, offset}
        }).pipe(map((res) => res.data), catchError(this.handleError));
    }

    markAsRead(messageIdList: string[]): Observable<void> {
        return this.http.put<never>(`${baseUrl}/read`, messageIdList)
            .pipe(tap(() => this._messageChange.next()), catchError(this.handleError));
    }

    deleteMessages(messageIdList: string[]): Observable<void> {
        return this.http.delete<never>(baseUrl, {
            params: {
                ids: messageIdList.join(',')
            }
        })
        .pipe(tap(() => this._messageChange.next()), catchError(this.handleError));
    }
}
