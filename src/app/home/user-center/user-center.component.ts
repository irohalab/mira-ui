import { filter, switchMap } from 'rxjs/operators';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../entity';
import { UserService } from '../../user-service';
import { Subscription } from 'rxjs';
import { DARK_THEME, DarkThemeService, UIToggle } from '@irohalab/deneb-ui';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { FormBuilder, FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthError } from '../../../helpers/error';
import { FavoriteService } from '../favorite.service';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { Home } from '../home.component';

@Component({
    selector: 'user-center',
    templateUrl: './user-center.html',
    styleUrls: ['./user-center.less'],
    imports: [NgClass, RouterLink, FormsModule, ReactiveFormsModule, LoginComponent, UIToggle]
})
export class UserCenter implements OnInit, OnDestroy {

    private subscription = new Subscription();

    user!: User;
    albireoUser!: User;
    isSubmitting = false;
    isLoading = false;

    @HostBinding('class.dark-theme')
    isDarkTheme!: boolean;

    invitationCode = new FormControl('', Validators.required);
    errorMessage!: string;
    syncFormGroup!: FormGroup;

    isSyncing = false;

    constructor(private userService: UserService,
                private darkThemeService: DarkThemeService,
                private favoriteService: FavoriteService,
                private fb: FormBuilder,
                titleService: Title,) {
        titleService.setTitle(`用户设置 - ${environment.siteTitle}`);
    }

    ngOnInit(): void {
        this.syncFormGroup = this.fb.group({
            overrideOnConflict: true,
        })
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
        this.loadAlbireoUserInfo();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    submitInvitationCode() {
        if (this.invitationCode.valid) {
            this.isSubmitting = true;
            this.subscription.add(
                this.userService.activateAccount(this.invitationCode.value.trim())
                    .subscribe({
                        next: () => {
                            this.isSubmitting = false;
                        },
                        error: (err) => {
                            this.isSubmitting = false;
                            this.errorMessage = err.error?.message || 'Unknown Error';
                        }
                    })
            );
        }
    }

    linkAlbireoUser() {
        this.isSubmitting = true;
        this.subscription.add(
            this.userService.linkAlbireoAccount()
                .subscribe({
                    next: () => {
                        this.isSubmitting = false;
                    },
                    error: (err) => {
                        this.isSubmitting = false;
                        const message = err.error?.message || 'Unknown Error';
                        if (typeof message === 'string') {
                            this.errorMessage = message;
                        } else {
                            this.errorMessage = message.details || message.error || 'Unknown Error';
                        }
                    }
                })
        );
    }

    onLoginSuccess() {
        this.loadAlbireoUserInfo();
    }

    syncFavorite() {
        this.isSyncing = true;
        const { overrideOnConflict } = this.syncFormGroup.value;
        this.favoriteService.syncFavorite(overrideOnConflict)
            .subscribe({
                next: () => {
                    this.isSyncing = false;
                },
                error: (err) => {
                    this.isSyncing = false;
                }
            })
    }

    switchToV2() {
        // Remove the `mira_ui_version` cookie if it exists so the app falls back to the old version.
        this.removeCookie('mira_ui_version');
        // Force the browser to load a fresh (non-cached) index.html instead of using the SPA router.
        const url = new URL(window.location.origin);
        url.searchParams.set('_', Date.now().toString());
        window.location.href = url.toString();
    }

    private removeCookie(name: string): void {
        const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
        // Clear the cookie on the current path and the root path to cover where it may have been set.
        document.cookie = `${name}=; ${expires}; path=/`;
        document.cookie = `${name}=; ${expires}; path=${window.location.pathname}`;
    }

    private loadAlbireoUserInfo() {
        this.isLoading = true;
        this.subscription.add(
            this.userService.getAlbireoUserInfo()
                .subscribe({
                    next:(user) => {
                        this.isLoading = false;
                        this.albireoUser = user;
                    },
                    error: err => {
                        this.isLoading = false;
                        if (err instanceof AuthError) {
                            if (err.status === 401) {
                                // not login
                            } else {
                                // other case
                            }
                        }
                    }
                })
        );
    }
}
