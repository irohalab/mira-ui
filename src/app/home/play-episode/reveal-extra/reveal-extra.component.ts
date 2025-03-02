import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ChromeExtensionService, ENABLED_STATUS } from '../../../browser-extension/chrome-extension.service';
import { Subscription } from 'rxjs';
import { DARK_THEME, DarkThemeService, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Bangumi } from '../../../entity';

@Component({
    selector: 'reveal-extra',
    templateUrl: './reveal-extra.html',
    styleUrls: ['./reveal-extra.less'],
    standalone: false
})
export class RevealExtraComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    @Input()
    bangumi: Bangumi;

    extraInfo: any;
    isLoading = false;

    isReveal = false;
    isEnabled = false;
    isDarkTheme: boolean;

    constructor(private _chromeExtensionService: ChromeExtensionService,
                private _darkThemeService: DarkThemeService,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }

    reveal() {
        this.isReveal = true;
        if (!this.extraInfo) {
            this.isLoading = true;
            this._subscription.add(
                this._chromeExtensionService.invokeBangumiMethod('bangumiDetail', [this.bangumi.bgmId])
                    .subscribe((extraInfo) => {
                        this.isLoading = false;
                        this.extraInfo = extraInfo;
                    }, (error) => {
                        this.isLoading = false;
                        this._toastRef.show(error.message);
                    })
            );
        }
    }

    hide() {
        this.isReveal = false;
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME;})
        );
        this._subscription.add(
            this._chromeExtensionService.isEnabled
                .subscribe((isEnabled) => {
                    this.isEnabled = isEnabled === ENABLED_STATUS.TRUE;
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
