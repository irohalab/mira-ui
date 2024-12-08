import { HttpClient } from '@angular/common/http';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DARK_THEME, DarkThemeService, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChromeExtensionService, ENABLED_STATUS } from '../../browser-extension/chrome-extension.service';
import { PERM_NAME, WebHook } from '../../entity/web-hook';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'web-hook',
    templateUrl: './web-hook.html',
    styleUrls: ['./web-hook.less'],
    standalone: false
})
export class WebHookComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    webHookList: WebHook[];
    siteTitle = environment.siteTitle;

    isBgmEnabled: boolean;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _http: HttpClient,
                private _chromeExtensionService: ChromeExtensionService,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                titleService: Title) {
        titleService.setTitle(`Web Hook列表 - ${environment.siteTitle}`);
        this._toastRef = toastService.makeText();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this._subscription.add(
            this._http.get<{data: any[]}>('/api/web-hook/').pipe(
                map((res) => {
                    return res.data.map(webHook => {
                        if (webHook.permissions) {
                            webHook.permissions = JSON.parse(webHook.permissions as string) as string[];
                        } else {
                            webHook.permissions = []
                        }
                        webHook.permissions = webHook.permissions.map((perm_key: string) => PERM_NAME[perm_key]);
                        return webHook as WebHook;
                    });
                }))
                .subscribe((webHookList) => {
                    this.webHookList = webHookList;
                }, (err) => {
                    if (err.status && err.status !== 502 && err.status !== 504) {
                        this._toastRef.show(err.message);
                    } else {
                        this._toastRef.show('网络错误');
                    }
                })
        );
        this._subscription.add(
            this._chromeExtensionService.isEnabled
                .subscribe(isEnabled => {
                    this.isBgmEnabled = isEnabled === ENABLED_STATUS.TRUE;
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

}
