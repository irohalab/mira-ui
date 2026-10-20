import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import { of } from 'rxjs';
import { Account } from '../../../entity/Account';
import { FavoriteSyncLogModal } from './favorite-sync-log-modal.component';

describe('FavoriteSyncLogModal', () => {
    let fixture: ComponentFixture<FavoriteSyncLogModal>;
    const downloadUrl = 'https://storage.example.test/private-favorite-sync/log.json.gz?signed=example';

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FavoriteSyncLogModal],
            providers: [
                {provide: UIDialogRef, useValue: {close: jasmine.createSpy('close')}},
                {provide: DarkThemeService, useValue: {themeChange: of('light')}},
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(FavoriteSyncLogModal);
        fixture.componentInstance.account = {id: 'account-1', nickName: 'Viewer'} as Account;
        fixture.componentInstance.sync = {
            progress: {
                syncId: 'sync-1',
                status: 'completed',
                stage: 'completed',
                completedBatches: 2,
                totalBatches: 2,
                percentage: 100,
                startedAt: new Date(0).toISOString(),
                updatedAt: new Date(1).toISOString(),
            },
            logPath: downloadUrl,
        };
    });

    it('offers a direct native download without rendering the log payload', () => {
        fixture.detectChanges();
        const element = fixture.nativeElement as HTMLElement;
        const link = element.querySelector<HTMLAnchorElement>('a[href]');

        expect(link?.getAttribute('href')).toBe(downloadUrl);
        expect(link?.target).toBe('_blank');
        expect(link?.rel).toBe('noopener noreferrer');
        expect(element.querySelector('pre')).toBeNull();
        expect(element.querySelector('.sync-summary')?.textContent).toContain('100%');
    });

    it('keeps progress visible without offering a link when no log exists', () => {
        fixture.componentInstance.sync.logPath = null;
        fixture.detectChanges();
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('a[href]')).toBeNull();
        expect(element.querySelector('.ui.message')).not.toBeNull();
        expect(element.querySelector('.sync-summary')?.textContent).toContain('100%');
    });
});