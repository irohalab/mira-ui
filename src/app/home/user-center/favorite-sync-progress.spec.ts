import { FormBuilder } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { of } from 'rxjs';
import { FavoriteSyncProgress } from '../../entity/Account';
import { UserService } from '../../user-service';
import { FavoriteService } from '../favorite.service';
import { UserCenter } from './user-center.component';

describe('UserCenter favorite sync progress', () => {
    let userService: jasmine.SpyObj<UserService>;
    let favoriteService: jasmine.SpyObj<FavoriteService>;
    let component: UserCenter;

    beforeEach(() => {
        userService = jasmine.createSpyObj<UserService>('UserService', ['getAccountInfo']);
        favoriteService = jasmine.createSpyObj<FavoriteService>('FavoriteService', ['syncFavorite']);
        component = new UserCenter(
            userService,
            {themeChange: of(DARK_THEME)} as DarkThemeService,
            favoriteService,
            new FormBuilder(),
            jasmine.createSpyObj<Title>('Title', ['setTitle']),
        );
        component.syncFormGroup = new FormBuilder().group({overrideOnConflict: true});
    });

    afterEach(() => {
        component.ngOnDestroy();
    });

    it('polls an accepted sync until it reaches a terminal state', () => {
        const queued = progress('queued', 'queued', 0);
        const completed = progress('completed', 'completed', 100);
        favoriteService.syncFavorite.and.returnValue(of(queued));
        userService.getAccountInfo.and.returnValue(of({favoriteSyncProgress: completed} as any));
        jasmine.clock().install();

        try {
            component.syncFavorite();
            jasmine.clock().tick(1);

            expect(favoriteService.syncFavorite).toHaveBeenCalledOnceWith(true);
            expect(userService.getAccountInfo).toHaveBeenCalledTimes(1);
            expect(component.favoriteSyncProgress).toEqual(completed);
            expect(component.isSyncing).toBeFalse();
            expect(component.syncStatusText).toBe('同步完成');
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('shows active batch progress without exposing a raw error', () => {
        component.favoriteSyncProgress = {
            ...progress('running', 'syncing', 45),
            completedBatches: 1,
            totalBatches: 3,
        };

        expect(component.isSyncing).toBeTrue();
        expect(component.syncStatusText).toBe('正在与 box.moe 同步');
        expect(component.syncBatchText).toBe('批次 1 / 3');
    });

    function progress(status: FavoriteSyncProgress['status'],
                      stage: FavoriteSyncProgress['stage'],
                      percentage: number): FavoriteSyncProgress {
        return {
            syncId: 'sync-1',
            status,
            stage,
            completedBatches: percentage === 100 ? 1 : 0,
            totalBatches: 1,
            percentage,
            startedAt: new Date(0).toISOString(),
            updatedAt: new Date(1).toISOString(),
        };
    }
});