import { Component, ElementRef, EventEmitter, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIPopoverContent, UIPopoverRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

export type EpisodeColumnKey = 'episodeNo' | 'thumbnail' | 'title' | 'airdate' | 'duration'
    | 'id' | 'subItemId' | 'type' | 'sort' | 'properties'
    | 'createTime' | 'updateTime';

export interface EpisodeColumn {
    key: EpisodeColumnKey;
    label: string;
    defaultVisible: boolean;
}

@Component({
    selector: 'app-episode-columns-popover',
    templateUrl: './episode-columns-popover.component.html',
    styleUrl: './episode-columns-popover.component.less'
})
export class EpisodeColumnsPopoverComponent extends UIPopoverContent implements OnInit, OnDestroy {
    private subscription = new Subscription();

    columns: readonly EpisodeColumn[] = [];
    visibleColumnKeys: readonly EpisodeColumnKey[] = [];
    anchorElement: HTMLElement;
    readonly columnToggle = new EventEmitter<EpisodeColumnKey>();
    readonly reset = new EventEmitter<void>();

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    constructor(popoverRef: UIPopoverRef<EpisodeColumnsPopoverComponent>,
                private element: ElementRef<HTMLElement>,
                private darkThemeService: DarkThemeService) {
        super(popoverRef);
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange.subscribe(theme => {
                this.isDarkTheme = theme === DARK_THEME;
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    isColumnVisible(key: EpisodeColumnKey): boolean {
        return this.visibleColumnKeys.includes(key);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target;
        if (target instanceof Node && !this.element.nativeElement.contains(target) && !this.anchorElement?.contains(target)) {
            this.popoverRef.close();
        }
    }

    @HostListener('document:keydown.escape', ['$event'])
    onEscape(event: Event): void {
        event.stopPropagation();
        this.popoverRef.close();
        this.anchorElement?.focus();
    }
}