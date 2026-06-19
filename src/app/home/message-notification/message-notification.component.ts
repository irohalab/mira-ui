import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MessageService } from '../message-center/message.service';
import { fromEvent as observableFromEvent, Subscription } from 'rxjs';
import { Message } from '../../entity/Message';
import { UIPopover, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { mergeMap, switchMap } from 'rxjs/operators';
import { NotificationListPanelComponent } from './notification-list-panel/notification-list-panel.component';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-message-notification',
    templateUrl: './message-notification.component.html',
    styleUrl: './message-notification.component.less',
    imports: [NgClass]
})
export class MessageNotificationComponent implements OnInit, OnDestroy, AfterViewInit {
    private subscription = new Subscription();
    private messageClickSub = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;

    messageList: Message[] = [];

    get unreadMessagesCount(): number {
        return this.messageList.filter(msg => !msg.read).length;
    }

    @ViewChild('notificationButton') private notificationButton: ElementRef;

    constructor(private messageService: MessageService,
                private popoverService: UIPopover,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngAfterViewInit(): void {
        const notificationButtonElement = this.notificationButton.nativeElement;
        this.subscription.add(
            observableFromEvent(notificationButtonElement, 'click')
                .pipe(switchMap(() => {
                    const popoverRef = this.popoverService.createPopover(notificationButtonElement, NotificationListPanelComponent, 'bottom-end');
                    popoverRef.componentInstance.messageList = this.messageList;
                    this.messageClickSub.add(popoverRef.componentInstance.messageClick
                        .pipe(mergeMap((messageId: string) => {
                            return this.messageService.markAsRead([messageId]);
                        }))
                        .subscribe({
                            next: () => {
                                console.log('message read');
                            },
                            error: (error) => {
                                this.toastRef.show(error.message);
                            }
                        }));
                    return popoverRef.afterClosed();
                }))
                .subscribe({
                    next: () => {
                        this.messageClickSub.unsubscribe();
                    },
                    error: err => {
                        this.toastRef.show(err.message);
                    }
                })
        )

    }

    ngOnInit() {
        this.subscription.add(
            this.messageService.listMessage(10, 0)
                .subscribe((messages: Message[]) => {
                    this.messageList = messages;
                })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
