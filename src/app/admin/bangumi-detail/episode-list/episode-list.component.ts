import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { Bangumi, Episode } from '../../../entity';
import { EMPTY, forkJoin, Subscription } from 'rxjs';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { EpisodeDetail } from '../episode-detail/episode-detail.component';
import { filter, mergeMap, take } from 'rxjs/operators';
import { BaseError } from '../../../../helpers/error';
import { ConfirmDialogModal } from '../../../confirm-dialog/confirm-dialog-modal.component';
import { AlertDialog } from '../../../alert-dialog/alert-dialog.component';
import { VideoFileModal } from '../video-file-modal/video-file-modal.component';

const EP_STATUS_TEXT = {
    [Episode.STATUS_NOT_DOWNLOADED]: '未下载',
    [Episode.STATUS_DOWNLOADING]: '下载中',
    [Episode.STATUS_DOWNLOADED]: '已下载'
}

/**
 * List episodes, this component has a side effect that updates the bangumi of parent component.
 */
@Component({
    selector: 'app-episode-list',
    templateUrl: './episode-list.component.html',
    styleUrl: './episode-list.component.less',
    standalone: false
})
export class EpisodeListComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private episodeList: Episode[];

    @Input()
    bangumi: Bangumi;

    get episodes(): Episode[] {
        return this.episodeList;
    }

    set episodes(v) {
        this.episodeList = v;
        this.bangumi.episodes = this.episodeList;
    }

    isLoading: boolean = false;

    constructor(private adminService: AdminService,
                private dialog: UIDialog,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.subscription.add(
            this.adminService.listEpisode(this.bangumi.id)
                .subscribe({
                    next: results => {
                        this.episodes = results;
                    },
                    error: error => {
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    editEpisode(episode?: Episode): void {
        let dialogRef = this.dialog.open(EpisodeDetail, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.episode = episode;
        dialogRef.componentInstance.bangumi_id = this.bangumi.id;
        this.subscription.add(
            dialogRef.afterClosed().pipe(
                filter((result: boolean) => result),
                mergeMap(() => {
                    this.isLoading = true;
                    return this.adminService.listEpisode(this.bangumi.id);
                }),)
                .subscribe({
                    next: (episodes: Episode[]) => {
                        this.isLoading = false;
                        this.episodes = episodes;
                    },
                    error: (error: BaseError) => {
                        this.isLoading = false;
                        this.toastRef.show(error.message);
                    }
                })
        )
    }

    syncEpisodes(): void {
        this.isLoading = true;
        this.subscription.add(
            this.adminService.syncEpisodes(this.bangumi.id, this.bangumi.bgmId)
                .pipe(mergeMap((res) => {
                    this.isLoading = false;
                    if (res.status === 0) {
                        if (res.data.removed_episodes.length > 0) {
                            for (let ep of this.episodes) {
                                if (res.data.removed_episodes.some(eps => eps.id === ep.id)) {
                                    ep.removedMark = true;
                                }
                            }
                            const confirmDialogRef = this.dialog.open(ConfirmDialogModal, {stickyDialog: true, backdrop: true});
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
                                            deleteObservables.push(this.adminService.deleteEpisode(removedEp.id));
                                        }
                                        return forkJoin(deleteObservables);
                                    }),);
                        } else {
                            const alertDialogRef = this.dialog.open(AlertDialog, {stickyDialog: true, backdrop: true});
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
                        this.toastRef.show(res.msg);
                        return EMPTY;
                    }
                }),mergeMap(() => {
                    return this.adminService.listEpisode(this.bangumi.id);
                }))
                .subscribe({
                    next: (episodes) => {
                        this.episodes = episodes;
                        this.isLoading = false;
                    },
                    error: (error) => {
                        this.isLoading = false;
                        this.toastRef.show(error?.message || 'unknown error');
                    }
                })
        );
    }

    editVideoFile(episode: Episode): void {
        let dialogRef = this.dialog.open(VideoFileModal, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.episode = episode;
    }

    deleteEpisode(episode_id: string): void {
        this.subscription.add(
            this.adminService.deleteEpisode(episode_id).pipe(
                mergeMap(() => {
                    this.toastRef.show(`删除成功`);
                    return this.adminService.listEpisode(this.bangumi.id);
                }))
                .subscribe({
                    next: (episodes) => {
                        this.episodes = episodes;
                    },
                    error: (error: BaseError) => {
                        this.toastRef.show(error.message);
                    }
                })
        );
    }
}
