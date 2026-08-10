import { JsonPipe, NgClass } from '@angular/common';
import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Account, FavoriteSyncLogResponse } from '../../../entity/Account';

@Component({
    selector: 'favorite-sync-log-modal',
    templateUrl: './favorite-sync-log-modal.html',
    styleUrls: ['./favorite-sync-log-modal.less'],
    imports: [JsonPipe, NgClass],
})
export class FavoriteSyncLogModal implements OnInit, OnDestroy {
    private readonly subscription = new Subscription();

    @Input() account!: Account;
    @Input() sync!: FavoriteSyncLogResponse;

    @HostBinding('class.dark-theme')
    isDarkTheme = false;

    constructor(private dialogRef: UIDialogRef<FavoriteSyncLogModal>,
                private darkThemeService: DarkThemeService) {}

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange.subscribe(theme => {
                this.isDarkTheme = theme === DARK_THEME;
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    close(): void {
        this.dialogRef.close();
    }
}
