import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Bangumi, Episode } from '../../../entity';
import { BangumiBasic } from '../bangumi-basic/bangumi-basic.component';
import { filter, mergeMap, take } from 'rxjs/operators';
import { BaseError } from '../../../../helpers/error';
import { EMPTY, forkJoin, Subscription } from 'rxjs';
import { Account } from '../../../entity/Account';
import { UserManagerSerivce } from '../../user-manager/user-manager.service';
import { AdminService } from '../../admin.service';

@Component({
    selector: 'app-bangumi-overview',
    templateUrl: './bangumi-overview.component.html',
    styleUrl: './bangumi-overview.component.less',
    standalone: false
})
export class BangumiOverviewComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private _bangumi!: Bangumi;

    @Input()
    set bangumi(bangumi: Bangumi) {
        this._bangumi = bangumi;
        if (this._bangumi.episodes && this._bangumi.episodes.length > 0) {
            this.orderedEpisodeList = this._bangumi.episodes.sort((episode1, episode2) => {
                return episode1.episodeNo - episode2.episodeNo;
            });
        } else {
            this.orderedEpisodeList = [];
        }
    }

    get bangumi(): Bangumi {
        return this._bangumi;
    }

    orderedEpisodeList: Episode[];

    adminList: Account[];
    isLoading: boolean = false;

    constructor(private adminService: AdminService,
                private dialog: UIDialog,
                private userManagerSerivce: UserManagerSerivce,
                toastService: UIToast,) {
        this.toastRef = toastService.makeText();
    }

    ngOnInit() {
        this.subscription.add(
            this.userManagerSerivce
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
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    editBasicInfo() {
        let dialogRef = this.dialog.open(BangumiBasic, {stickyDialog: false, backdrop: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        dialogRef.componentInstance.adminList = this.adminList;
        this.subscription.add(
            dialogRef
                .afterClosed().pipe(
                filter((basicInfo: any) => !!basicInfo),
                mergeMap(
                    (basicInfo: any) => {
                        this.isLoading = true;
                        this.bangumi.eps_no_offset = basicInfo.eps_no_offset as number;
                        this.bangumi.status = basicInfo.status as number;
                        this.bangumi.maintained_by = this.adminList.find(account => account.uid == basicInfo.maintained_by_uid);
                        this.bangumi.alert_timeout = basicInfo.alert_timeout as number;
                        return this.adminService.updateBangumi(this.bangumi);
                    }
                ),)
                .subscribe({
                    next: () => {
                        this.isLoading = false;
                        this.toastRef.show('更新成功');
                    },
                    error: (error: BaseError) => {
                        this.isLoading = false;
                        this.toastRef.show(error.message);
                    }
                })
        );
    }
}
