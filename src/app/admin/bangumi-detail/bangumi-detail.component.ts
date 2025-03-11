import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { EMPTY, forkJoin, Subscription } from 'rxjs';
import { filter, mergeMap, take, tap } from 'rxjs/operators';
import { BaseError } from '../../../helpers/error';
import { Bangumi, Episode } from '../../entity';
import { Announce } from '../../entity/announce';
import { AdminService } from '../admin.service';
import { AnnounceService } from '../announce/announce.service';
import { EditBangumiRecommendComponent } from '../announce/edit-bangumi-recommend/edit-bangumi-recommend.component';
import { UserManagerSerivce } from '../user-manager/user-manager.service';
import { BangumiBasic } from './bangumi-basic/bangumi-basic.component';
import { EpisodeDetail } from './episode-detail/episode-detail.component';
import { FeedService } from './feed.service';
import { UniversalBuilderComponent } from './universal-builder/universal-builder.component';
import { VideoFileModal } from './video-file-modal/video-file-modal.component';
import { environment } from '../../../environments/environment';
import { AlertDialog } from '../../alert-dialog/alert-dialog.component';
import { ConfirmDialogModal } from '../../confirm-dialog/confirm-dialog-modal.component';
import { Account } from '../../entity/Account';

export enum AnnounceStatus {
    NOT_SET, NOT_YET, ANNOUNCING, EXPIRED
}

const EP_STATUS_TEXT = {
    [Episode.STATUS_NOT_DOWNLOADED]: '未下载',
    [Episode.STATUS_DOWNLOADING]: '下载中',
    [Episode.STATUS_DOWNLOADED]: '已下载'
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
    private _bangumi = <Bangumi>{};

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

    isLoading: boolean = false;

    // get orderedEpisodeList(): Episode[] {
    //     if (this.bangumi.episodes && this.bangumi.episodes.length > 0) {
    //         return this.bangumi.episodes.sort((episode1, episode2) => {
    //             return episode1.episode_no - episode2.episode_no;
    //         });
    //     }
    //     return [];
    // }
    orderedEpisodeList: Episode[] = [];

    adminList: Account[];

    announceList: Announce[];
    announceStatus: AnnounceStatus;
    announceStatusText: string;

    AnnounceStatus = AnnounceStatus;

    modeList: string[];
    availableModeCount: number;

    constructor(private _route: ActivatedRoute,
                private _router: Router,
                private _adminService: AdminService,
                private _userManagerService: UserManagerSerivce,
                private _announceService: AnnounceService,
                private _feedService: FeedService,
                private _uiDialog: UIDialog,
                titleService: Title,
                toastService: UIToast
    ) {
        this._toastRef = toastService.makeText();
        titleService.setTitle('编辑新番 - ' + environment.siteTitle);
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
                        this.updateAvailableModeCount();
                        this.fetchAnnounceList(bangumi.id);
                    },
                    error: (error: BaseError) => {
                        this._toastRef.show(error.message);
                    }
                })
        );
        this._subscription.add(
            this._feedService.getUniversalMeta()
                .subscribe({
                    next: (metaList) => {
                        this.modeList = metaList;
                        this.updateAvailableModeCount();
                    },
                    error: (error) => {
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    editBasicInfo() {
        let dialogRef = this._uiDialog.open(BangumiBasic, {stickyDialog: false, backdrop: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        dialogRef.componentInstance.adminList = this.adminList;
        this._subscription.add(
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
                        return this._adminService.updateBangumi(this.bangumi);
                    }
                ),)
                .subscribe({
                    next: () => {
                        this.isLoading = false;
                        this._toastRef.show('更新成功');
                    },
                    error: (error: BaseError) => {
                        this.isLoading = false;
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    editBangumiUniversal(mode?: string): void {
        let dialogRef = this._uiDialog.open(UniversalBuilderComponent, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        dialogRef.componentInstance.modeList = this.modeList;
        dialogRef.componentInstance.mode = mode;
        this._subscription.add(
            dialogRef.afterClosed().pipe(
                filter((result: any) => !!result),
                mergeMap((result: any) => {
                    this.isLoading = true;
                    if (result.result === UniversalBuilderComponent.DIALOG_RESULT_DOWNLOAD_DIRECTLY) {
                        return this._adminService.getBangumi(this.bangumi.id)
                            .pipe(tap((bangumi) => {
                                this.bangumi = bangumi;
                            }));
                    } else {
                        this.bangumi.universal = JSON.stringify(result.data);
                        return this._adminService.updateBangumi(this.bangumi);
                    }
                }),)
                .subscribe({
                    next: () => {
                        this.isLoading = false;
                        this._toastRef.show('更新成功');
                        this.updateAvailableModeCount();
                    },
                    error: (error) => {
                        this.isLoading = false;
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    editEpisode(episode?: Episode): void {
        let dialogRef = this._uiDialog.open(EpisodeDetail, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.episode = episode;
        dialogRef.componentInstance.bangumi_id = this.bangumi.id;
        this._subscription.add(
            dialogRef.afterClosed().pipe(
                filter((result: boolean) => result),
                mergeMap(() => {
                    this.isLoading = true;
                    return this._adminService.getBangumi(this.bangumi.id);
                }),)
                .subscribe(
                    (bangumi: Bangumi) => {
                        this.isLoading = false;
                        this.bangumi = bangumi;
                    },
                    (error: BaseError) => {
                        this.isLoading = false;
                        this._toastRef.show(error.message);
                    }
                )
        )
    }

    syncEpisodes(): void {
        this.isLoading = true;
        this._subscription.add(
            this._adminService.syncEpisodes(this.bangumi.id, this.bangumi.bgmId)
                .pipe(mergeMap((res) => {
                    this.isLoading = false;
                    if (res.status === 0) {
                        if (res.data.removed_episodes.length > 0) {
                            for (let ep of this.orderedEpisodeList) {
                                if (res.data.removed_episodes.some(eps => eps.id === ep.id)) {
                                    ep.removedMark = true;
                                }
                            }
                            const confirmDialogRef = this._uiDialog.open(ConfirmDialogModal, {stickyDialog: true, backdrop: true});
                            confirmDialogRef.componentInstance.title = '同步剧集结果';
                            confirmDialogRef.componentInstance.content = `已经从bgm.tv同步剧集.\n新增的剧集： ${
                                res.data.new_episodes.length === 0 ? '无' : '[' + res.data.new_episodes.map(ep => {
                                    if (ep.name) {
                                        return ep.episodeNo + '(' + ep.name + ')'
                                    } else {
                                        return ep.episodeNo;
                                    }
                                }).join(', ') + ']'
                            }\n更新的剧集：${
                                res.data.updated_episodes.length === 0 ? '无' : '[' + res.data.updated_episodes.map(ep => {
                                    if (ep.name) {
                                        return ep.episodeNo + '(' + ep.name + ')'
                                    } else {
                                        return ep.episodeNo;
                                    }
                                }).join(', ') + ']'
                            }\n以下剧集在bgm已经删除，要删除剧集吗（可之后手动删除）：${
                                res.data.removed_episodes.map(ep => ep.episodeNo + '(' + ep.name + ')' + '[' + EP_STATUS_TEXT[ep.status] + ']').join(', ')
                            }`;
                            return confirmDialogRef.afterClosed()
                                .pipe(
                                    take(1),
                                    filter(result => result === 'confirm'),
                                    mergeMap(() => {
                                        this.isLoading = true;
                                        const deleteObservables = [];
                                        for(let removedEp of res.data.removed_episodes) {
                                            deleteObservables.push(this._adminService.deleteEpisode(removedEp.id));
                                        }
                                        return forkJoin(deleteObservables);
                                    }),);
                        } else {
                            const alertDialogRef = this._uiDialog.open(AlertDialog, {stickyDialog: true, backdrop: true});
                            alertDialogRef.componentInstance.title = '同步剧集结果';
                            alertDialogRef.componentInstance.content = `已经从bgm.tv同步剧集.\n新增的剧集： ${
                                res.data.new_episodes.length === 0 ? '无' : '[' + res.data.new_episodes.map(ep => {
                                    if (ep.name) {
                                        return ep.episodeNo + '(' + ep.name + ')'
                                    } else {
                                        return ep.episodeNo;
                                    }
                                }).join(', ') + ']'
                            }\n更新的剧集： ${
                                res.data.updated_episodes.length === 0 ? '无' : '[' + res.data.updated_episodes.map(ep => {
                                    if (ep.name) {
                                        return ep.episodeNo + '(' + ep.name + ')'
                                    } else {
                                        return ep.episodeNo;
                                    }
                                }).join(', ') + ']'
                            }`;
                            alertDialogRef.componentInstance.confirmButtonText = '知道了';
                            return alertDialogRef.afterClosed();
                        }
                    } else {
                        this._toastRef.show(res.msg);
                        return EMPTY;
                    }
                }),mergeMap(() => {
                   return this._adminService.getBangumi(this.bangumi.id);
                }))
                .subscribe({
                    next: (bangumi) => {
                        this.bangumi = bangumi;
                        this.isLoading = false;
                    },
                    error: (error) => {
                        this.isLoading = false;
                        this._toastRef.show(error?.message || 'unknown error');
                    }
                })
        );
    }

    editVideoFile(episode: Episode): void {
        let dialogRef = this._uiDialog.open(VideoFileModal, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.episode = episode;
    }

    deleteEpisode(episode_id: string): void {
        this._subscription.add(
            this._adminService.deleteEpisode(episode_id).pipe(
                mergeMap(() => {
                    this._toastRef.show(`删除成功`);
                    return this._adminService.getBangumi(this.bangumi.id);
                }))
                .subscribe(
                    (bangumi) => {
                        this.bangumi = bangumi;
                    },
                    (error: BaseError) => {
                        this._toastRef.show(error.message);
                    }
                )
        );
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

    private updateAvailableModeCount() {
        if (!this.modeList) {
            return;
        }
        if (!this.bangumi.universal) {
            this.availableModeCount = this.modeList.length;
        } else {
            let universalList = JSON.parse(this.bangumi.universal);
            this.availableModeCount = this.modeList.filter(m => {
                return !universalList.some((u: any) => u.mode === m);
            }).length;
        }
    }
}
