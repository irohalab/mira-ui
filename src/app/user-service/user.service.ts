import { Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom, Observable } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { BaseService } from '../../helpers/base.service';
import { User } from '../entity';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthCodeFlowConfig } from '../authCodeFlow.config';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Account } from '../entity/Account';

const baseUrl = environment.resourceProvider + '/account';

const legacyBaseUrl = environment.legacyApiBaseURL;

@Injectable()
export class UserService extends BaseService {

    private _userInfoSubject = new BehaviorSubject(new User(
        User.ID_INITIAL_USER,
        null,
        null,
        false));

    constructor(
        private httpClient: HttpClient,
        private oAuthService: OAuthService,
    ) {
        super();
        this.oAuthService.configure(AuthCodeFlowConfig);
        this.oAuthService.loadDiscoveryDocumentAndTryLogin()
            .then((result) => {
                console.log(this.oAuthService.getIdentityClaims());
                console.log(this.oAuthService.getIdToken());
                console.log(this.oAuthService.getAccessToken());
                console.log(result);
                return this.getUserInfo();
            })
            .then(() => {
                console.log('user', this._userInfoSubject.getValue());
            })
            .catch((error) => {
                console.log(error);
            });
        this.oAuthService.setupAutomaticSilentRefresh();
        this.oAuthService.events
            .pipe(tap(e => {
                console.log('event', e);
            }),filter((e) => e.type === 'token_received'))
            .subscribe((_) => {
                console.debug('state', this.oAuthService.state);
                this.oAuthService.loadUserProfile();

                const scopes = this.oAuthService.getGrantedScopes();
                console.debug('scopes', scopes);
            });

    }

    get userInfo(): Observable<User> {
        return this._userInfoSubject.asObservable();
    }

    login(): void {
        this.oAuthService.initLoginFlow();
    }

    logout(): void {
        this.oAuthService.logOut();
        this._userInfoSubject.next(null);
    }

    activateAccount(invitation: string): Observable<Account> {
        return this.httpClient.post<Account>(baseUrl, {invitation})
            .pipe(tap((account) => {
                this.updateUser(this._userInfoSubject.getValue(), account);
            }))
    }

    async getUserInfo(): Promise<void> {
        try {
            if (!this.oAuthService.hasValidAccessToken() && this.oAuthService.getRefreshToken()) {
                await this.oAuthService.refreshToken();
            }
            if (!this.oAuthService.hasValidAccessToken()) {
                return;
            }
            const userProfile = (await this.oAuthService.loadUserProfile() as any).info;
            const account = await lastValueFrom(this.httpClient.get<Account>(`${baseUrl}/info`));
            console.log('userProfile: ', userProfile, account);
            this.updateUser(userProfile, account);
        } catch (ex) {
            console.log(ex);
        }
    }

    loginAlbireoAccount(name: string, password: string): Observable<boolean> {
        return this.httpClient.post<{msg: string}>(`${legacyBaseUrl}/user/login`, {
            name,
            password,
        }, {
            withCredentials: true
        }).pipe(map(resp => resp.msg === 'OK'));
    }

    linkAlbireoAccount(): Observable<Account> {
        return this.httpClient.post<{migration_token: string}>(`${legacyBaseUrl}/user/migration-token`, null, {
            withCredentials: true
        }).pipe(
            map((result) => result.migration_token),
            switchMap((token) => {
                return this.httpClient.post<Account>(`${baseUrl}/migrate`, { migration_token: token })
            }),
            tap((account) => {
                this.updateUser(this._userInfoSubject.getValue(), account);
            })
        );
    }

    getAlbireoUserInfo(): Observable<User> {
        return this.httpClient.get<{data: User}>(`${legacyBaseUrl}/user/info`, {
            withCredentials: true
        }).pipe(map((result) => result.data), catchError(this.handleError));
    }

    private updateUser(userProfile: User, account: Account): void {
        this._userInfoSubject.next(new User(
            userProfile.sub,
            userProfile.name,
            account.role ? account.role : User.GUEST_ROLE,
            // userProfile.email,
            userProfile.email_verified,));
    }
}
