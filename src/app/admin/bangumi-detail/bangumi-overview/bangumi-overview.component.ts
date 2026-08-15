import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { UIDialog, UIToast, UIToastComponent, UIToastRef, UIResponsiveImageWrapper, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { BangumiBasic } from '../bangumi-basic/bangumi-basic.component';
import { filter, mergeMap, take } from 'rxjs/operators';
import { BaseError } from '../../../../helpers/error';
import { EMPTY, forkJoin, Subscription } from 'rxjs';
import { Account } from '../../../entity/Account';
import { UserManagerSerivce } from '../../user-manager/user-manager.service';
import { AdminService } from '../../admin.service';
import { DatePipe, NgClass } from '@angular/common';
import { BangumiTypeNamePipe } from '../../bangumi-pipes/type-name-pipe';
import { BangumiAdminEntity } from '../../../entity/admin/BangumiAdminEntity';
import { EpisodeAdminEntity } from '../../../entity/admin/EpisodeAdminEntity';

@Component({
    selector: 'app-bangumi-overview',
    templateUrl: './bangumi-overview.component.html',
    styleUrl: './bangumi-overview.component.less',
    imports: [UIResponsiveImageWrapper, DatePipe, BangumiTypeNamePipe, NgClass]
})
export class BangumiOverviewComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private _bangumi!: BangumiAdminEntity;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @Input()
    set bangumi(bangumi: BangumiAdminEntity) {
        this._bangumi = bangumi;
        if (this._bangumi.episodes && this._bangumi.episodes.length > 0) {
            this.orderedEpisodeList = this._bangumi.episodes.sort((episode1, episode2) => {
                return episode1.episodeNo - episode2.episodeNo;
            });
        } else {
            this.orderedEpisodeList = [];
        }
    }

    get bangumi(): BangumiAdminEntity {
        return this._bangumi;
    }

    orderedEpisodeList: EpisodeAdminEntity[];

    adminList: Account[];
    isLoading: boolean = false;

    constructor(private adminService: AdminService,
                private dialog: UIDialog,
                private userManagerSerivce: UserManagerSerivce,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,) {
        this.toastRef = toastService.makeText();
    }

    ngOnInit() {
        this.subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
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
                        this.bangumi.epsNoOffset = basicInfo.eps_no_offset as number;
                        this.bangumi.status = basicInfo.status as number;
                        this.bangumi.maintainedByUid = basicInfo.maintainedByUid;
                        if (basicInfo.maintainedByUid && this.adminList.length > 0) {
                            this.bangumi.maintainedBy = this.adminList.find(user => user.uid === basicInfo.maintainedByUid);
                        }
                        this.bangumi.alertTimeout = basicInfo.alertTimeout as number;
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
