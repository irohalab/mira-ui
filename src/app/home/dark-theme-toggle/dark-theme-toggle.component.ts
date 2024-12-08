import { Component, OnDestroy, OnInit } from '@angular/core';
import { DARK_THEME, DarkThemeService, LIGHT_THEME } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'dark-theme-toggle',
    template: `
        <a class="toggle-button" [ngClass]="{dark: isDarkTheme}" (click)="changeTheme()" title="Dark Mode">
            <i class="moon icon" *ngIf="!isDarkTheme"></i>
            <i class="sun icon" *ngIf="isDarkTheme"></i>
        </a>`,
    styles: [`
        @import '../../_dark-theme-helpers';
        .toggle-button {
            font-size: inherit;
            color: inherit;
            text-decoration: none;
            cursor: pointer;
            &:focus,
            &:hover {
                color: #1e70bf;
                text-decoration: none;
            }
        }
        .toggle-button.dark {
            color: @darkLinkColor;
            &:focus,
            &:hover {
                color: @darkLinkHoverColor;
            }
        }
    `],
    standalone: false
})
export class DarkThemeToggleComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    isDarkTheme: boolean;

    buttonTitle: string;
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
                    this.buttonTitle = this.isDarkTheme ? 'Light Mode' : 'Dark Mode';
                })
        );
    }

    public changeTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        this._darkThemeService.changeTheme(this.isDarkTheme ? DARK_THEME : LIGHT_THEME);
        if (!this.isDarkTheme) {
            document.body.classList.remove('dark-theme');
        } else if (this.isDarkTheme && !document.body.classList.contains('dark-theme')) {
            document.body.classList.add('dark-theme');
        }
    }
}
