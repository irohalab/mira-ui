import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from './message.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Message } from '../../entity/Message';
import { switchMap } from 'rxjs/operators';
import { UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-message-center',
    templateUrl: './message-center.component.html',
    styleUrl: './message-center.component.less',
    imports: [NgClass, FormsModule]
})
export class MessageCenterComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private refreshSub = new BehaviorSubject<boolean>(true);
    private toastRef!: UIToastRef<UIToastComponent>;

    tabSelect: 'Inbox' | 'Sent' = 'Inbox';

    messageList: Message[] = [];
    sentMessageList: Message[] = [];

    indeterminateAllChecked: boolean =  false;
    isAllChecked: boolean = false;
    checkDict: { [msgId: string]: boolean } = {};

    selectedMessage!: Message;

    constructor(private messageService: MessageService,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngOnInit() {
        this.subscription.add(
            this.refreshSub
                .pipe(switchMap(() => {
                    return this.messageService.listMessage(20, 0);
                }))
                .subscribe((messages: Message[]) => {
                    this.messageList = messages;
                    for (let message of messages) {
                        this.checkDict[message.id] = false;
                    }
                    if (this.messageList.length > 0) {
                        this.selectedMessage = this.messageList[0];
                    }
                })
        );

        this.subscription.add(
            this.refreshSub
                .pipe(switchMap(() => {
                    return this.messageService.listSentMessages(20, 0);
                }))
                .subscribe((messages: Message[]) => {
                    this.sentMessageList = messages;
                    for (let message of messages) {
                        this.checkDict[message.id] = false;
                    }
                })
        )
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    changeTab(tab: 'Inbox' | 'Sent') {
        this.tabSelect = tab;
    }

    markAsRead(selectedMessage: boolean) {
        let messageIdList: string[];
        if (selectedMessage) {
            messageIdList = [this.selectedMessage.id];
        } else {
            messageIdList = Object.keys(this.messageList)
                .filter(msgId => this.checkDict[msgId]);
        }
        this.subscription.add(
            this.messageService.markAsRead(messageIdList)
                .subscribe({
                    next: () => {
                        this.refreshSub.next(true);
                    },
                    error: (error) => {
                        this.toastRef.show(error.message);
                    }
                })
        )
    }

    deleteMessages(selectedMessage: boolean) {
        let messageIdList: string[];
        if (selectedMessage) {
            messageIdList = [this.selectedMessage.id];
        } else {
            messageIdList = Object.keys(this.messageList)
                .filter(msgId => this.checkDict[msgId]);
        }

        this.subscription.add(
            this.messageService.deleteMessages(messageIdList)
                .subscribe({
                    next: () => {
                        this.refreshSub.next(true);
                    },
                    error: (error) => {
                        this.toastRef.show(error.message);
                    }
                })
        )
    }

    onMessageChecked() {
        const checkList = Object.values(this.checkDict);
        if (checkList.every(checked => checked)) {
            this.isAllChecked = true;
            this.indeterminateAllChecked = false;
        } else if (checkList.every(checked => !checked)) {
            this.isAllChecked = false;
            this.indeterminateAllChecked = false;
        } else {
            this.indeterminateAllChecked = true;
        }
    }

    toggleAllChecked() {
        this.indeterminateAllChecked = false;
        Object.keys(this.checkDict)
            .forEach(msgId => {
                this.checkDict[msgId] = this.isAllChecked;
            });
    }

    onMessageSelect(event: Event, message: Message) {
        // event.stopPropagation();
        // event.preventDefault();
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT') {
            return;
        }
        this.selectedMessage = message;
    }
}
