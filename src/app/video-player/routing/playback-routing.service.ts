import { HttpBackend, HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    catchError,
    map,
    Observable,
    of,
    tap,
    timeout,
} from 'rxjs';
import { PersistStorage } from '../../user-service';
import {
    BackendListResponse,
    ResolvedMediaRoute,
    RouteResponse,
    RoutingBackend,
    RoutingPreference,
} from './playback-routing.models';
import { Routing } from '../core/settings';

const ROUTING_API_PREFIX = '/_mira/routing/v1';
const ROUTE_QUERY_PARAMETER = '__mira_route';
const ROUTING_TIMEOUT_MS = 2500;
const BACKEND_CACHE_TTL_MS = 5 * 60 * 1000;
const UNSUPPORTED_ORIGIN_TTL_MS = 60 * 1000;

@Injectable({
    providedIn: 'root'
})
export class PlaybackRoutingService {
    private readonly _http: HttpClient;
    private readonly _preferenceSubject: BehaviorSubject<RoutingPreference>;
    private readonly _activeRouteSubject = new BehaviorSubject<ResolvedMediaRoute | null>(null);
    private readonly _activeCanonicalUrlSubject = new BehaviorSubject<string | null>(null);
    private readonly _backendCache = new Map<string, {expiresAt: number; backends: RoutingBackend[]}>();
    private readonly _unsupportedOrigins = new Map<string, number>();

    /** Emits the current preference immediately and whenever the user changes it. */
    readonly preferenceChanged: Observable<RoutingPreference>;
    /** Emits the resolved route currently applied by the player. */
    readonly activeRouteChanged = this._activeRouteSubject.asObservable();
    /** Emits the canonical URL for the player's current media resource. */
    readonly activeCanonicalUrlChanged = this._activeCanonicalUrlSubject.asObservable();

    constructor(httpBackend: HttpBackend,
                private _persistStorage: PersistStorage) {
        this._http = new HttpClient(httpBackend);
        this._preferenceSubject = new BehaviorSubject(this.readPreference());
        this.preferenceChanged = this._preferenceSubject.asObservable();
    }

    /** Returns the user's persisted automatic or preferred-backend choice. */
    get preference(): RoutingPreference {
        return this._preferenceSubject.getValue();
    }

    /** Returns the canonical URL for the media currently owned by the player. */
    get activeCanonicalUrl(): string | null {
        return this._activeCanonicalUrlSubject.getValue();
    }

    /** Persists a valid preference and notifies the active player when it changes. */
    setPreference(preference: RoutingPreference): void {
        if (!this.isPreference(preference)) {
            preference = {mode: 'auto'};
        }
        if (JSON.stringify(preference) === JSON.stringify(this.preference)) {
            return;
        }
        this._persistStorage.setItem(Routing.PREFERENCE, JSON.stringify(preference));
        this._preferenceSubject.next(preference);
    }

    /** Sets the current media resource and clears route state when the resource changes. */
    setActiveCanonicalUrl(canonicalUrl: string | null): void {
        if (canonicalUrl !== this.activeCanonicalUrl) {
            this._activeRouteSubject.next(null);
        }
        this._activeCanonicalUrlSubject.next(canonicalUrl);
    }

    /** Publishes the route currently applied by the player for display in routing controls. */
    setActiveRoute(route: ResolvedMediaRoute | null): void {
        this._activeRouteSubject.next(route);
    }

    /** Lists selectable backends for the active media resource, or returns an empty list without one. */
    listActiveBackends(): Observable<RoutingBackend[]> {
        if (!this.activeCanonicalUrl) {
            return of([]);
        }
        return this.listBackends(this.activeCanonicalUrl);
    }

    /** Loads and briefly caches selectable backends from the canonical media URL's origin. */
    listBackends(canonicalUrl: string): Observable<RoutingBackend[]> {
        const canonical = this.parseRoutableUrl(canonicalUrl);
        if (!canonical) {
            return of([]);
        }
        const cached = this._backendCache.get(canonical.origin);
        if (cached && cached.expiresAt > Date.now()) {
            return of(cached.backends.slice());
        }
        const endpoint = new URL(`${ROUTING_API_PREFIX}/backends`, canonical.origin).href;
        return this._http.get<BackendListResponse>(endpoint, {
            credentials: 'omit'
        }).pipe(
            timeout(ROUTING_TIMEOUT_MS),
            map(response => this.validateBackends(response)),
            tap(backends => {
                this._backendCache.set(canonical.origin, {
                    expiresAt: Date.now() + BACKEND_CACHE_TTL_MS,
                    backends: backends.slice(),
                });
            }),
        );
    }

    /**
     * Resolves a signed playback URL for a canonical video URL.
     * Routing failures are converted to a direct canonical route so playback remains available.
        *
        * @param canonicalUrl Absolute canonical video URL returned by the content API.
        * @param preference Automatic or preferred-backend selection; defaults to the persisted preference.
        * @param excludeBackendIds Backend IDs that failed during this playback and should not be selected.
        * @returns One route result containing either a validated signed playback URL or the canonical fallback.
     */
    resolve(canonicalUrl: string,
            preference: RoutingPreference = this.preference,
            excludeBackendIds: string[] = []): Observable<ResolvedMediaRoute> {
        const canonical = this.parseRoutableUrl(canonicalUrl);
        if (!canonical || this.isOriginUnsupported(canonical.origin)) {
            return of(this.directRoute(canonicalUrl));
        }
        const endpoint = new URL(`${ROUTING_API_PREFIX}/routes`, canonical.origin).href;
        const resource = `${canonical.pathname}${canonical.search}`;
        return this._http.post<RouteResponse>(endpoint, {
            resource,
            preference: this.isPreference(preference) ? preference : {mode: 'auto'},
            excludeBackendIds: excludeBackendIds.slice(0, 16),
        }, {
            observe: 'response',
            credentials: 'omit'
        }).pipe(
            timeout(ROUTING_TIMEOUT_MS),
            map(response => this.mapRouteResponse(canonical, response)),
            catchError(error => {
                if (this.isUnsupportedResponse(error)) {
                    this.markOriginUnsupported(canonical.origin);
                }
                return of(this.directRoute(canonical.href));
            }),
        );
    }

    /**
     * Validates a successful route API response against its canonical resource.
     * Any malformed, mismatched, or unexpected response becomes a direct canonical route.
     *
     * @param canonical Parsed canonical video URL used in the route request.
     * @param response Full HTTP response returned by the route API.
     * @returns A validated signed route, or the canonical fallback when validation fails.
     */
    private mapRouteResponse(canonical: URL,
                             response: HttpResponse<RouteResponse>): ResolvedMediaRoute {
        if (response.status !== 201 || !response.body) {
            if (response.status === 200) {
                this.markOriginUnsupported(canonical.origin);
            }
            return this.directRoute(canonical.href);
        }
        const route = response.body;
        if (typeof route.routeToken !== 'string' || route.routeToken.length === 0
            || typeof route.playbackUrl !== 'string'
            || !this.isBackend(route.selectedBackend)) {
            return this.directRoute(canonical.href);
        }

        let playback: URL;
        try {
            playback = new URL(route.playbackUrl);
        } catch {
            return this.directRoute(canonical.href);
        }
        const separator = canonical.search ? '&' : '?';
        const expectedSearch = canonical.search
            + separator
            + ROUTE_QUERY_PARAMETER
            + '='
            + encodeURIComponent(route.routeToken);
        if (playback.origin !== canonical.origin
            || playback.pathname !== canonical.pathname
            || playback.search !== expectedSearch
            || playback.username !== ''
            || playback.password !== ''
            || playback.hash !== '') {
            return this.directRoute(canonical.href);
        }

        return {
            canonicalUrl: canonical.href,
            playbackUrl: playback.href,
            selectedBackend: route.selectedBackend,
            selection: route.selection,
            routed: true,
        };
    }

    private parseRoutableUrl(canonicalUrl: string): URL | null {
        let canonical: URL;
        try {
            canonical = new URL(canonicalUrl);
        } catch {
            return null;
        }
        if ((canonical.protocol !== 'http:' && canonical.protocol !== 'https:')
            || canonical.username !== ''
            || canonical.password !== ''
            || canonical.hash !== '') {
            return null;
        }
        return canonical;
    }

    private validateBackends(response: BackendListResponse): RoutingBackend[] {
        if (!response || response.version !== 1 || !Array.isArray(response.backends)) {
            throw new Error('Invalid routing backend response');
        }
        return response.backends.filter(backend => this.isBackend(backend) && backend.selectable);
    }

    private isBackend(value: unknown): value is RoutingBackend {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const backend = value as RoutingBackend;
        return typeof backend.id === 'string'
            && backend.id.length > 0
            && typeof backend.label === 'string'
            && backend.label.length > 0
            && typeof backend.availability === 'string'
            && typeof backend.selectable === 'boolean'
            && (backend.region === undefined || typeof backend.region === 'string');
    }

    private readPreference(): RoutingPreference {
        const rawPreference = this._persistStorage.getItem(Routing.PREFERENCE, null);
        if (!rawPreference) {
            return {mode: 'auto'};
        }
        try {
            const preference = JSON.parse(rawPreference) as unknown;
            return this.isPreference(preference) ? preference : {mode: 'auto'};
        } catch {
            return {mode: 'auto'};
        }
    }

    private isPreference(value: unknown): value is RoutingPreference {
        if (!value || typeof value !== 'object') {
            return false;
        }
        const preference = value as Partial<RoutingPreference> & {backendId?: unknown};
        return preference.mode === 'auto'
            || (preference.mode === 'backend'
                && typeof preference.backendId === 'string'
                && preference.backendId.length > 0);
    }

    private directRoute(canonicalUrl: string): ResolvedMediaRoute {
        return {
            canonicalUrl,
            playbackUrl: canonicalUrl,
            routed: false,
        };
    }

    private isUnsupportedResponse(error: unknown): boolean {
        return error instanceof HttpErrorResponse
            && (error.status === 200 || error.status === 404 || error.status === 405);
    }

    private isOriginUnsupported(origin: string): boolean {
        const retryAfter = this._unsupportedOrigins.get(origin);
        if (!retryAfter) {
            return false;
        }
        if (retryAfter <= Date.now()) {
            this._unsupportedOrigins.delete(origin);
            return false;
        }
        return true;
    }

    private markOriginUnsupported(origin: string): void {
        this._unsupportedOrigins.set(origin, Date.now() + UNSUPPORTED_ORIGIN_TTL_MS);
    }
}
