import { ChangeDetectorRef, Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { forkJoin, Subscription } from 'rxjs';
import { UIDialog, UIToast, UIToastComponent, UIToastRef, UIResponsiveImageWrapper, UIPopover, UIPopoverRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { EpisodeDetail } from '../episode-detail/episode-detail.component';
import { filter, mergeMap, take } from 'rxjs/operators';
import { BaseError } from '../../../../helpers/error';
import { ConfirmDialogModal } from '../../../confirm-dialog/confirm-dialog-modal.component';
import { AlertDialog } from '../../../alert-dialog/alert-dialog.component';
import { VideoFileModal } from '../video-file-modal/video-file-modal.component';
import { JsonPipe, NgClass } from '@angular/common';
import { ConfirmDialogDirective } from '../../../confirm-dialog/confirm-dialog.directive';
import { BangumiAdminEntity } from '../../../entity/admin/BangumiAdminEntity';
import { EpisodeAdminEntity } from '../../../entity/admin/EpisodeAdminEntity';
import { EpisodeColumn, EpisodeColumnKey, EpisodeColumnsPopoverComponent } from './episode-columns-popover/episode-columns-popover.component';

const EP_STATUS_TEXT = {
    [EpisodeAdminEntity.STATUS_NOT_DOWNLOADED]: '未下载',
    [EpisodeAdminEntity.STATUS_DOWNLOADING]: '下载中',
    [EpisodeAdminEntity.STATUS_DOWNLOADED]: '已下载'
}

const COLUMN_STORAGE_KEY = 'mira.admin.episode-list.columns';

/**
 * List episodes, this component has a side effect that updates the bangumi of parent component.
 */
@Component({
    selector: 'app-episode-list',
    templateUrl: './episode-list.component.html',
    styleUrl: './episode-list.component.less',
    imports: [JsonPipe, NgClass, UIResponsiveImageWrapper, ConfirmDialogDirective]
})
export class EpisodeListComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;
    private episodeList: EpisodeAdminEntity[];
    private columnPopoverRef: UIPopoverRef<EpisodeColumnsPopoverComponent> | null = null;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @Input()
    bangumi: BangumiAdminEntity;

    readonly columns: readonly EpisodeColumn[] = [
        {key: 'episodeNo', label: 'episodeNo', defaultVisible: true},
        {key: 'sort', label: 'sort', defaultVisible: false},
        {key: 'thumbnail', label: 'thumbnailImage', defaultVisible: true},
        {key: 'title', label: 'name / nameCn', defaultVisible: true},
        {key: 'airdate', label: 'airdate', defaultVisible: true},
        {key: 'duration', label: 'duration', defaultVisible: true},
        {key: 'id', label: 'id', defaultVisible: false},
        {key: 'subItemId', label: 'subItemId', defaultVisible: false},
        {key: 'type', label: 'type', defaultVisible: false},
        {key: 'properties', label: 'properties', defaultVisible: false},
        {key: 'createTime', label: 'createTime', defaultVisible: false},
        {key: 'updateTime', label: 'updateTime', defaultVisible: false}
    ];
    visibleColumnKeys: EpisodeColumnKey[] = this.defaultColumnKeys;

    get visibleColumns(): readonly EpisodeColumn[] {
        return this.columns.filter(column => this.isColumnVisible(column.key));
    }

    get isColumnPickerOpen(): boolean {
        return !!this.columnPopoverRef;
    }

    private get defaultColumnKeys(): EpisodeColumnKey[] {
        return this.columns.filter(column => column.defaultVisible).map(column => column.key);
    }

    isColumnVisible(key: EpisodeColumnKey): boolean {
        return this.visibleColumnKeys.includes(key);
    }

    toggleColumnPicker(anchorElement: HTMLElement): void {
        if (this.columnPopoverRef) {
            this.columnPopoverRef.close();
            return;
        }

        const popoverRef = this.popoverService.createPopover(anchorElement, EpisodeColumnsPopoverComponent, 'bottom-end');
        this.columnPopoverRef = popoverRef;
        popoverRef.applyProps({columns: this.columns, visibleColumnKeys: this.visibleColumnKeys, anchorElement});

        const popoverSubscription = new Subscription();
        this.subscription.add(popoverSubscription);
        popoverSubscription.add(popoverRef.componentInstance.columnToggle.subscribe(key => this.toggleColumn(key)));
        popoverSubscription.add(popoverRef.componentInstance.reset.subscribe(() => this.resetColumns()));
        popoverSubscription.add(popoverRef.afterClosed().subscribe(() => {
            this.columnPopoverRef = null;
            this.changeDetector.markForCheck();
            popoverSubscription.unsubscribe();
        }));
    }

    toggleColumn(key: EpisodeColumnKey): void {
        if (this.isColumnVisible(key)) {
            if (this.visibleColumnKeys.length === 1) {
                return;
            }
            this.visibleColumnKeys = this.visibleColumnKeys.filter(columnKey => columnKey !== key);
        } else {
            this.visibleColumnKeys = [...this.visibleColumnKeys, key];
        }
        this.updateColumnPreferences();
    }

    resetColumns(): void {
        this.visibleColumnKeys = this.defaultColumnKeys;
        this.updateColumnPreferences();
    }

    private loadColumnPreferences(): void {
        try {
            const savedKeys: unknown = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY) ?? 'null');
            if (Array.isArray(savedKeys)) {
                const keys = this.columns.filter(column => savedKeys.includes(column.key)).map(column => column.key);
                if (keys.length > 0) {
                    this.visibleColumnKeys = keys;
                }
            }
        } catch {}
    }

    private updateColumnPreferences(): void {
        this.columnPopoverRef?.applyProps({visibleColumnKeys: this.visibleColumnKeys});
        this.changeDetector.markForCheck();
        try {
            localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(this.visibleColumnKeys));
        } catch {}
    }

    get episodes(): EpisodeAdminEntity[] {
        return this.episodeList;
    }

    set episodes(v) {
        this.episodeList = v;
        this.bangumi.episodes = this.episodeList;
    }

    isLoading: boolean = false;

    constructor(private adminService: AdminService,
                private dialog: UIDialog,
                private _darkThemeService: DarkThemeService,
                private popoverService: UIPopover,
                private changeDetector: ChangeDetectorRef,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngOnDestroy(): void {
        this.columnPopoverRef?.close();
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.loadColumnPreferences();
        this.subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
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

    editEpisode(episode: EpisodeAdminEntity): void {
        let dialogRef = this.dialog.open(EpisodeDetail, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.episode = episode;
        this.subscription.add(
            dialogRef.afterClosed().pipe(
                filter((result: boolean) => result),
                mergeMap(() => {
                    this.isLoading = true;
                    return this.adminService.listEpisode(this.bangumi.id);
                }),)
                .subscribe({
                    next: (episodes: EpisodeAdminEntity[]) => {
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
            this.adminService.syncEpisodes(this.bangumi.id)
                .pipe(mergeMap((res) => {
                    this.isLoading = false;
                    const formatEpisodes = (episodes: EpisodeAdminEntity[]) => {
                        return episodes.length === 0 ? '无' : '[' + episodes.map(ep => {
                            if (ep.name) {
                                return ep.episodeNo + '(' + ep.name + ')'
                            } else {
                                return ep.episodeNo;
                            }
                        }).join(', ') + ']';
                    };
                    if (res.removableEpisodes.length > 0) {
                        for (let ep of this.episodes) {
                            if (res.removableEpisodes.some(eps => eps.id === ep.id)) {
                                ep.removedMark = true;
                            }
                        }
                        const confirmDialogRef = this.dialog.open(ConfirmDialogModal, {stickyDialog: true, backdrop: true});
                        confirmDialogRef.componentInstance.title = '同步剧集结果';
                        confirmDialogRef.componentInstance.content = `已经从上游同步剧集.\n新增的剧集： ${
                            formatEpisodes(res.newEpisodes)
                        }\n更新的剧集：${
                            formatEpisodes(res.updatedEpisodes)
                        }\n以下剧集在上游已经删除，要删除剧集吗（可之后手动删除）：${
                            res.removableEpisodes.map(ep => ep.episodeNo + '(' + ep.name + ')' + '[' + EP_STATUS_TEXT[ep.status] + ']').join(', ')
                        }`;
                        return confirmDialogRef.afterClosed()
                            .pipe(
                                take(1),
                                filter(result => result === 'confirm'),
                                mergeMap(() => {
                                    this.isLoading = true;
                                    const deleteObservables = [];
                                    for(let removedEp of res.removableEpisodes) {
                                        deleteObservables.push(this.adminService.deleteEpisode(removedEp.id));
                                    }
                                    return forkJoin(deleteObservables);
                                }),);
                    } else {
                        const alertDialogRef = this.dialog.open(AlertDialog, {stickyDialog: true, backdrop: true});
                        alertDialogRef.componentInstance.title = '同步剧集结果';
                        alertDialogRef.componentInstance.content = `已经从上游同步剧集.\n新增的剧集： ${
                            formatEpisodes(res.newEpisodes)
                        }\n更新的剧集： ${
                            formatEpisodes(res.updatedEpisodes)
                        }`;
                        alertDialogRef.componentInstance.confirmButtonText = '知道了';
                        return alertDialogRef.afterClosed();
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

    editVideoFile(episode: EpisodeAdminEntity): void {
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
