import { AfterViewInit, Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { Message } from '../../../entity/Message';
import { DARK_THEME, DarkThemeService, UIPopoverContent, UIPopoverRef } from '@irohalab/deneb-ui';
import { fromEvent as observableFromEvent, Subscription } from 'rxjs';
import { filter, skip } from 'rxjs/operators';
import { closest } from '../../../../helpers/dom';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-notification-list-panel',
    templateUrl: './notification-list-panel.component.html',
    styleUrl: './notification-list-panel.component.less',
    imports: [RouterLink, NgClass]
})
export class NotificationListPanelComponent extends UIPopoverContent implements AfterViewInit, OnInit, OnDestroy {
    private subscription = new Subscription();

    messageList: Message[];

    isDarkTheme = false;

    messageClick = new EventEmitter<string>();

    constructor(popoverRef: UIPopoverRef<NotificationListPanelComponent>,
                private darkThemeService: DarkThemeService) {
        super(popoverRef);
    }

    ngAfterViewInit() {
        this.subscription.add(
            observableFromEvent(document.body, 'click').pipe(
                skip(1),
                filter((event) => {
                    const parent = closest(event.target, '.message-notification-list-dropdown');
                    return !parent;
                }))
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

    onClickViewAll() {
        this.popoverRef.close(null);
    }

    onClickMessage(message: Message) {
        message.expand = !message.expand;
        message.read = true;
        this.messageClick.emit(message.id);
    }
}
