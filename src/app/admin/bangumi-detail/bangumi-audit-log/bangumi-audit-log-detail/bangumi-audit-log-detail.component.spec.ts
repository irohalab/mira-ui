import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { DARK_THEME, DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import { Observable, of, throwError } from 'rxjs';
import { AdminService } from '../../../admin.service';
import { AdminAuditLogDetail } from '../../../../entity/admin/AdminAuditLog';
import { BangumiAuditLogDetailComponent } from './bangumi-audit-log-detail.component';

describe('BangumiAuditLogDetailComponent', () => {
    let component: BangumiAuditLogDetailComponent;
    let fixture: ComponentFixture<BangumiAuditLogDetailComponent>;
    let service: jasmine.SpyObj<AdminService>;
    let dialogRef: jasmine.SpyObj<UIDialogRef<BangumiAuditLogDetailComponent>>;
    const detail: AdminAuditLogDetail = {
        id: '20000000-0000-4000-8000-000000000002',
        timestamp: '2026-11-15T10:00:00Z',
        accountId: '30000000-0000-4000-8000-000000000003',
        actor: {uid: null, nickName: 'Test admin', role: 'Admin'},
        action: 'episode.fields-update',
        summary: 'Updated episode "Example".',
        resourceType: 'episode',
        resourceId: '40000000-0000-4000-8000-000000000004',
        bangumiIds: ['10000000-0000-4000-8000-000000000001'],
        details: {name: 'Example', fields: ['name', 'status'], status: 2},
    };

    beforeEach(async () => {
        service = jasmine.createSpyObj<AdminService>('AdminService', ['getAdminAuditLog']);
        service.getAdminAuditLog.and.returnValue(of(detail));
        dialogRef = jasmine.createSpyObj<UIDialogRef<BangumiAuditLogDetailComponent>>('UIDialogRef', ['close']);
        await TestBed.configureTestingModule({
            imports: [BangumiAuditLogDetailComponent],
            providers: [
                {provide: AdminService, useValue: service},
                {provide: DarkThemeService, useValue: {themeChange: of(DARK_THEME)}},
                {provide: UIDialogRef, useValue: dialogRef},
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(BangumiAuditLogDetailComponent);
        component = fixture.componentInstance;
        component.log = detail;
    });

    it('fetches one log and displays resource identity and actual change fields', () => {
        fixture.detectChanges();
        expect(service.getAdminAuditLog).toHaveBeenCalledOnceWith(detail.id);
        const element: HTMLElement = fixture.nativeElement;
        expect(element.textContent).toContain('变更字段');
        expect(element.textContent).toContain('"status"');
        expect(element.textContent).toContain(detail.resourceId);
        expect(element.querySelector('[role=dialog]').getAttribute('aria-modal')).toBe('true');
    });

    it('explains when no additional details were retained', () => {
        service.getAdminAuditLog.and.returnValue(of({...detail, details: null}));
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('隐私保护未记录');
    });

    it('renders nested partial-deletion steps without HTML injection', () => {
        service.getAdminAuditLog.and.returnValue(of({
            ...detail, details: {
                name: '<script>unsafe</script>',
                steps: {storage: 'removed', torrentCleanup: 'failed', database: 'unchanged'},
            },
        }));
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        expect(element.textContent).toContain('分步结果');
        expect(element.textContent).toContain('"database": "unchanged"');
        expect(element.querySelector('script')).toBeNull();
    });

    it('shows expired log failures and retries the detail request', () => {
        service.getAdminAuditLog.and.returnValue(throwError(() => new HttpErrorResponse({status: 404})));
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('已过期或不存在');
        service.getAdminAuditLog.and.returnValue(of(detail));
        fixture.nativeElement.querySelector('.negative.message button').click();
        fixture.detectChanges();
        expect(service.getAdminAuditLog).toHaveBeenCalledTimes(2);
        expect(component.errorMessage).toBe('');
    });

    it('cancels a pending detail request when the dialog closes', () => {
        const cancelled = jasmine.createSpy('cancelled');
        service.getAdminAuditLog.and.returnValue(new Observable<AdminAuditLogDetail>(() => cancelled));
        fixture.detectChanges();
        fixture.destroy();
        expect(cancelled).toHaveBeenCalled();
    });

    it('can close with its button or Escape', () => {
        fixture.detectChanges();
        fixture.nativeElement.querySelector('.detail-footer button').click();
        expect(dialogRef.close).toHaveBeenCalledTimes(1);
        fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
        expect(dialogRef.close).toHaveBeenCalledTimes(2);
    });
});
