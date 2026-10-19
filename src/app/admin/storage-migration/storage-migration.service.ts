import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BaseService } from '../../../helpers/base.service';
import { environment } from '../../../environments/environment';
import {
    CreateStorageMigrationRun,
    PageResult,
    StorageMigrationEligibility,
    StorageMigrationOverview,
    StorageMigrationReviewDecision,
    StorageMigrationRun,
    StorageMigrationRunMode,
    StorageMigrationRunStatus,
    StorageMigrationUnit,
    StorageMigrationUnitFilter,
} from './storage-migration.models';

const baseUrl = `${environment.resourceProvider}/admin/storage-migration`;

@Injectable({providedIn: 'root'})
export class StorageMigrationService extends BaseService {
    constructor(private http: HttpClient) {
        super();
    }

    getOverview(): Observable<StorageMigrationOverview> {
        return this.http.get<{data: StorageMigrationOverview}>(`${baseUrl}/overview`).pipe(
            map(response => response.data),
            catchError(this.handleError),
        );
    }

    getEligibility(): Observable<StorageMigrationEligibility> {
        return this.http.get<{data: StorageMigrationEligibility}>(`${baseUrl}/eligibility`).pipe(
            map(response => response.data),
            catchError(this.handleError),
        );
    }

    createRun(request: CreateStorageMigrationRun): Observable<StorageMigrationRun> {
        return this.http.post<{data: StorageMigrationRun}>(`${baseUrl}/runs`, request).pipe(
            map(response => response.data),
            catchError(this.handleError),
        );
    }

    listRuns(offset: number,
             limit: number,
             status?: StorageMigrationRunStatus,
             mode?: StorageMigrationRunMode): Observable<PageResult<StorageMigrationRun>> {
        const params: Record<string, string | number> = {offset, limit};
        if (status) params['status'] = status;
        if (mode) params['mode'] = mode;
        return this.http.get<PageResult<StorageMigrationRun>>(`${baseUrl}/runs`, {params}).pipe(
            catchError(this.handleError),
        );
    }

    getRun(runId: string): Observable<StorageMigrationRun> {
        return this.http.get<{data: StorageMigrationRun}>(`${baseUrl}/runs/${runId}`).pipe(
            map(response => response.data),
            catchError(this.handleError),
        );
    }

    listUnits(runId: string,
              offset: number,
              limit: number,
              filter: StorageMigrationUnitFilter = {}): Observable<PageResult<StorageMigrationUnit>> {
        const params: Record<string, string | number | boolean> = {offset, limit};
        if (filter.status) params['status'] = filter.status;
        if (filter.review) params['review'] = filter.review;
        if (filter.hasIssues) params['hasIssues'] = true;
        return this.http.get<PageResult<StorageMigrationUnit>>(`${baseUrl}/runs/${runId}/units`, {params}).pipe(
            catchError(this.handleError),
        );
    }

    getUnit(runId: string, unitId: string): Observable<StorageMigrationUnit> {
        return this.http.get<{data: StorageMigrationUnit}>(`${baseUrl}/runs/${runId}/units/${unitId}`).pipe(
            map(response => response.data),
            catchError(this.handleError),
        );
    }

    start(runId: string): Observable<unknown> { return this.runAction(runId, 'start'); }
    pause(runId: string): Observable<unknown> { return this.runAction(runId, 'pause'); }
    resume(runId: string): Observable<unknown> { return this.runAction(runId, 'resume'); }
    cancel(runId: string): Observable<unknown> { return this.runAction(runId, 'cancel'); }
    rollbackRun(runId: string): Observable<unknown> { return this.runAction(runId, 'rollback'); }
    cleanup(runId: string): Observable<unknown> { return this.runAction(runId, 'cleanup'); }

    review(runId: string,
           unitId: string,
           decision: StorageMigrationReviewDecision,
           note?: string): Observable<unknown> {
        return this.http.post(`${baseUrl}/runs/${runId}/units/${unitId}/review`, {decision, note}).pipe(
            catchError(this.handleError),
        );
    }

    retryUnit(runId: string, unitId: string): Observable<unknown> {
        return this.http.post(`${baseUrl}/runs/${runId}/units/${unitId}/retry`, {}).pipe(
            catchError(this.handleError),
        );
    }

    rollbackUnit(runId: string, unitId: string): Observable<unknown> {
        return this.http.post(`${baseUrl}/runs/${runId}/units/${unitId}/rollback`, {}).pipe(
            catchError(this.handleError),
        );
    }

    retryTargetDeletion(runId: string, assetId: string): Observable<unknown> {
        return this.http.post(`${baseUrl}/runs/${runId}/assets/${assetId}/retry-target-deletion`, {}).pipe(
            catchError(this.handleError),
        );
    }

    private runAction(runId: string, action: string): Observable<unknown> {
        return this.http.post(`${baseUrl}/runs/${runId}/${action}`, {}).pipe(
            catchError(this.handleError),
        );
    }
}
