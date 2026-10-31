import { of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { StorageMigrationRunDetailComponent } from './storage-migration-run-detail.component';
import { StorageMigrationRun, StorageMigrationUnit } from './storage-migration.models';

const run: StorageMigrationRun = {
    id: 'run-id', mode: 'canary', status: 'awaiting-review', stage: 'review', requestedAction: null, workerPending: false,
    limits: {videoFiles: 10, sourceBytes: '100', reviewSamples: 10},
    summary: {selectedUnits: 1, verifiedUnits: 1, completedUnits: 1, failedUnits: 0, reviewedUnits: 0, retainedUnits: 1, cleanedUnits: 0, selectedBytes: '100', retainedBytes: '100'},
    lifecycle: {total: 1, verified: 0, switched: 1, rollbackRequested: 0, rolledBack: 0, cleaned: 0, failed: 0, retained: 1, reviewRequired: 1, reviewApproved: 0, pendingTargetDeletion: 0, actionableTargetDeletion: 0},
    createdByAccountId: 'account-id', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    startedAt: null, finishedAt: null, cleanupStartedAt: null, cleanupFinishedAt: null, lastError: null,
    availableActions: {start: false, pause: false, resume: false, cancel: false, rollback: true, cleanup: false},
};

const unit: StorageMigrationUnit = {
    id: 'unit-id', runId: 'run-id', videoFileId: 'video id', bangumiId: 'bangumi-id', episodeId: 'episode id', episodeNo: 1,
    status: 'switched-retained', reviewRequired: true, reviewDecision: null, reviewedByAccountId: null, reviewedAt: null, reviewNote: null,
    warnings: [], lastError: null, sourceBytes: '100', assetProgress: {total: 1, verified: 1, failed: 0, cleaned: 0},
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assets: [],
    availableActions: {approve: true, reject: true, retry: false, rollback: true, openPlayer: true},
};

describe('StorageMigrationRunDetailComponent', () => {
    it('loads the run and units, generates a safe player URL, and submits review', fakeAsync(() => {
        let reviewRequest: unknown[] = [];
        const service = {
            getRun: () => of(run),
            listUnits: () => of({data: [unit], total: 1}),
            review: (...args: unknown[]) => {
                reviewRequest = args;
                return of({});
            },
        };
        const component = new StorageMigrationRunDetailComponent(
            {snapshot: {paramMap: {get: () => 'run-id'}}} as never,
            service as never,
            {themeChange: of('light')} as never,
            {makeText: () => ({show: (): void => undefined})} as never,
            {setTitle: (): void => undefined} as never,
        );

        component.ngOnInit();
    tick(0);
        component.reviewNotes[unit.id] = ' looks good ';
        component.review(unit, 'approved');
    tick(0);

        expect(component.unitTotal).toBe(1);
        expect(component.bangumiUrl(unit)).toBe('/admin/bangumi/bangumi-id');
        expect(component.playerUrl(unit)).toBe('/play/episode%20id?video_id=video%20id');
        expect(reviewRequest).toEqual(['run-id', 'unit-id', 'approved', 'looks good']);
        component.ngOnDestroy();
    }));

    it('polls a paused rollback until server-derived worker work is complete', fakeAsync(() => {
        let runCalls = 0;
        const pendingRun = {...run, status: 'paused' as const, workerPending: true};
        const stableRun = {...pendingRun, workerPending: false};
        const component = new StorageMigrationRunDetailComponent(
            {snapshot: {paramMap: {get: () => 'run-id'}}} as never,
            {
                getRun: () => of(++runCalls === 1 ? pendingRun : stableRun),
                listUnits: () => of({data: [unit], total: 1}),
            } as never,
            {themeChange: of('light')} as never,
            {makeText: () => ({show: (): void => undefined})} as never,
            {setTitle: (): void => undefined} as never,
        );

        component.ngOnInit();
        tick(0);
        tick(5000);
        tick(5000);

        expect(runCalls).toBe(2);
        component.ngOnDestroy();
    }));

    it('describes live inventory progress', () => {
        const component = new StorageMigrationRunDetailComponent(
            {snapshot: {paramMap: {get: () => 'run-id'}}} as never,
            {} as never,
            {} as never,
            {makeText: () => ({show: (): void => undefined})} as never,
            {setTitle: (): void => undefined} as never,
        );
        component.run = {
            ...run,
            status: 'inventory',
            summary: {
                ...run.summary,
                selectedUnits: 12,
                selectedBytes: '1048576',
                inventory: {phase: 'selecting', examinedRecords: 40, dispositionCounts: {}, lookupWarnings: []},
            },
        };

        expect(component.inventoryProgress()).toBe('正在筛选本地文件 · 已检查 40 条，已选择 12 个单元（1 MiB）');
    });
});
