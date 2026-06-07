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
import { storageAPI } from '../../helpers/localstorage';

const baseUrl = environment.resourceProvider + '/account';

const legacyBaseUrl = environment.legacyApiBaseURL;

// Key under which we persist the *original* id_token obtained from the
// authorization-code exchange. Hydra's end_session_endpoint requires the
// id_token_hint to contain a `sid` claim, but refreshed id_tokens drop it,
// so we keep the original one around to use as the logout hint.
const ORIGINAL_ID_TOKEN_KEY = 'original_id_token';

@Injectable()
export class UserService extends BaseService {

    private _userInfoSubject = new BehaviorSubject(new User(
        User.ID_INITIAL_USER,
        null,
        null,
        false));

    // Emits true once the initial OAuth discovery/login + user info resolution has completed.
    // Route guards wait for this before deciding, so a hard refresh doesn't wrongly bounce a logged-in user.
    private _userLoadedSubject = new BehaviorSubject<boolean>(false);

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
                this.captureOriginalIdToken();
                return this.getUserInfo();
            })
            .then(() => {
                console.log('user', this._userInfoSubject.getValue());
            })
            .catch((error) => {
                console.log(error);
            })
            .finally(() => {
                this._userLoadedSubject.next(true);
            });

        this.oAuthService.setupAutomaticSilentRefresh();
        this.oAuthService.events
            .pipe(tap(e => {
                console.log('event', e);
            }),filter((e) => e.type === 'token_received'))
            .subscribe((_) => {
                console.debug('state', this.oAuthService.state);
                this.captureOriginalIdToken();
                this.oAuthService.loadUserProfile();

                const scopes = this.oAuthService.getGrantedScopes();
                console.debug('scopes', scopes);
            });

    }

    // Persist the current id_token only when it still carries the `sid` claim.
    // Refreshed id_tokens lack `sid`, so they will never overwrite the original.
    private captureOriginalIdToken(): void {
        const claims = this.oAuthService.getIdentityClaims() as { sid?: string } | null;
        if (claims && claims.sid) {
            const idToken = this.oAuthService.getIdToken();
            if (idToken) {
                storageAPI.setItem(ORIGINAL_ID_TOKEN_KEY, idToken);
            }
        }
    }

    get userInfo(): Observable<User> {
        return this._userInfoSubject.asObservable();
    }

    // Emits true once the initial auth state has been resolved.
    get userLoaded(): Observable<boolean> {
        return this._userLoadedSubject.asObservable();
    }

    login(): void {
        this.oAuthService.initLoginFlow();
    }

    logout(): void {
        // Use the original id_token (which contains the `sid` claim) as the
        // logout hint; the library's stored id_token may be a refreshed one
        // without `sid`, which Hydra rejects. An expired hint is acceptable
        // per the OIDC RP-Initiated Logout spec.
        const originalIdToken = storageAPI.getItem(ORIGINAL_ID_TOKEN_KEY);
        storageAPI.removeItem(ORIGINAL_ID_TOKEN_KEY);
        if (originalIdToken) {
            this.oAuthService.logOut({ id_token_hint: originalIdToken });
        } else {
            this.oAuthService.logOut();
        }
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
