import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from '../../admin.service';
import { environment } from '../../../../environments/environment';

describe('Admin audit API', () => {
    let service: AdminService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({providers: [AdminService, provideHttpClient(), provideHttpClientTesting()]});
        service = TestBed.inject(AdminService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('uses the same-origin admin audit endpoint and requests only a bangumi summary page', () => {
        service.listBangumiAuditLogs('bangumi-id', 20, 20).subscribe(response => {
            expect(response).toEqual({data: [], total: 0});
        });
        const request = http.expectOne(req => req.url === `${environment.resourceProvider}/admin/audit`);
        expect(request.request.params.get('bangumiId')).toBe('bangumi-id');
        expect(request.request.params.get('offset')).toBe('20');
        expect(request.request.params.get('limit')).toBe('20');
        expect(request.request.params.get('sort')).toBe('desc');
        expect(request.request.params.get('includeDetails')).toBe('false');
        request.flush({data: [], total: 0});
    });

    it('unwraps detail data only when requested', () => {
        service.getAdminAuditLog('log-id').subscribe(detail => expect(detail.id).toBe('log-id'));
        http.expectOne(`${environment.resourceProvider}/admin/audit/log-id`).flush({data: {id: 'log-id'}});
    });
});
