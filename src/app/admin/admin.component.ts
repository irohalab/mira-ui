import { Component, OnDestroy } from '@angular/core';
import { UserService } from '../user-service/user.service';
import { User } from '../entity/user';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { DownloadJobStatus } from '../entity/DownloadJobStatus';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DARK_THEME, DarkThemeService, LIGHT_THEME, UIToggle } from '@irohalab/deneb-ui';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'admin',
    templateUrl: './admin.html',
    styleUrls: ['./admin.less'],
    imports: [RouterLink, RouterOutlet, FormsModule, UIToggle]
})
export class Admin implements OnDestroy {
    private _subscription = new Subscription();

    siteTitle = environment.siteTitle;

    user: User;

    eDownloadJobStatus = DownloadJobStatus;

    isDarkTheme: boolean;

    constructor(private _userService: UserService,
                private _darkThemeService: DarkThemeService) {
        this._subscription.add(
            this._userService.userInfo
                .subscribe((u) => {
                    this.user = u;
                })
        );
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
    }

    changeTheme(isDarkTheme: boolean): void {
        this.isDarkTheme = isDarkTheme;
        this._darkThemeService.changeTheme(isDarkTheme ? DARK_THEME : LIGHT_THEME);
        if (!isDarkTheme) {
            document.body.classList.remove('dark-theme');
        } else if (!document.body.classList.contains('dark-theme')) {
            document.body.classList.add('dark-theme');
        }
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
