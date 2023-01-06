
import {fromEvent as observableFromEvent,  Subscription ,  Observable } from 'rxjs';

import {skip} from 'rxjs/operators';
import { DARK_THEME, DarkThemeService, UIPopoverContent, UIPopoverRef } from '@irohalab/deneb-ui';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../../entity';

@Component({
    selector: 'user-action-panel',
    templateUrl: './user-action-panel.html',
    styleUrls: ['./user-action-panel.less']
})
export class UserActionPanelComponent extends UIPopoverContent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    user: User;

    @Input()
    isBangumiEnabled: boolean;

    @Input()
    bgmAccountInfo: {
        nickname: string,
        avatar: {large: string, medium: string, small: string},
        username: string,
        id: string,
        url: string
    };

    isDarkTheme: boolean;

    constructor(popoverRef: UIPopoverRef<UserActionPanelComponent>, private _darkThemeService: DarkThemeService) {
        super(popoverRef);
    }

    logout(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.popoverRef.close('logout');
    }

    ngAfterViewInit() {
        super.ngAfterViewInit();
        this._subscription.add(
            observableFromEvent(document.body, 'click').pipe(
                skip(1))
                .subscribe(() => {
                    this.popoverRef.close(null);
                })
        );
    }

    ngOnDestroy() {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }
}
