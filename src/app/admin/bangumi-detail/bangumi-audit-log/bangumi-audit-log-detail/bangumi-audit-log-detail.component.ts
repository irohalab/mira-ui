import { DatePipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, HostBinding, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { DARK_THEME, DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ADMIN_AUDIT_ACTION_LABELS, AdminAuditLog, AdminAuditLogDetail } from '../../../../entity/admin/AdminAuditLog';
import { extractErrorMessage } from '../../../../../helpers/http-error-helper';
import { AdminService } from '../../../admin.service';

const DETAIL_LABELS: Record<string, string> = {
    name: '资源名称',
    fields: '变更字段',
    status: '变更后状态',
    upstreamItemId: '上游条目 ID',
    added: '新增剧集数',
    updated: '更新剧集数',
    prepared: '准备的视频文件数',
    episodeCount: '剧集总数',
    resourceGroupId: '资源组 ID',
    generated: '生成数量',
    steps: '分步结果',
};

@Component({
    selector: 'app-bangumi-audit-log-detail',
    templateUrl: './bangumi-audit-log-detail.component.html',
    styleUrl: './bangumi-audit-log-detail.component.less',
    imports: [DatePipe, NgClass, A11yModule],
})
export class BangumiAuditLogDetailComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private detailRequest?: Subscription;

    @Input()
    log!: AdminAuditLog;

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    readonly actionLabels = ADMIN_AUDIT_ACTION_LABELS;
    detail?: AdminAuditLogDetail;
    detailRows: {label: string; value: string}[] = [];
    isLoading = false;
    errorMessage = '';

    constructor(private adminService: AdminService,
                private darkThemeService: DarkThemeService,
                private dialogRef: UIDialogRef<BangumiAuditLogDetailComponent>,
                private changeDetector: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.subscription.add(this.darkThemeService.themeChange.subscribe(theme => {
            this.isDarkTheme = theme === DARK_THEME;
            this.changeDetector.markForCheck();
        }));
        this.loadDetail();
    }

    ngOnDestroy(): void {
        this.detailRequest?.unsubscribe();
        this.subscription.unsubscribe();
    }

    loadDetail(): void {
        this.detailRequest?.unsubscribe();
        this.isLoading = true;
        this.errorMessage = '';
        this.detailRequest = this.adminService.getAdminAuditLog(this.log.id)
            .pipe(finalize(() => {
                this.isLoading = false;
                this.changeDetector.markForCheck();
            })).subscribe({
                next: detail => {
                    this.detail = detail;
                    this.detailRows = Object.entries(detail.details ?? {}).map(([key, value]) => ({
                        label: DETAIL_LABELS[key] || key,
                        value: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
                    }));
                    this.changeDetector.markForCheck();
                },
                error: (error: HttpErrorResponse) => {
                    this.errorMessage = error.status === 404
                        ? '此日志已过期或不存在。'
                        : extractErrorMessage(error) || '无法加载日志详情，请重试。';
                    this.changeDetector.markForCheck();
                },
            });
    }

    @HostListener('keydown.escape')
    close(): void {
        this.dialogRef.close();
    }
}
