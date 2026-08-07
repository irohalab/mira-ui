import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { NavigationService } from '../../navigation.service';
import { NgClass } from '@angular/common';

@Component({
    selector: 'admin-navbar',
    templateUrl: './admin-navbar.html',
    styleUrls: ['./admin-navbar.less'],
    encapsulation: ViewEncapsulation.None,
    imports: [NgClass]
})
export class AdminNavbar implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    navTitle: string;

    @Input()
    backLink: string;

    @Input()
    interceptBack = false;

    @Output()
    backRequested = new EventEmitter<void>();

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
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
    }

    back(): void {
        if (this.interceptBack) {
            this.backRequested.emit();
            return;
        }
        this._navigationService.goBack(this.backLink);
    }
}
