import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, Observable, Subscription, timer } from 'rxjs';
import { finalize, switchMap, takeWhile } from 'rxjs/operators';
import { DARK_THEME, DarkThemeService, UIPagination, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { AdminNavbar } from '../admin-navbar/admin-navbar.component';
import { ConfirmDialogDirective } from '../../confirm-dialog/confirm-dialog.directive';
import { environment } from '../../../environments/environment';
import {
    formatStorageBytes,
    StorageMigrationAsset,
    StorageMigrationReviewDecision,
    StorageMigrationRun,
    StorageMigrationUnit,
    StorageMigrationUnitFilter,
    StorageMigrationUnitStatus,
} from './storage-migration.models';
import { StorageMigrationService } from './storage-migration.service';

@Component({
    selector: 'storage-migration-run-detail',
    templateUrl: './storage-migration-run-detail.html',
    styleUrls: ['./storage-migration.less'],
    imports: [AdminNavbar, ConfirmDialogDirective, DatePipe, FormsModule, NgClass, UIPagination],
})
export class StorageMigrationRunDetailComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private pollingSubscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private expandedUnitIds = new Set<string>();
    private busyActions = new Set<string>();

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    readonly runId: string;
    run?: StorageMigrationRun;
    units: StorageMigrationUnit[] = [];
    unitPage = 1;
    readonly unitCount = 20;
    unitTotal = 0;
    unitStatus: StorageMigrationUnitStatus | '' = '';
    reviewFilter: StorageMigrationUnitFilter['review'] = 'all';
    hasIssues = false;
    reviewNotes: Record<string, string> = {};
    isLoading = false;
    errorMessage = '';

    readonly unitStatuses: StorageMigrationUnitStatus[] = [
        'queued', 'copying', 'verified', 'switched-retained', 'rollback-requested', 'rolled-back', 'failed', 'locally-cleaned',
    ];

    constructor(route: ActivatedRoute,
                private migrationService: StorageMigrationService,
                private darkThemeService: DarkThemeService,
                toast: UIToast,
                title: Title) {
        this.runId = route.snapshot.paramMap.get('id') || '';
        title.setTitle(`迁移任务 - ${environment.siteTitle}`);
        this.toastRef = toast.makeText();
    }

    ngOnInit(): void {
        this.subscription.add(this.darkThemeService.themeChange.subscribe(theme => {
            this.isDarkTheme = theme === DARK_THEME;
        }));
        this.startPolling();
    }

    ngOnDestroy(): void {
        this.pollingSubscription.unsubscribe();
        this.subscription.unsubscribe();
    }

    refreshUnits(page: number): void {
        this.unitPage = page;
        this.startPolling();
    }

    filtersChanged(): void {
        this.unitPage = 1;
        this.startPolling();
    }

    runAction(action: 'start' | 'pause' | 'resume' | 'cancel' | 'rollback' | 'cleanup'): void {
        const calls: Record<typeof action, (id: string) => Observable<unknown>> = {
            start: id => this.migrationService.start(id),
            pause: id => this.migrationService.pause(id),
            resume: id => this.migrationService.resume(id),
            cancel: id => this.migrationService.cancel(id),
            rollback: id => this.migrationService.rollbackRun(id),
            cleanup: id => this.migrationService.cleanup(id),
        };
        this.execute(`run:${action}`, calls[action](this.runId), '操作已提交');
    }

    review(unit: StorageMigrationUnit, decision: StorageMigrationReviewDecision): void {
        this.execute(
            `review:${unit.id}`,
            this.migrationService.review(this.runId, unit.id, decision, this.reviewNotes[unit.id]?.trim() || undefined),
            decision === 'approved' ? '审核已通过' : '已拒绝并请求回滚',
        );
    }

    retryUnit(unit: StorageMigrationUnit): void {
        this.execute(`retry:${unit.id}`, this.migrationService.retryUnit(this.runId, unit.id), '重试已提交');
    }

    rollbackUnit(unit: StorageMigrationUnit): void {
        this.execute(`rollback:${unit.id}`, this.migrationService.rollbackUnit(this.runId, unit.id), '回滚已提交');
    }

    retryTargetDeletion(asset: StorageMigrationAsset): void {
        this.execute(
            `target:${asset.id}`,
            this.migrationService.retryTargetDeletion(this.runId, asset.id),
            '目标清理重试已提交',
        );
    }

    toggleUnit(unitId: string): void {
        if (this.expandedUnitIds.has(unitId)) this.expandedUnitIds.delete(unitId);
        else this.expandedUnitIds.add(unitId);
    }

    isExpanded(unitId: string): boolean {
        return this.expandedUnitIds.has(unitId);
    }

    isBusy(key: string): boolean {
        return this.busyActions.has(key);
    }

    playerUrl(unit: StorageMigrationUnit): string {
        return unit.videoFileId
            ? `/play/${encodeURIComponent(unit.episodeId)}?video_id=${encodeURIComponent(unit.videoFileId)}`
            : '';
    }

    bangumiUrl(unit: StorageMigrationUnit): string {
        return `/admin/bangumi/${encodeURIComponent(unit.bangumiId)}`;
    }

    formatBytes(value: string): string {
        return formatStorageBytes(value);
    }

    statusLabel(status: string): string {
        return status.replaceAll('-', ' ');
    }

    statusClass(status: string): string {
        if (status === 'failed' || status === 'rollback-requested' || status === 'rejected') return 'red';
        if (status === 'completed' || status === 'cleanup-ready' || status === 'approved' || status === 'locally-cleaned') return 'green';
        if (status === 'running' || status === 'copying' || status === 'cleaning') return 'blue';
        if (status === 'awaiting-review' || status === 'paused') return 'yellow';
        return 'grey';
    }

    private startPolling(): void {
        this.pollingSubscription.unsubscribe();
        this.pollingSubscription = new Subscription();
        this.isLoading = true;
        this.errorMessage = '';
        this.pollingSubscription.add(timer(0, 5000).pipe(
            switchMap(() => forkJoin({
                run: this.migrationService.getRun(this.runId),
                units: this.migrationService.listUnits(
                    this.runId,
                    (this.unitPage - 1) * this.unitCount,
                    this.unitCount,
                    {
                        status: this.unitStatus || undefined,
                        review: this.reviewFilter,
                        hasIssues: this.hasIssues,
                    },
                ),
            })),
            takeWhile(result => this.isActive(result.run), true),
            finalize(() => { this.isLoading = false; }),
        ).subscribe({
            next: result => {
                this.run = result.run;
                this.units = result.units.data;
                this.unitTotal = result.units.total;
                this.isLoading = false;
            },
            error: error => {
                this.errorMessage = this.errorText(error);
                this.isLoading = false;
            },
        }));
    }

    private execute(key: string, operation: Observable<unknown>, successMessage: string): void {
        if (this.busyActions.has(key)) return;
        this.busyActions.add(key);
        this.errorMessage = '';
        this.subscription.add(operation.pipe(
            finalize(() => this.busyActions.delete(key)),
        ).subscribe({
            next: () => {
                this.toastRef.show(successMessage);
                this.startPolling();
            },
            error: error => { this.errorMessage = this.errorText(error); },
        }));
    }

    private isActive(run: StorageMigrationRun): boolean {
        return run.workerPending;
    }

    private errorText(error: unknown): string {
        if (error && typeof error === 'object' && 'message' in error) return String(error.message);
        return String(error);
    }
}
