import { HttpClient } from '@angular/common/http';
import { OAuthEvent, OAuthService, TokenResponse } from 'angular-oauth2-oidc';
import { of, Subject } from 'rxjs';
import { Account } from '../entity/Account';
import { User } from '../entity';
import { UserService } from './user.service';

describe('UserService', () => {
    let accessToken: string;
    let httpClient: jasmine.SpyObj<HttpClient>;
    let oAuthService: jasmine.SpyObj<OAuthService>;
    let oAuthEvents: Subject<OAuthEvent>;

    beforeEach(() => {
        localStorage.removeItem('mira_last_token_refresh_at');
        accessToken = 'expired-access-token';
        oAuthEvents = new Subject<OAuthEvent>();
        httpClient = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'post']);
        oAuthService = jasmine.createSpyObj<OAuthService>('OAuthService', [
            'configure',
            'getAccessToken',
            'getGrantedScopes',
            'getIdToken',
            'getIdentityClaims',
            'getRefreshToken',
            'hasValidAccessToken',
            'loadDiscoveryDocumentAndTryLogin',
            'loadUserProfile',
            'refreshToken',
        ], {
            events: oAuthEvents.asObservable(),
            state: '',
        });
        oAuthService.getAccessToken.and.callFake(() => accessToken);
        oAuthService.getRefreshToken.and.returnValue('refresh-token');
        oAuthService.hasValidAccessToken.and.returnValue(true);
        oAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(new Promise<boolean>(() => {}));
        oAuthService.refreshToken.and.callFake(async (): Promise<TokenResponse> => {
            accessToken = 'fresh-access-token';
            return {
                access_token: accessToken,
                id_token: 'id-token',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'rotated-refresh-token',
                scope: 'openid profile email offline_access',
            };
        });
    });

    afterEach(() => {
        localStorage.removeItem('mira_last_token_refresh_at');
        oAuthEvents.complete();
    });

    it('refreshes and retries when the provider rejects an expired access token', async () => {
        const userProfile = {
            sub: 'subject-1',
            name: 'Mira',
            email: 'mira@example.com',
            email_verified: true,
        } as User;
        const account = { role: User.ADMIN_ROLE } as Account;
        oAuthService.loadUserProfile.and.returnValues(
            Promise.reject({ status: 401, error: 'token expired' }),
            Promise.resolve({ info: userProfile }),
        );
        httpClient.get.and.returnValue(of(account));
        const service = new UserService(httpClient, oAuthService);
        spyOn<any>(service, 'supportsWebLocks').and.returnValue(false);

        await service.getUserInfo();

        let resolvedUser: User;
        const subscription = service.userInfo.subscribe(user => resolvedUser = user);
        subscription.unsubscribe();
        expect(oAuthService.refreshToken).toHaveBeenCalledTimes(1);
        expect(oAuthService.loadUserProfile).toHaveBeenCalledTimes(2);
        expect(httpClient.get).toHaveBeenCalledTimes(1);
        expect(resolvedUser.id).toBe(userProfile.sub);
        expect(resolvedUser.role).toBe(account.role);
    });
});