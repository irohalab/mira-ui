import { filter } from 'rxjs/operators';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../entity';
import { UserService } from '../../user-service';
import { Subscription } from 'rxjs';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { FormControl, Validators } from '@angular/forms';

@Component({
    selector: 'user-center',
    templateUrl: './user-center.html',
    styleUrls: ['./user-center.less'],
    standalone: false
})
export class UserCenter implements OnInit, OnDestroy {

    private subscription = new Subscription();

    user: User;

    isLoading = false;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    invitationCode = new FormControl('', Validators.required);

    constructor(private userService: UserService,
                private darkThemeService: DarkThemeService,
                titleService: Title,) {
        titleService.setTitle(`用户设置 - ${environment.siteTitle}`);
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );

        this.subscription.add(
            this.userService.userInfo.pipe(
                filter(user => user && user.id !== User.ID_INITIAL_USER ))
                .subscribe(
                    user => {
                        this.user = user;
                    }
                )
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    submitInvitationCode() {
        if (this.invitationCode.valid) {
            this.isLoading = true;
            this.subscription.add(
                this.userService.activateAccount(this.invitationCode.value.trim())
                    .subscribe(() => { this.isLoading = false; })
            );
        }
    }
}
