import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'static-content',
    templateUrl: './static-content.html',
    styleUrls: ['./static-content.less'],
    standalone: false
})
export class StaticContentComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    siteTitle: string = environment.siteTitle;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _darkThemeService: DarkThemeService) {
    }

    public ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    public ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME;})
        );
    }
}
