import { filter, switchMap } from 'rxjs/operators';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../entity';
import { UserService } from '../../user-service';
import { Subscription } from 'rxjs';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthError } from '../../../helpers/error';
import { FavoriteService } from '../favorite.service';

@Component({
    selector: 'user-center',
    templateUrl: './user-center.html',
    styleUrls: ['./user-center.less'],
    standalone: false
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
