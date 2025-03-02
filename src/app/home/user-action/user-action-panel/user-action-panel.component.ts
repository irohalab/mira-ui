import { fromEvent as observableFromEvent, Subscription } from 'rxjs';

import { skip } from 'rxjs/operators';
import { DARK_THEME, DarkThemeService, UIPopoverContent, UIPopoverRef } from '@irohalab/deneb-ui';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../../entity';

@Component({
    selector: 'user-action-panel',
    templateUrl: './user-action-panel.html',
    styleUrls: ['./user-action-panel.less'],
    standalone: false
})
export class UserActionPanelComponent extends UIPopoverContent implements OnInit, OnDestroy {
    private subscription = new Subscription();

    @Input()
    user: User;

    isDarkTheme: boolean;

    constructor(popoverRef: UIPopoverRef<UserActionPanelComponent>,
                private darkThemeService: DarkThemeService) {
        super(popoverRef);
    }

    logout(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.popoverRef.close('logout');
    }

    ngAfterViewInit() {
        super.ngAfterViewInit();
        this.subscription.add(
            observableFromEvent(document.body, 'click').pipe(
                skip(1))
                .subscribe(() => {
                    this.popoverRef.close(null);
                })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }
}
