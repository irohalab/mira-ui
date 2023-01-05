import { Component, OnDestroy, OnInit } from '@angular/core';
import { DARK_THEME, DarkThemeService, LIGHT_THEME } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'dark-theme-toggle',
    template: `
        <ui-toggle [(ngModel)]="isDarkTheme" (ngModelChange)="changeTheme($event)">
            <i class="moon icon"></i>
        </ui-toggle>`,
    styles: []
})
export class DarkThemeToggleComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    isDarkTheme: boolean;
    constructor(private _darkThemeService: DarkThemeService) {
    }

    public ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    public ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
    }

    public changeTheme(isDarkTheme: boolean) {
        this._darkThemeService.changeTheme(isDarkTheme ? DARK_THEME : LIGHT_THEME);
        if (!isDarkTheme) {
            document.body.classList.remove('dark-theme');
        } else if (isDarkTheme && !document.body.classList.contains('dark-theme')) {
            document.body.classList.add('dark-theme');
        }
    }
}
