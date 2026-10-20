import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { FavoriteSyncLogResponse } from '../../entity/Account';
import { UserManagerSerivce } from './user-manager.service';

describe('UserManagerSerivce favorite sync log', () => {
    it('loads one account download link from the admin-only endpoint', () => {
        const response: FavoriteSyncLogResponse = {
            progress: null,
            logPath: 'https://storage.example.test/private-favorite-sync/log.json.gz?signed=example',
        };
        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(response));
        const service = new UserManagerSerivce(http);
        let actual: unknown;

        service.getFavoriteSyncLog('account-1').subscribe(value => {
            actual = value;
        });

        expect(http.get).toHaveBeenCalledOnceWith(
            jasmine.stringMatching(/\/admin\/account\/account-1\/favorite-sync-log$/)
        );
        expect(actual).toEqual(response);
    });
});