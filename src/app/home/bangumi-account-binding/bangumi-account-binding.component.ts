import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DARK_THEME, DarkThemeService, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import {
    ChromeExtensionService,
    IAuthInfo,
    INITIAL_STATE_VALUE,
    LOGON_STATUS
} from '../../browser-extension/chrome-extension.service';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'bangumi-account-binding',
    templateUrl: './bangumi-account-binding.html',
    styleUrls: ['./bangumi-account-binding.less'],
    standalone: false
})
export class BangumiAccountBindingComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    authInfo: IAuthInfo;

    authForm: FormGroup;

    isLogin = LOGON_STATUS.UNSURE;

    LOGON_STATUS = LOGON_STATUS;

    isAuthenticating = false;

    isLoading = true;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _chromeExtensionService: ChromeExtensionService,
                private _fb: FormBuilder,
                private _darkThemeService: DarkThemeService,
                titleService: Title,
                toast: UIToast) {
        this._toastRef = toast.makeText();
        titleService.setTitle('关联Bangumi账户');
    }

    login(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.authForm.invalid) {
            return;
        }
        const value = this.authForm.value;
        this.isAuthenticating = true;
        this._subscription.add(
            this._chromeExtensionService.auth(value.username, value.password)
                .subscribe((data) => {
                    this._toastRef.show('已关联Bangumi账户');
                    this.isAuthenticating = false;
                }, (error) => {
                    console.log(error);
                    this.isAuthenticating = false;
                    this._toastRef.show(error.error);
                })
        );
    }

    revokeAuth() {
        this._chromeExtensionService.revokeAuth()
            .subscribe(() => {
                console.log('已取消关联Bangumi账户');
                this._toastRef.show('已取消关联Bangumi账户');
            });
    }

    loginInBgmTv() {
        this._subscription.add(
            this._chromeExtensionService.openBgmForResult().pipe(
                mergeMap(() => {
                    return this._chromeExtensionService.invokeBangumiWebMethod('clearCache', []);
                }))
                .subscribe(() => {
                    this._toastRef.show('已完成登录');
                }, () => {
                    this._toastRef.show('发生错误');
                })
        );
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME})
        );
        this.authForm = this._fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required]
        });
        this._subscription.add(
            this._chromeExtensionService.authInfo.pipe(
                filter(authInfo => authInfo !== INITIAL_STATE_VALUE))
                .subscribe(authInfo => {
                    console.log(authInfo);
                    this.isLoading = false;
                    this.authInfo = authInfo as IAuthInfo;
                }, (error) => {
                    console.log(error);
                    this.isLoading = false;
                    this._toastRef.show(error);
                })
        );
        this._subscription.add(
            this._chromeExtensionService.isBgmTvLogon
                .subscribe(status => {
                    this.isLogin = status;
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
