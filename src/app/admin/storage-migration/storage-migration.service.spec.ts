import { of } from 'rxjs';
import { StorageMigrationService } from './storage-migration.service';
import { formatStorageBytes, storageBudgetPercent } from './storage-migration.models';

describe('StorageMigrationService', () => {
    it('maps overview and action URLs', () => {
        const calls: Array<{method: string; url: string; body?: unknown}> = [];
        const http = {
            get: (url: string) => {
                calls.push({method: 'GET', url});
                return of({data: {enabled: true}});
            },
            post: (url: string, body: unknown) => {
                calls.push({method: 'POST', url, body});
                return of({data: {}});
            },
        };
        const service = new StorageMigrationService(http as never);

        service.getOverview().subscribe(overview => expect(overview.enabled).toBeTrue());
        service.pause('run-id').subscribe();
        service.review('run-id', 'unit-id', 'rejected', 'failed playback').subscribe();

        expect(calls[0].url).toContain('/admin/storage-migration/overview');
        expect(calls[1].url).toContain('/runs/run-id/pause');
        expect(calls[2]).toEqual(jasmine.objectContaining({
            method: 'POST',
            url: jasmine.stringMatching(/runs\/run-id\/units\/unit-id\/review$/),
            body: {decision: 'rejected', note: 'failed playback'},
        }));
    });

    it('formats decimal-string byte values without Number precision loss', () => {
        expect(formatStorageBytes('1099511627776')).toBe('1 TiB');
        expect(formatStorageBytes('9895604649984')).toBe('9 TiB');
        expect(formatStorageBytes('invalid')).toBe('—');
        expect(storageBudgetPercent('50', '100')).toBe(50);
    });
});
