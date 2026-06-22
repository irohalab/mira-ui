import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialogRef, UIDropdown } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'user-promote-modal',
    templateUrl: './user-promote-modal.html',
    styleUrls: ['./user-promote-modal.less'],
    imports: [UIDropdown]
})
export class UserPromoteModal implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input() role: string;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _dialogRef: UIDialogRef<UserPromoteModal>,
                private _darkThemeService: DarkThemeService){}

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    cancel() {
        this._dialogRef.close(null);
    }

    save() {
        this._dialogRef.close({role: this.role});
    }
}
