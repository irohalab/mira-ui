import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, Subscription, timer } from 'rxjs';
import { finalize, switchMap, takeWhile } from 'rxjs/operators';
import { DARK_THEME, DarkThemeService, UIPagination, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { AdminNavbar } from '../admin-navbar/admin-navbar.component';
import { environment } from '../../../environments/environment';
import {
    CreateStorageMigrationRun,
    formatStorageBytes,
    storageBudgetPercent,
    StorageMigrationOverview,
    StorageMigrationRun,
} from './storage-migration.models';
import { StorageMigrationService } from './storage-migration.service';

@Component({
    selector: 'storage-migration-dashboard',
    templateUrl: './storage-migration-dashboard.html',
    styleUrls: ['./storage-migration.less'],
    imports: [AdminNavbar, DatePipe, DecimalPipe, FormsModule, NgClass, RouterLink, UIPagination],
})
export class StorageMigrationDashboardComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private pollingSubscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    overview?: StorageMigrationOverview;
    runs: StorageMigrationRun[] = [];
    runPage = 1;
    readonly runCount = 20;
    runTotal = 0;
    isLoading = false;
    isCreating = false;
    errorMessage = '';

    batchVideoFileLimit = 50;
    batchSourceLimitGiB = 50;
    batchReviewSampleCount = 3;
    allowOversizedSingle = false;

    constructor(private migrationService: StorageMigrationService,
                private darkThemeService: DarkThemeService,
                private router: Router,
                toast: UIToast,
                title: Title) {
        title.setTitle(`存储迁移 - ${environment.siteTitle}`);
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

    refreshRuns(page: number): void {
        this.runPage = page;
        this.startPolling();
    }

    createCanary(): void {
        this.createRun({mode: 'canary'});
    }

    createBatch(): void {
        if (!this.canCreateBatch()) return;
        this.createRun({
            mode: 'batch',
            videoFileLimit: this.batchVideoFileLimit,
            sourceLimitGiB: this.batchSourceLimitGiB,
            reviewSampleCount: this.batchReviewSampleCount,
            allowOversizedSingle: this.allowOversizedSingle,
        });
    }

    formatBytes(value: string): string {
        return formatStorageBytes(value);
    }

    budgetPercent(): number {
        return this.overview
            ? storageBudgetPercent(this.overview.limits.retainedBytes, this.overview.limits.retainedLimitBytes)
            : 0;
    }

    canCreateBatch(): boolean {
        if (!this.overview || !this.overview.enabled || !this.overview.canaryGate.unlocked
            || !!this.overview.activeRun || this.isCreating) return false;
        const maxSourceGiB = this.maxBatchSourceGiB();
        return Number.isInteger(this.batchVideoFileLimit)
            && this.batchVideoFileLimit >= 1
            && this.batchVideoFileLimit <= this.overview.limits.batchUnits
            && Number.isFinite(this.batchSourceLimitGiB)
            && this.batchSourceLimitGiB >= 1
            && this.batchSourceLimitGiB <= maxSourceGiB
            && Number.isInteger(this.batchReviewSampleCount)
            && this.batchReviewSampleCount >= 1
            && this.batchReviewSampleCount <= this.batchVideoFileLimit
            && this.batchReviewSampleCount <= this.overview.limits.reviewSamples;
    }

    maxBatchSourceGiB(): number {
        return this.overview
            ? Number(BigInt(this.overview.limits.batchBytes) / (1024n * 1024n * 1024n))
            : 0;
    }

    activeRunActionLabel(): string {
        return this.overview?.activeRun?.status === 'cleanup-ready'
            ? '前往清理或回滚'
            : '查看任务';
    }

    creationBlockedMessage(): string {
        if (!this.overview?.enabled) return '迁移服务未启用，不能创建任务。';
        if (this.overview.activeRun?.status === 'cleanup-ready') {
            return '当前任务已通过审核。请先清理本地源或回滚全部，结束任务后再创建批次。';
        }
        return this.overview.activeRun ? '当前任务结束后才能创建新任务。' : '';
    }

    statusLabel(status: string): string {
        return status.replaceAll('-', ' ');
    }

    statusClass(status: string): string {
        if (status === 'failed' || status === 'rollback-requested') return 'red';
        if (status === 'completed' || status === 'cleanup-ready') return 'green';
        if (status === 'running' || status === 'cleaning') return 'blue';
        if (status === 'awaiting-review' || status === 'paused') return 'yellow';
        return 'grey';
    }

    private createRun(request: CreateStorageMigrationRun): void {
        if (this.isCreating) return;
        this.isCreating = true;
        this.errorMessage = '';
        this.subscription.add(this.migrationService.createRun(request).pipe(
            finalize(() => { this.isCreating = false; }),
        ).subscribe({
            next: run => {
                this.toastRef.show('迁移任务已创建');
                this.router.navigate(['/admin/storage-migration/runs', run.id]);
            },
            error: error => { this.errorMessage = this.errorText(error); },
        }));
    }

    private startPolling(): void {
        this.pollingSubscription.unsubscribe();
        this.pollingSubscription = new Subscription();
        this.isLoading = true;
        this.errorMessage = '';
        this.pollingSubscription.add(timer(0, 5000).pipe(
            switchMap(() => forkJoin({
                overview: this.migrationService.getOverview(),
                runs: this.migrationService.listRuns((this.runPage - 1) * this.runCount, this.runCount),
            })),
            takeWhile(result => this.isActive(result.overview.activeRun), true),
            finalize(() => { this.isLoading = false; }),
        ).subscribe({
            next: result => {
                this.overview = result.overview;
                this.runs = result.runs.data;
                this.runTotal = result.runs.total;
                this.applyLimits(result.overview);
                this.isLoading = false;
            },
            error: error => {
                this.errorMessage = this.errorText(error);
                this.isLoading = false;
            },
        }));
    }

    private applyLimits(overview: StorageMigrationOverview): void {
        this.batchVideoFileLimit = Math.min(this.batchVideoFileLimit, overview.limits.batchUnits);
        this.batchReviewSampleCount = Math.min(this.batchReviewSampleCount, overview.limits.reviewSamples, this.batchVideoFileLimit);
        this.batchSourceLimitGiB = Math.min(
            this.batchSourceLimitGiB,
            Number(BigInt(overview.limits.batchBytes) / (1024n * 1024n * 1024n)),
        );
    }

    private isActive(run: StorageMigrationRun | null): boolean {
        return run?.workerPending === true;
    }

    private errorText(error: unknown): string {
        if (error && typeof error === 'object' && 'message' in error) return String(error.message);
        return String(error);
    }
}
