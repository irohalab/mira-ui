import { fromEvent as observableFromEvent, Subscription } from 'rxjs';

import { filter, mergeMap } from 'rxjs/operators';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { User } from '../../entity';
import { UserService } from '../../user-service';
import { UIPopover } from '@irohalab/deneb-ui';
import { UserActionPanelComponent } from './user-action-panel/user-action-panel.component';

@Component({
    selector: 'user-action',
    templateUrl: './user-action.html',
    styleUrls: ['./user-action.less'],
    standalone: false
})
export class UserActionComponent implements OnInit, OnDestroy, AfterViewInit {
    private subscription = new Subscription();

    @Input()
    user: User;

    @ViewChild('userActionLink', {static: false}) userActionLinkRef: ElementRef;

    constructor(private userService: UserService,
                private _popover: UIPopover,) {
    }

    logout() {
        this.userService.logout();
    }

    ngOnInit(): void {
        this.subscription.add(
            this.userService.userInfo
                .subscribe(user => {
                    console.log(user);
                    this.user = user;
                })
        );
    }

    ngAfterViewInit(): void {
        let userActionLinkElement = this.userActionLinkRef.nativeElement;
        this.subscription.add(
            observableFromEvent(userActionLinkElement, 'click').pipe(
                mergeMap(() => {
                    const popoverRef = this._popover.createPopover(userActionLinkElement, UserActionPanelComponent, 'bottom-end');
                    popoverRef.componentInstance.user = this.user;
                    return popoverRef.afterClosed();
                }),
                filter(result => !!result),)
                .subscribe((result) => {
                    if (result === 'logout') {
                        this.logout();
                    }
                    console.log(result);
                })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
