import { ChangeDetectorRef, Component, HostBinding, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DARK_THEME, DarkThemeService, UIDialog, UIDialogRef, UIPagination } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ADMIN_AUDIT_ACTION_LABELS, AdminAuditLog } from '../../../entity/admin/AdminAuditLog';
import { AdminService } from '../../admin.service';
import { extractErrorMessage } from '../../../../helpers/http-error-helper';
import { BangumiAuditLogDetailComponent } from './bangumi-audit-log-detail/bangumi-audit-log-detail.component';

@Component({
    selector: 'app-bangumi-audit-log',
    imports: [NgClass, DatePipe, UIPagination],
    templateUrl: './bangumi-audit-log.component.html',
    styleUrl: './bangumi-audit-log.component.less',
})
export class BangumiAuditLogComponent implements OnInit, OnChanges, OnDestroy {
    private subscription = new Subscription();
    private pageRequest?: Subscription;
    private detailDialog?: UIDialogRef<BangumiAuditLogDetailComponent>;

    @Input({required: true})
    bangumiId!: string;

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    readonly actionLabels = ADMIN_AUDIT_ACTION_LABELS;
    readonly countPerPage = 20;
    auditLogs: AdminAuditLog[] = [];
    currentPage = 1;
    total = 0;
    isLoading = false;
    errorMessage = '';

    constructor(private adminService: AdminService,
                private darkThemeService: DarkThemeService,
                private dialog: UIDialog,
                private changeDetector: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.subscription.add(this.darkThemeService.themeChange.subscribe(theme => {
            this.isDarkTheme = theme === DARK_THEME;
            this.changeDetector.markForCheck();
        }));
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['bangumiId']) {
            this.pageRequest?.unsubscribe();
            this.detailDialog?.close();
            this.auditLogs = [];
            this.total = 0;
            this.currentPage = 1;
            if (this.bangumiId) this.loadPage(1);
        }
    }

    ngOnDestroy(): void {
        this.pageRequest?.unsubscribe();
        this.detailDialog?.close();
        this.subscription.unsubscribe();
    }

    loadPage(page = this.currentPage): void {
        this.pageRequest?.unsubscribe();
        this.isLoading = true;
        this.errorMessage = '';
        this.auditLogs = [];
        this.currentPage = page;
        this.pageRequest = this.adminService.listBangumiAuditLogs(
            this.bangumiId, (page - 1) * this.countPerPage, this.countPerPage
        ).pipe(finalize(() => {
            this.isLoading = false;
            this.changeDetector.markForCheck();
        })).subscribe({
            next: response => {
                this.total = response.total;
                this.auditLogs = response.data;
                this.changeDetector.markForCheck();
            },
            error: (error: HttpErrorResponse) => {
                this.errorMessage = extractErrorMessage(error) || '无法加载操作日志，请重试。';
                this.changeDetector.markForCheck();
            },
        });
    }

    showDetails(log: AdminAuditLog): void {
        if (this.detailDialog) return;
        const dialog = this.dialog.open(BangumiAuditLogDetailComponent, {stickyDialog: true, backdrop: true});
        dialog.componentInstance.log = log;
        this.detailDialog = dialog;
        this.subscription.add(dialog.afterClosed().subscribe(() => { this.detailDialog = undefined; }));
    }
}
