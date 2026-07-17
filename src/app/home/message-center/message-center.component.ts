import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from './message.service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Message } from '../../entity/Message';
import { switchMap } from 'rxjs/operators';
import { DARK_THEME, DarkThemeService, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageContentPipe } from '../../pipes/message-content.pipe';

@Component({
    selector: 'app-message-center',
    templateUrl: './message-center.component.html',
    styleUrl: './message-center.component.less',
    imports: [NgClass, FormsModule, MessageContentPipe]
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

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean = false;

    constructor(private messageService: MessageService,
                private darkThemeService: DarkThemeService,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngOnInit() {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
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
        this.selectedMessage = this.currentMessageList[0];
        this.onMessageChecked();
    }

    get currentMessageList(): Message[] {
        return this.tabSelect === 'Sent' ? this.sentMessageList : this.messageList;
    }

    markAsRead(selectedMessage: boolean) {
        let messageIdList: string[];
        if (selectedMessage) {
            messageIdList = [this.selectedMessage.id];
        } else {
            messageIdList = this.currentMessageList
                .map(message => message.id)
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
            messageIdList = this.currentMessageList
                .map(message => message.id)
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
        const checkList = this.currentMessageList.map(message => this.checkDict[message.id]);
        if (checkList.length > 0 && checkList.every(checked => checked)) {
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
        this.currentMessageList
            .forEach(message => {
                this.checkDict[message.id] = this.isAllChecked;
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
        if (this.tabSelect === 'Inbox' && !message.read) {
            this.subscription.add(
                this.messageService.markAsRead([message.id])
                    .subscribe({
                        next: () => {
                            message.read = true;
                        },
                        error: (error) => {
                            this.toastRef.show(error.message);
                        }
                    })
            );
        }
    }
}
