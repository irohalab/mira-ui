import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { NavigationService } from '../../navigation.service';

@Component({
    selector: 'admin-navbar',
    templateUrl: './admin-navbar.html',
    styleUrls: ['./admin-navbar.less'],
    encapsulation: ViewEncapsulation.None
})
export class AdminNavbar implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    navTitle: string;

    @Input()
    backLink: string;

    isDarkTheme: boolean;

    constructor(private _darkThemeService: DarkThemeService,
                private _navigationService: NavigationService,
                private _router: Router) {
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {
                    console.log('pushed theme: ', theme);
                    console.log('stored theme: ' , window.localStorage.getItem('theme_for_deneb'));
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
    }

    back(): void {
        this._navigationService.goBack(this.backLink);
    }
}
