import { Injectable } from '@angular/core';
import { BaseService } from '../../../helpers/base.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Message } from '../../entity/Message';
import { catchError, map } from 'rxjs/operators';

const baseUrl = `${environment.bgmProviderBaseURL}/message`;

@Injectable({
    providedIn: 'root'
})
export class MessageService extends BaseService {
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
        return this.http.post<never>(`${baseUrl}/read`, messageIdList)
            .pipe(catchError(this.handleError));
    }

    deleteMessages(messageIdList: string[]): Observable<void> {
        return this.http.delete<never>(baseUrl, {
            params: {
                ids: messageIdList.join(',')
            }
        })
        .pipe(catchError(this.handleError));
    }
}
