import { of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { StorageMigrationDashboardComponent } from './storage-migration-dashboard.component';
import { StorageMigrationOverview, StorageMigrationRun } from './storage-migration.models';

const run: StorageMigrationRun = {
    id: 'run-id', mode: 'canary', status: 'ready', stage: 'inventory', requestedAction: null, workerPending: false,
    limits: {videoFiles: 10, sourceBytes: '100', reviewSamples: 10},
    summary: {selectedUnits: 10, verifiedUnits: 0, completedUnits: 0, failedUnits: 0, reviewedUnits: 0, retainedUnits: 0, cleanedUnits: 0, selectedBytes: '100', retainedBytes: '0'},
    createdByAccountId: 'account-id', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    startedAt: null, finishedAt: null, cleanupStartedAt: null, cleanupFinishedAt: null, lastError: null,
    availableActions: {start: true, pause: false, resume: false, cancel: true, rollback: false, cleanup: false},
};

const overview: StorageMigrationOverview = {
    enabled: true,
    buckets: {video: 'video', image: 'image'},
    limits: {retainedBytes: '50', retainedLimitBytes: '100', canaryUnits: 10, batchUnits: 50, batchBytes: String(50 * 1024 ** 3), reviewSamples: 3, workerPollSeconds: 5},
    canaryGate: {required: 10, approved: false, unlocked: false},
    preflight: {status: 'ready', checkedAt: null, error: null},
    eligibility: {total: 10, eligible: 10, statusNotDownloaded: 0, missingFilePath: 0, alreadyS3: 0, externalBlob: 0, softDeleted: 0, activeMigration: 0, requiresWorkerInspection: 10},
    activeRun: run,
};

describe('StorageMigrationDashboardComponent', () => {
    it('loads overview/history and creates a canary run', fakeAsync(() => {
        let createdMode = '';
        let navigatedTo: unknown[] = [];
        const service = {
            getOverview: () => of(overview),
            listRuns: () => of({data: [run], total: 1}),
            createRun: (request: {mode: string}) => {
                createdMode = request.mode;
                return of(run);
            },
        };
        const component = new StorageMigrationDashboardComponent(
            service as never,
            {themeChange: of('light')} as never,
            {navigate: (commands: unknown[]) => { navigatedTo = commands; }} as never,
            {makeText: () => ({show: (): void => undefined})} as never,
            {setTitle: (): void => undefined} as never,
        );

        component.ngOnInit();
    tick(0);
        component.createCanary();
    tick(0);

        expect(component.overview?.enabled).toBeTrue();
        expect(component.runTotal).toBe(1);
        expect(component.budgetPercent()).toBe(50);
        expect(createdMode).toBe('canary');
        expect(navigatedTo).toEqual(['/admin/storage-migration/runs', 'run-id']);
        component.ngOnDestroy();
    }));

    it('rejects invalid or cross-field batch limits before calling the API', fakeAsync(() => {
        let createCalls = 0;
        const unlockedOverview: StorageMigrationOverview = {
            ...overview,
            activeRun: null,
            canaryGate: {...overview.canaryGate, unlocked: true},
        };
        const component = new StorageMigrationDashboardComponent(
            {
                getOverview: () => of(unlockedOverview),
                listRuns: () => of({data: [], total: 0}),
                createRun: () => { createCalls++; return of(run); },
            } as never,
            {themeChange: of('light')} as never,
            {navigate: (): void => undefined} as never,
            {makeText: () => ({show: (): void => undefined})} as never,
            {setTitle: (): void => undefined} as never,
        );
        component.ngOnInit();
        tick(0);
        component.batchVideoFileLimit = 2;
        component.batchReviewSampleCount = 3;

        component.createBatch();

        expect(component.canCreateBatch()).toBeFalse();
        expect(createCalls).toBe(0);
        component.ngOnDestroy();
    }));

    it('directs an approved canary to cleanup or rollback before another run', () => {
        const component = new StorageMigrationDashboardComponent(
            {} as never,
            {} as never,
            {} as never,
            {makeText: () => ({show: (): void => undefined})} as never,
            {setTitle: (): void => undefined} as never,
        );
        component.overview = {
            ...overview,
            canaryGate: {...overview.canaryGate, unlocked: true},
            activeRun: {...run, status: 'cleanup-ready', stage: 'cleanup'},
        };

        expect(component.activeRunActionLabel()).toBe('前往清理或回滚');
        expect(component.creationBlockedMessage()).toContain('请先清理本地源或回滚全部');
        expect(component.canCreateBatch()).toBeFalse();
    });

    it('polls a paused run while worker work remains and stops when stable', fakeAsync(() => {
        let overviewCalls = 0;
        const pendingRun = {...run, status: 'paused' as const, workerPending: true};
        const stableRun = {...pendingRun, workerPending: false};
        const component = new StorageMigrationDashboardComponent(
            {
                getOverview: () => of({...overview, activeRun: ++overviewCalls === 1 ? pendingRun : stableRun}),
                listRuns: () => of({data: [], total: 0}),
            } as never,
            {themeChange: of('light')} as never,
            {navigate: (): void => undefined} as never,
            {makeText: () => ({show: (): void => undefined})} as never,
            {setTitle: (): void => undefined} as never,
        );

        component.ngOnInit();
        tick(0);
        tick(5000);
        tick(5000);

        expect(overviewCalls).toBe(2);
        component.ngOnDestroy();
    }));
});
