import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseService } from '../../../helpers/base.service';
import { Item } from '../../entity/item';
import { environment } from '../../../environments/environment';

const baseUrl = `${environment.resourceProvider}/admin/feed`;

@Injectable()
export class FeedService extends BaseService {

  constructor(private http: HttpClient) {
    super()
  }

  queryUniversal<T>(mode: string, keyword: string, regex?: string): Observable<Item[]> {
      return this.http.post<{data: Array<Item>, status: number}>(`${baseUrl}/universal`, {mode, keyword, regex}).pipe(
          map(res => res.data),
          catchError(this.handleError),);
  }

  getUniversalMeta(): Observable<string[]> {
      return this.http.get<string[]>(`${baseUrl}/universal/meta`).pipe(
          catchError(this.handleError),);
  }

}
