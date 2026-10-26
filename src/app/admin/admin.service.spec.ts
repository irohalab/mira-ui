import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { AdminService } from './admin.service';
import { EpisodeAdminPayload, EpisodeUpstreamFieldsResult } from '../entity/admin/EpisodeAdminEntity';
import { environment } from '../../environments/environment';

describe('AdminService episode editing', () => {
    let service: AdminService;
    let http: HttpTestingController;
    const episodeId = '10000000-0000-4000-8000-000000000001';
    const url = `${environment.resourceProvider}/admin/episode/${episodeId}`;
    const payload: EpisodeAdminPayload = {
        bangumiId: '20000000-0000-4000-8000-000000000002', subItemId: null, type: null,
        bgmEpsId: 42, episodeNo: 0, sort: 0.5, name: null, nameCn: null,
        duration: null, airdate: null, properties: {}, status: 0
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(AdminService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('sends nullable metadata without read-only or deprecated fields', () => {
        service.updateEpisodeFields(episodeId, payload).subscribe();

        const request = http.expectOne(`${url}/fields`);
        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual(payload);
        request.flush(null);
    });

    it('returns both imported fields and skipped-field warnings from a successful upstream fill', () => {
        const result: EpisodeUpstreamFieldsResult = {
            fields: {name: 'Imported title', type: null},
            warnings: [{field: 'properties', message: 'Existing properties kept.'}]
        };
        let received: EpisodeUpstreamFieldsResult | undefined;
        service.getEpisodeUpstreamFields(episodeId, '30000000-0000-4000-8000-000000000003')
            .subscribe(response => { received = response; });

        const request = http.expectOne(response => response.url === `${url}/upstream`);
        expect(request.request.params.get('subItemId')).toBe('30000000-0000-4000-8000-000000000003');
        request.flush(result);

        expect(received).toEqual(result);
    });

    for (const operation of ['save', 'fill'] as const) {
        it(`preserves the server validation message when ${operation} returns HTTP 400`, () => {
            let error: HttpErrorResponse | undefined;
            const request: Observable<unknown> = operation === 'save'
                ? service.updateEpisodeFields(episodeId, payload)
                : service.getEpisodeUpstreamFields(episodeId, '30000000-0000-4000-8000-000000000003');
            request.subscribe({error: (response: HttpErrorResponse) => { error = response; }});

            const message = operation === 'save' ? 'airdate must be a valid date or null.' : 'Invalid episode id or subItemId.';
            http.expectOne(response => response.url === `${url}/${operation === 'save' ? 'fields' : 'upstream'}`)
                .flush({message}, {status: 400, statusText: 'Bad Request'});

            expect(error instanceof HttpErrorResponse).toBeTrue();
            expect(error?.status).toBe(400);
            expect(error?.error).toEqual({message});
        });
    }
});
