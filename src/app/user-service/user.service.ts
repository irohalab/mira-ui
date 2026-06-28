import { Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom, Observable } from 'rxjs';
import { catchError, debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { BaseService } from '../../helpers/base.service';
import { User } from '../entity';
import { OAuthInfoEvent, OAuthService } from 'angular-oauth2-oidc';
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

// Name of the Web Locks resource that serializes refresh-token rotation across
// browser tabs. Only the tab holding this lock performs the network refresh;
// other tabs wait and then reuse the rotated token from shared storage. This
// prevents two tabs from presenting the same refresh token concurrently, which
// Hydra treats as token reuse and punishes by revoking the entire token chain.
const REFRESH_LOCK = 'mira_token_refresh';

// Shared-storage marker holding the epoch-ms of the last successful refresh.
// A tab that enters the lock and finds a refresh happened within
// REFRESH_DEDUP_WINDOW_MS reuses the freshly rotated token instead of rotating
// again. This is robust to timer skew between tabs, unlike comparing the
// refresh-token value (which a staggered tab may capture post-rotation).
const LAST_REFRESH_AT_KEY = 'mira_last_token_refresh_at';
const REFRESH_DEDUP_WINDOW_MS = 10_000;

@Injectable({
    providedIn: 'root'
})
export class UserService extends BaseService {

    private _userInfoSubject = new BehaviorSubject(new User(
        User.ID_INITIAL_USER,
        null,
        null,
        false));

    // Emits true once the initial OAuth discovery/login + user info resolution has completed.
    // Route guards wait for this before deciding, so a hard refresh doesn't wrongly bounce a logged-in user.
    private _userLoadedSubject = new BehaviorSubject<boolean>(false);

    // Holds the in-flight refresh promise so concurrent callers within this tab
    // share a single network refresh instead of each firing their own.
    private refreshInFlight?: Promise<void>;

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

        // Drive automatic refresh ourselves instead of setupAutomaticSilentRefresh().
        // The library's built-in version calls refreshToken() directly, bypassing the
        // cross-tab lock; routing the 'token_expires' trigger through refreshOnce()
        // keeps every refresh coordinated. The expiration timers that emit this event
        // are still armed by the library (configure() -> setupRefreshTimer(), re-armed
        // on each 'token_received').
        this.oAuthService.events
            .pipe(
                filter((e) => e.type === 'token_expires'
                    && (e as OAuthInfoEvent).info === 'access_token'),
                debounceTime(1000),
            )
            .subscribe(() => {
                this.refreshOnce().catch((err) => {
                    console.error('Automatic token refresh failed', err);
                });
            });

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
                await this.refreshOnce();
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

    // Single-flight wrapper: collapses concurrent refresh requests in this tab
    // into one shared promise, and delegates the actual rotation to the
    // cross-tab-coordinated path below.
    private refreshOnce(): Promise<void> {
        this.refreshInFlight ??= this.coordinatedRefresh()
            .finally(() => { this.refreshInFlight = undefined; });
        return this.refreshInFlight;
    }

    // Performs the refresh under a cross-tab Web Lock so only one tab rotates the
    // refresh token at a time. Inside the lock we re-check a shared timestamp: if
    // another tab refreshed within the dedup window, the rotated token is already
    // in shared storage, so we reuse it rather than spend the now-stale token.
    private async coordinatedRefresh(): Promise<void> {
        if (this.supportsWebLocks()) {
            await navigator.locks.request(REFRESH_LOCK, () => this.refreshIfStale());
            return;
        }
        // Fallback for browsers without the Web Locks API: best-effort
        // single-flight within this tab only (provided by refreshOnce()).
        await this.refreshIfStale();
    }

    // The critical section: must run while holding the lock. Reads the shared
    // "last refresh" marker and only hits the network when no other tab has
    // produced a fresh token within the dedup window.
    private async refreshIfStale(): Promise<void> {
        const lastRefreshAt = Number(storageAPI.getItem(LAST_REFRESH_AT_KEY) ?? '0');
        const refreshedRecently = Date.now() - lastRefreshAt < REFRESH_DEDUP_WINDOW_MS;
        if (refreshedRecently && this.oAuthService.hasValidAccessToken()) {
            // Another tab just rotated the token; its result is already in shared
            // storage. Reuse it instead of rotating again.
            return;
        }
        await this.oAuthService.refreshToken();
        storageAPI.setItem(LAST_REFRESH_AT_KEY, String(Date.now()));
    }

    private supportsWebLocks(): boolean {
        return typeof navigator !== 'undefined'
            && 'locks' in navigator
            && !!navigator.locks
            && typeof navigator.locks.request === 'function';
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
