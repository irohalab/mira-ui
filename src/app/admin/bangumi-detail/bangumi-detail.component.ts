import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { BaseError } from '../../../helpers/error';
import { Bangumi } from '../../entity';
import { Announce } from '../../entity/announce';
import { AdminService } from '../admin.service';
import { AnnounceService } from '../announce/announce.service';
import { EditBangumiRecommendComponent } from '../announce/edit-bangumi-recommend/edit-bangumi-recommend.component';
import { UserManagerSerivce } from '../user-manager/user-manager.service';
import { environment } from '../../../environments/environment';
import { Account } from '../../entity/Account';

type TabName =  'Overview' | 'Episode' | 'ResourceGroup' | 'VideoProcess';

export enum AnnounceStatus {
    NOT_SET, NOT_YET, ANNOUNCING, EXPIRED
}

@Component({
    selector: 'bangumi-detail',
    templateUrl: './bangumi-detail.html',
    styleUrls: ['./bangumi-detail.less'],
    standalone: false
})
export class BangumiDetail implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    bangumi = <Bangumi>{};

    isLoading: boolean = false;

    adminList: Account[];

    announceList: Announce[];
    announceStatus: AnnounceStatus;
    announceStatusText: string;

    AnnounceStatus = AnnounceStatus;

    activatedTab: TabName = 'Overview';

    constructor(private _route: ActivatedRoute,
                private _router: Router,
                private _adminService: AdminService,
                private _userManagerService: UserManagerSerivce,
                private _announceService: AnnounceService,
                private _uiDialog: UIDialog,
                titleService: Title,
                toastService: UIToast
    ) {
        this._toastRef = toastService.makeText();
        titleService.setTitle('编辑新番 - ' + environment.siteTitle);
    }

    activeTab(tab: TabName): void {
        this.activatedTab = tab;
    }

    ngOnInit(): void {
        this._subscription.add(
            this._userManagerService
                .listUser(
                    0,
                    -1,
                    'role',
                    '[Admin,SuperAdmin]'
                )
                .subscribe((result) => {
                    this.adminList = result.data;
                })
        );
        this._subscription.add(
            this._route.params.pipe(
                mergeMap((params) => {
                    let id = params['id'];
                    return this._adminService.getBangumi(id);
                }))
                .subscribe({
                    next: (bangumi: Bangumi) => {
                        this.bangumi = bangumi;
                        this.fetchAnnounceList(bangumi.id);
                    },
                    error: (error: BaseError) => {
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    deleteBangumi() {
        this._subscription.add(
            this._adminService.deleteBangumi(this.bangumi.id)
                .subscribe(
                    ({delete_delay}) => {
                        this._toastRef.show(`将在${delete_delay}分钟后删除，你可以在任务管理中取消删除`);
                        this._router.navigate(['/admin/bangumi']);
                    },
                    (error: BaseError) => {
                        this._toastRef.show(error.message);
                    }
                )
        );
    }

    addOrEditAnnounce() {
        const dialogRef = this._uiDialog.open(EditBangumiRecommendComponent, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        if (this.announceList.length > 0) {
            dialogRef.componentInstance.announce = this.announceList[0];
        }
        this._subscription.add(
            dialogRef.afterClosed().pipe(
                filter(result => !!result),
                mergeMap((info) => {
                    if (this.announceList.length > 0) {
                        return this._announceService.updateAnnounce(this.announceList[0].id, info as Announce);
                    }
                    return this._announceService.addAnnounce(info as Announce);
                }),)
                .subscribe(() => {
                    this._toastRef.show('添加成功');
                    this.fetchAnnounceList(this.bangumi.id);
                })
        );
    }

    private fetchAnnounceList(bangumi_id: string) {
        this._subscription.add(
            this._announceService.listAnnounce(2,0, 10, bangumi_id)
                .subscribe(({data}) => {
                    this.announceList = data;
                    let currentTime = Date.now();
                    this.announceStatus = AnnounceStatus.NOT_SET;
                    this.announceStatusText = '推荐这个番組';
                    if (data.length > 0) {
                        let announce = data[0];
                        if (announce.start_time < currentTime && announce.end_time > currentTime) {
                            this.announceStatus = AnnounceStatus.ANNOUNCING;
                            this.announceStatusText = '推荐中';
                        } else if (announce.end_time < currentTime) {
                            this.announceStatus = AnnounceStatus.EXPIRED;
                            this.announceStatusText = '已过期';
                        } else if (announce.start_time > currentTime) {
                            this.announceStatus = AnnounceStatus.NOT_YET;
                            this.announceStatusText = '即将推荐';
                        }
                    }
                })
        );
    }
}
