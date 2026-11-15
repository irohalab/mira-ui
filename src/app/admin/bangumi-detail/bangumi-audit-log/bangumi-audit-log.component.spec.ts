import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { DARK_THEME, DarkThemeService, UIDialog } from '@irohalab/deneb-ui';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { AdminService } from '../../admin.service';
import { AdminAuditLog, AdminAuditLogPage } from '../../../entity/admin/AdminAuditLog';
import { BangumiAuditLogComponent } from './bangumi-audit-log.component';
import { BangumiAuditLogDetailComponent } from './bangumi-audit-log-detail/bangumi-audit-log-detail.component';

describe('BangumiAuditLogComponent', () => {
    let component: BangumiAuditLogComponent;
    let fixture: ComponentFixture<BangumiAuditLogComponent>;
    let adminService: jasmine.SpyObj<AdminService>;
    let dialog: jasmine.SpyObj<UIDialog>;
    let theme: BehaviorSubject<string>;
    let closed: Subject<void>;
    let dialogClose: jasmine.Spy;
    let dialogInstance: Partial<BangumiAuditLogDetailComponent>;
    const bangumiId = '10000000-0000-4000-8000-000000000001';
    const log: AdminAuditLog = {
        id: '20000000-0000-4000-8000-000000000002',
        timestamp: '2026-11-15T10:00:00Z',
        accountId: '30000000-0000-4000-8000-000000000003',
        actor: {uid: null, nickName: 'Test admin', role: 'Admin'},
        action: 'episode.fields-update',
        summary: 'Updated episode "Example".',
    };

    beforeEach(async () => {
        adminService = jasmine.createSpyObj<AdminService>('AdminService', ['listBangumiAuditLogs', 'getAdminAuditLog']);
        adminService.listBangumiAuditLogs.and.returnValue(of({data: [log], total: 41}));
        theme = new BehaviorSubject<string>(DARK_THEME);
        closed = new Subject<void>();
        dialogClose = jasmine.createSpy('close').and.callFake(() => closed.next());
        dialogInstance = {};
        dialog = jasmine.createSpyObj<UIDialog>('UIDialog', ['open']);
        dialog.open.and.returnValue({
            componentInstance: dialogInstance, close: dialogClose, afterClosed: () => closed,
        } as never);
        await TestBed.configureTestingModule({
            imports: [BangumiAuditLogComponent],
            providers: [
                {provide: AdminService, useValue: adminService},
                {provide: DarkThemeService, useValue: {themeChange: theme}},
                {provide: UIDialog, useValue: dialog},
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(BangumiAuditLogComponent);
        component = fixture.componentInstance;
    });

    function activate(): void {
        fixture.componentRef.setInput('bangumiId', bangumiId);
        fixture.detectChanges();
    }

    it('does not fetch until it receives a bangumi ID and loads only summaries for that bangumi', () => {
        fixture.detectChanges();
        expect(adminService.listBangumiAuditLogs).not.toHaveBeenCalled();
        activate();
        expect(adminService.listBangumiAuditLogs).toHaveBeenCalledOnceWith(bangumiId, 0, 20);
        expect(adminService.getAdminAuditLog).not.toHaveBeenCalled();
        const element: HTMLElement = fixture.nativeElement;
        expect(element.textContent).toContain('Test admin');
        expect(element.textContent).toContain('更新剧集信息');
        expect(element.textContent).toContain(log.summary);
        expect(element.querySelector('ui-pagination')).not.toBeNull();
    });

    it('translates pages into offsets and refreshes the current page', () => {
        activate();
        component.loadPage(2);
        expect(adminService.listBangumiAuditLogs).toHaveBeenCalledWith(bangumiId, 20, 20);
        component.loadPage();
        expect(component.currentPage).toBe(2);
        expect(adminService.listBangumiAuditLogs.calls.mostRecent().args).toEqual([bangumiId, 20, 20]);
    });

    it('cancels superseded pages and pending requests when destroyed', () => {
        const cancelled = jasmine.createSpy('cancelled');
        adminService.listBangumiAuditLogs.and.returnValue(new Observable<AdminAuditLogPage>(() => cancelled));
        activate();
        expect(component.isLoading).toBeTrue();
        component.loadPage(2);
        expect(cancelled).toHaveBeenCalledTimes(1);
        fixture.destroy();
        expect(cancelled).toHaveBeenCalledTimes(2);
    });

    it('resets pagination and cancels stale results when the bangumi changes', () => {
        const first = new Subject<AdminAuditLogPage>();
        adminService.listBangumiAuditLogs.and.returnValue(first);
        activate();
        adminService.listBangumiAuditLogs.and.returnValue(of({data: [], total: 0}));
        fixture.componentRef.setInput('bangumiId', 'other-bangumi');
        fixture.detectChanges();
        first.next({data: [log], total: 41});
        expect(component.currentPage).toBe(1);
        expect(component.auditLogs).toEqual([]);
        expect(adminService.listBangumiAuditLogs.calls.mostRecent().args).toEqual(['other-bangumi', 0, 20]);
    });

    it('shows an empty state separately from a failed request and allows retry', () => {
        adminService.listBangumiAuditLogs.and.returnValue(throwError(() =>
            new HttpErrorResponse({status: 500, error: {message: 'Audit unavailable'}})));
        activate();
        const element: HTMLElement = fixture.nativeElement;
        expect(element.textContent).toContain('Audit unavailable');
        expect(element.textContent).not.toContain('暂无操作日志');
        adminService.listBangumiAuditLogs.and.returnValue(of({data: [], total: 0}));
        element.querySelector<HTMLButtonElement>('.negative.message button').click();
        fixture.detectChanges();
        expect(element.textContent).toContain('暂无操作日志');
        expect(component.isLoading).toBeFalse();
    });

    it('falls back to the stored account ID and renders summaries as text', () => {
        adminService.listBangumiAuditLogs.and.returnValue(of({
            data: [{...log, actor: null, summary: '<img src=x onerror=alert(1)>'}], total: 1,
        }));
        activate();
        const element: HTMLElement = fixture.nativeElement;
        expect(element.textContent).toContain(log.accountId);
        expect(element.querySelector('img')).toBeNull();
    });

    it('opens one details dialog on demand and closes it when leaving the tab', () => {
        activate();
        component.showDetails(log);
        component.showDetails(log);
        expect(dialog.open).toHaveBeenCalledOnceWith(BangumiAuditLogDetailComponent, {stickyDialog: true, backdrop: true});
        expect(dialogInstance.log).toBe(log);
        expect(adminService.getAdminAuditLog).not.toHaveBeenCalled();
        fixture.destroy();
        expect(dialogClose).toHaveBeenCalled();
    });

    it('updates the table theme without reloading its data', () => {
        activate();
        expect(fixture.nativeElement.querySelector('table.inverted')).not.toBeNull();
        theme.next('light_theme');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('table.inverted')).toBeNull();
        expect(adminService.listBangumiAuditLogs).toHaveBeenCalledTimes(1);
    });
});
