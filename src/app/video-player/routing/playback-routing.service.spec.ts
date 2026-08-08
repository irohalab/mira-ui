import { HttpBackend, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PersistStorage } from '../../user-service';
import { RouteResponse } from './playback-routing.models';
import { PlaybackRoutingService } from './playback-routing.service';
import { Routing } from '../core/settings';

describe('PlaybackRoutingService', () => {
    let httpBackend: jasmine.SpyObj<HttpBackend>;
    let persistStorage: jasmine.SpyObj<PersistStorage>;
    let service: PlaybackRoutingService;

    beforeEach(() => {
        httpBackend = jasmine.createSpyObj<HttpBackend>('HttpBackend', ['handle']);
        persistStorage = jasmine.createSpyObj<PersistStorage>('PersistStorage', ['getItem', 'setItem']);
        persistStorage.getItem.and.returnValue(null);
        service = new PlaybackRoutingService(httpBackend, persistStorage);
    });

    it('resolves against the canonical media origin', (done) => {
        const routeToken = 'payload.signature';
        const response: RouteResponse = {
            routeToken,
            playbackUrl: `https://media.example.com/video/show/file.mp4?quality=source&__mira_route=${routeToken}`,
            selectedBackend: {
                id: 'jp-example',
                label: 'Japan Example',
                region: 'JP',
                availability: 'healthy',
                selectable: true,
            },
            selection: {mode: 'auto', reason: 'main-group'},
            issuedAt: '2026-08-07T12:00:00Z',
            freshUntil: '2026-08-08T12:00:00Z',
            expiresAt: '2026-08-14T12:00:00Z',
        };
        httpBackend.handle.and.returnValue(of(new HttpResponse({status: 201, body: response})));

        service.resolve('https://media.example.com/video/show/file.mp4?quality=source')
            .subscribe(result => {
                expect(result.routed).toBeTrue();
                expect(result.selectedBackend?.id).toBe('jp-example');
                const request = httpBackend.handle.calls.mostRecent().args[0] as HttpRequest<unknown>;
                expect(request.method).toBe('POST');
                expect(request.url).toBe('https://media.example.com/_mira/routing/v1/routes');
                expect(request.body).toEqual({
                    resource: '/video/show/file.mp4?quality=source',
                    preference: {mode: 'auto'},
                    excludeBackendIds: [],
                });
                expect(request.headers.has('Authorization')).toBeFalse();
                expect(request.credentials).toBe('omit');
                done();
            });
    });

    it('falls back when the returned playback resource does not match', (done) => {
        const response: RouteResponse = {
            routeToken: 'payload.signature',
            playbackUrl: 'https://media.example.com/video/other.mp4?__mira_route=payload.signature',
            selectedBackend: {
                id: 'jp-example',
                label: 'Japan Example',
                availability: 'healthy',
                selectable: true,
            },
            selection: {mode: 'auto', reason: 'main-group'},
            issuedAt: '2026-08-07T12:00:00Z',
            freshUntil: '2026-08-08T12:00:00Z',
            expiresAt: '2026-08-14T12:00:00Z',
        };
        httpBackend.handle.and.returnValue(of(new HttpResponse({status: 201, body: response})));

        service.resolve('https://media.example.com/video/show/file.mp4')
            .subscribe(result => {
                expect(result.routed).toBeFalse();
                expect(result.playbackUrl).toBe('https://media.example.com/video/show/file.mp4');
                done();
            });
    });

    it('falls back when the returned playback URL contains credentials', (done) => {
        const response: RouteResponse = {
            routeToken: 'payload.signature',
            playbackUrl: 'https://user@media.example.com/video/show/file.mp4?__mira_route=payload.signature',
            selectedBackend: {
                id: 'jp-example',
                label: 'Japan Example',
                availability: 'healthy',
                selectable: true,
            },
            selection: {mode: 'auto', reason: 'main-group'},
            issuedAt: '2026-08-07T12:00:00Z',
            freshUntil: '2026-08-08T12:00:00Z',
            expiresAt: '2026-08-14T12:00:00Z',
        };
        httpBackend.handle.and.returnValue(of(new HttpResponse({status: 201, body: response})));

        service.resolve('https://media.example.com/video/show/file.mp4')
            .subscribe(result => {
                expect(result.routed).toBeFalse();
                done();
            });
    });

    it('falls back when routing is unavailable', (done) => {
        httpBackend.handle.and.returnValue(throwError(() => new Error('unavailable')));

        service.resolve('https://media.example.com/video/show/file.mp4')
            .subscribe(result => {
                expect(result.routed).toBeFalse();
                expect(result.playbackUrl).toBe('https://media.example.com/video/show/file.mp4');
                done();
            });
    });

    it('routes S3-backed object paths through their media origin', (done) => {
        const routeToken = 'payload.signature';
        const response: RouteResponse = {
            routeToken,
            playbackUrl: `https://storage.example.com/public-video/show/file.mp4?__mira_route=${routeToken}`,
            selectedBackend: {
                id: 'jp-example',
                label: 'Japan Example',
                availability: 'healthy',
                selectable: true,
            },
            selection: {mode: 'auto', reason: 'main-group'},
            issuedAt: '2026-08-07T12:00:00Z',
            freshUntil: '2026-08-08T12:00:00Z',
            expiresAt: '2026-08-14T12:00:00Z',
        };
        httpBackend.handle.and.returnValue(of(new HttpResponse({status: 201, body: response})));

        service.resolve('https://storage.example.com/public-video/show/file.mp4')
            .subscribe(result => {
                expect(result.routed).toBeTrue();
                const request = httpBackend.handle.calls.mostRecent().args[0] as HttpRequest<unknown>;
                expect(request.url).toBe('https://storage.example.com/_mira/routing/v1/routes');
                expect(request.body).toEqual({
                    resource: '/public-video/show/file.mp4',
                    preference: {mode: 'auto'},
                    excludeBackendIds: [],
                });
                done();
            });
    });

    it('persists a backend preference', () => {
        service.setPreference({mode: 'backend', backendId: 'jp-example'});

        expect(service.preference).toEqual({mode: 'backend', backendId: 'jp-example'});
        expect(persistStorage.setItem).toHaveBeenCalledWith(
            Routing.PREFERENCE,
            JSON.stringify({mode: 'backend', backendId: 'jp-example'})
        );
    });

    it('does not emit or persist an unchanged preference', () => {
        service.setPreference({mode: 'auto'});

        expect(persistStorage.setItem).not.toHaveBeenCalled();
    });

    it('temporarily suppresses route requests after an origin returns 405', () => {
        let now = 1000;
        spyOn(Date, 'now').and.callFake(() => now);
        httpBackend.handle.and.returnValue(throwError(() => new HttpErrorResponse({status: 405})));
        const canonicalUrl = 'https://media.example.com/video/show/file.mp4';

        service.resolve(canonicalUrl).subscribe();
        service.resolve(canonicalUrl).subscribe();
        expect(httpBackend.handle).toHaveBeenCalledTimes(1);

        now += 60 * 1000 + 1;
        service.resolve(canonicalUrl).subscribe();

        expect(httpBackend.handle).toHaveBeenCalledTimes(2);
    });

    it('omits non-selectable backends from manual choices', (done) => {
        httpBackend.handle.and.returnValue(of(new HttpResponse({
            status: 200,
            body: {
                version: 1,
                backends: [
                    {id: 'public', label: 'Public', availability: 'healthy', selectable: true},
                    {id: 'private', label: 'Private', availability: 'healthy', selectable: false},
                ]
            }
        })));

        service.listBackends('https://media.example.com/video/show/file.mp4')
            .subscribe(backends => {
                expect(backends.map(backend => backend.id)).toEqual(['public']);
                done();
            });

    });
});
