
import {fromEvent as observableFromEvent,  Subscription } from 'rxjs';

import { filter } from 'rxjs/operators';
import { UIPopoverContent, UIPopoverRef, UIToggle } from '@irohalab/deneb-ui';
import { AfterViewInit, Component, ElementRef, OnDestroy, Self } from '@angular/core';
import { Capture, CorePlayer, FloatPlayer, PlayList } from '../../../core/settings';
import { PersistStorage } from '../../../../user-service';
import { FormsModule } from '@angular/forms';
import { PlaybackRoutingService } from '../../../routing/playback-routing.service';
import { ResolvedMediaRoute, RoutingBackend, RoutingPreference } from '../../../routing/playback-routing.models';

interface RoutingBackendGroup {
    region: string;
    label: string;
    backends: RoutingBackend[];
}

@Component({
    selector: 'video-config-panel',
    templateUrl: './config-panel.html',
    styleUrls: ['./config-panel.less'],
    imports: [FormsModule, UIToggle]
})
export class VideoConfigPanelComponent extends UIPopoverContent implements AfterViewInit, OnDestroy {
    private _subscription = new Subscription();
    private _directDownload: boolean;
    private _autoPlayNext: boolean;
    private _autoFloatPlayWhenScroll: boolean;
    private _autoFloatPlayWhenLeave: boolean;
    private _autoPlayFromLastPosition: boolean;
    backendGroups: RoutingBackendGroup[] = [];
    routeSelection: string;
    activeRoute: ResolvedMediaRoute | null = null;
    loadingBackends = false;
    backendLoadFailed = false;

    set directDownload(v: boolean) {
        this._directDownload = v;
        this._persistStorage.setItem(Capture.DIRECT_DOWNLOAD, v + '');
    }

    get directDownload(): boolean {
        return this._directDownload;
    }

    set autoPlayNext(v: boolean) {
        this._autoPlayNext = v;
        this._persistStorage.setItem(PlayList.AUTO_PLAY_NEXT, v + '');
    }

    get autoPlayNext(): boolean {
        return this._autoPlayNext;
    }

    set autoFloatPlayWhenScroll(v: boolean) {
        this._autoFloatPlayWhenScroll = v;
        this._persistStorage.setItem(FloatPlayer.AUTO_FLOAT_WHEN_SCROLL, v + '');
    }

    get autoFloatPlayWhenScroll(): boolean {
        return this._autoFloatPlayWhenScroll;
    }

    set autoFloatPlayWhenLeave(v: boolean) {
        this._autoFloatPlayWhenLeave = v;
        this._persistStorage.setItem(FloatPlayer.AUTO_FLOAT_WHEN_LEAVE, v + '');
    }

    get autoFloatPlayWhenLeave(): boolean {
        return this._autoFloatPlayWhenLeave;
    }

    set autoPlayFromLastPosition(v: boolean) {
        this._autoPlayFromLastPosition = v;
        this._persistStorage.setItem(CorePlayer.AUTO_PLAY_FROM_LAST_POSITION, v + '');
    }

    get autoPlayFromLastPosition(): boolean {
        return this._autoPlayFromLastPosition;
    }

    constructor(@Self() private _selfElementRef: ElementRef,
                popoverRef: UIPopoverRef<VideoConfigPanelComponent>,
                private _persistStorage: PersistStorage,
                private _playbackRouting: PlaybackRoutingService) {
        super(popoverRef);
        const savedDirectDownload = this._persistStorage.getItem(Capture.DIRECT_DOWNLOAD, 'false');
        const autoPlayNext = this._persistStorage.getItem(PlayList.AUTO_PLAY_NEXT, 'true');
        const autoFloatPlayWhenScroll = this._persistStorage.getItem(FloatPlayer.AUTO_FLOAT_WHEN_SCROLL, 'true');
        const autoFloatPlayWhenLeave = this._persistStorage.getItem(FloatPlayer.AUTO_FLOAT_WHEN_LEAVE, 'true');
        const autoPlayFromLastPosition = this._persistStorage.getItem(CorePlayer.AUTO_PLAY_FROM_LAST_POSITION, 'false');
        this._directDownload = savedDirectDownload === 'true';
        this._autoPlayNext = autoPlayNext === 'true';
        this._autoFloatPlayWhenScroll = autoFloatPlayWhenScroll === 'true';
        this._autoFloatPlayWhenLeave = autoFloatPlayWhenLeave === 'true';
        this._autoPlayFromLastPosition = autoPlayFromLastPosition === 'true';
        this.routeSelection = this.preferenceValue(this._playbackRouting.preference);
        this._subscription.add(
            this._playbackRouting.activeRouteChanged.subscribe(route => {
                this.activeRoute = route;
            })
        );
        this.loadBackends();
    }

    onRouteSelectionChange(value: string): void {
        this.routeSelection = value;
        if (value === 'auto') {
            this._playbackRouting.setPreference({mode: 'auto'});
            return;
        }
        const prefix = 'backend:';
        if (value.startsWith(prefix)) {
            this._playbackRouting.setPreference({
                mode: 'backend',
                backendId: value.slice(prefix.length),
            });
        }
    }

    loadBackends(): void {
        this.loadingBackends = true;
        this.backendLoadFailed = false;
        this._subscription.add(
            this._playbackRouting.listActiveBackends().subscribe({
                next: backends => {
                    this.backendGroups = this.groupBackends(backends);
                    this.loadingBackends = false;
                },
                error: () => {
                    this.backendGroups = [];
                    this.loadingBackends = false;
                    this.backendLoadFailed = true;
                }
            })
        );
    }

    isBackendAvailable(backend: RoutingBackend): boolean {
        return backend.selectable && backend.availability === 'healthy';
    }

    get preferredBackendUnavailable(): boolean {
        if (this.loadingBackends || !this.routeSelection.startsWith('backend:')) {
            return false;
        }
        const backendId = this.routeSelection.slice('backend:'.length);
        return !this.backendGroups.some(group => group.backends.some(backend => backend.id === backendId));
    }

    private preferenceValue(preference: RoutingPreference): string {
        return preference.mode === 'backend' ? `backend:${preference.backendId}` : 'auto';
    }

    private groupBackends(backends: RoutingBackend[]): RoutingBackendGroup[] {
        const grouped = new Map<string, RoutingBackend[]>();
        for (const backend of backends) {
            const region = backend.region || 'other';
            const group = grouped.get(region) || [];
            group.push(backend);
            grouped.set(region, group);
        }
        return Array.from(grouped.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([region, regionBackends]) => ({
                region,
                label: this.regionLabel(region),
                backends: regionBackends,
            }));
    }

    private regionLabel(region: string): string {
        const labels: Record<string, string> = {
            CN: '中国',
            'CN-BJ': '中国 · 北京',
            'CN-SH': '中国 · 上海',
            JP: '日本',
            US: '美国',
            other: '其他',
        };
        return labels[region] || region;
    }

    ngAfterViewInit() {
        this._subscription.add(
            observableFromEvent<MouseEvent>(document.body, 'click').pipe(
                filter((event: MouseEvent) => {
                    const selfElement = this._selfElementRef.nativeElement as HTMLElement;
                    const eventPath = event.composedPath();
                    if (eventPath.includes(selfElement)) {
                        return false;
                    }
                    const target = event.target as Node | null;
                    return !target || !selfElement.contains(target);
                }))
                .subscribe(() => {
                    // TODO: We need prevent clicking the player to avoid change playback state.
                    this.popoverRef.close(null);
                })
        );
    }

    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
}
