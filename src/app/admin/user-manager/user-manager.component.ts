import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseError } from '../../../helpers/error';
import { ClientError } from '../../../helpers/error/ClientError';
import { User } from '../../entity';
import { UserService } from '../../user-service';
import { UserManagerSerivce } from './user-manager.service';
import { UserPromoteModal } from './user-promote-modal/user-promote-modal.component';
import { environment } from '../../../environments/environment';
import { Account } from '../../entity/Account';

@Component({
    selector: 'user-manager',
    templateUrl: './user-manager.html',
    styleUrls: ['./user-manager.less'],
    standalone: false
})
export class UserManager implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    page = 1;
    total = 0;
    limit = 10;

    accountList: Account[];

    inviteCodeList: string[];
    inviteCodeNum = 1;

    currentAdmin: User;

    availableField: { [key: string]: string } = {
        'nickName': 'nickName', 'subjectId': 'subjectId', 'uid': 'uid', 'role': 'role', 'email': 'email'
    };
    queryField = 'nickName';
    queryValue: string;

    constructor(
        private userService: UserService,
        private userManagerSerivce: UserManagerSerivce,
        private dialog: UIDialog,
        toast: UIToast,
        titleService: Title
    ) {
        titleService.setTitle(`用户管理 - ${environment.siteTitle}`);
        this._toastRef = toast.makeText();
    }

    ngOnInit(): void {
        this._subscription.add(
            this.userService.userInfo
                .subscribe(
                    user => {
                        this.currentAdmin = user;
                    }
                )
        );
        this.getUserList(this.page);
        this.getInviteCodeList();
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    changeQueryField(field: string) {
        this.queryField = field;
    }

    getUserList(page: number) {
        let offset = (page - 1) * this.limit
        this._subscription.add(
            this.userManagerSerivce.listUser(
                offset,
                this.limit,
                this.queryField,
                this.queryValue
            )
                .subscribe({
                    next: (result) => {
                        this.accountList = result.data;
                        this.total = result.total;
                    },
                    error: (error: BaseError) => {
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    getInviteCodeList() {
        this._subscription.add(
            this.userManagerSerivce.listUnusedInviteCode()
                .subscribe({
                    next: (result) => {
                        this.inviteCodeList = result;
                    }
                    ,
                    error: (error: BaseError) => {
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    shareCode(code: string) {
        let inputElement = document.createElement('input') as HTMLInputElement;
        inputElement.style.opacity = '0.1';
        document.body.appendChild(inputElement);
        inputElement.value = code;
        inputElement.select();
        document.execCommand('copy');
        this._toastRef.show('邀请码已经复制到剪贴板');
        document.body.removeChild(inputElement);
    }

    generateInviteCode() {
        this._subscription.add(
            this.userManagerSerivce.createInviteCode(Math.abs(Math.floor(this.inviteCodeNum)))
                .subscribe({
                    next: () => {
                        this.getInviteCodeList();
                    },
                    error: (error: BaseError) => {
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    promoteUser(account: Account) {
        let dialogRef = this.dialog.open(UserPromoteModal, {stickyDialog: false, backdrop: true});
        dialogRef.componentInstance.role = account.role;
        this._subscription.add(
            dialogRef.afterClosed().pipe(
                filter(result => !!result),
                mergeMap(result => {
                    return this.userManagerSerivce.promoteUser(account.id, result.role);
                }),)
                .subscribe({
                    next: () => {
                        this._toastRef.show('更改用户等级成功');
                        this.getUserList(this.page);
                    },
                    error: (error: BaseError) => {
                        if (error instanceof ClientError && error.status === 404) {
                            this._toastRef.show('未找到用户');
                        } else {
                            this._toastRef.show(error.message);
                        }
                    }
                })
        );
    }

    changeInviteCodeNumber(num: string): void {
        this.inviteCodeNum = parseInt(num, 10);
    }
}
