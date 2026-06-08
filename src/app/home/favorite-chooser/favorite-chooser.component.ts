import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { forkJoin, Subscription } from 'rxjs';
import { Bangumi } from '../../entity';
import { BANGUMI_TYPE, FAVORITE_LABEL } from '../../entity/constants';
import { EditReviewDialogComponent } from '../rating/edit-review-dialog/edit-review-dialog.component';
import { FavoriteStatus, isStatusEqual } from '../../entity/FavoriteStatus';
import { FavoriteService } from '../favorite.service';
import { Favorite } from '../../entity/Favorite';
import { DefaultMira, Favorite as ExternalFavorite, SubItem, SubItemFavorite } from '@irohalab/mira-sdk-angular';
import { filter, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage } from '../../../helpers/http-error-helper';
import { NgClass } from '@angular/common';
import { ConfirmDialogDirective } from '../../confirm-dialog/confirm-dialog.directive';
import { MyReviewComponent } from '../rating/my-review/my-review.component';
import EpisodeTypeEnum = SubItem.EpisodeTypeEnum;

@Component({
    selector: 'favorite-chooser',
    templateUrl: './favorite-chooser.html',
    styleUrls: ['./favorite-chooser.less'],
    encapsulation: ViewEncapsulation.None,
    imports: [NgClass, ConfirmDialogDirective, MyReviewComponent]
})
export class FavoriteChooser implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    FAVORITE_LABEL = FAVORITE_LABEL;
    BANGUMI_TYPE = BANGUMI_TYPE;
    eFavoriteStatus = FavoriteStatus;

    @Input()
    bangumi: Bangumi;

    @Input()
    loadBgmInfo: boolean;

    @Output()
    reloadEpisodes = new EventEmitter<any>();

    isOnSynchronizing: boolean;
    isDarkTheme: boolean;

    constructor(private dialog: UIDialog,
                private darkThemeService: DarkThemeService,
                private favoriteService: FavoriteService,
                private miraApiService: DefaultMira,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }

    onEditReview() {
        const dialogRef = this.dialog.open(EditReviewDialogComponent, {backdrop: true, stickyDialog: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        this.subscription.add(dialogRef.afterClosed().pipe(
            filter(result => !!result),
            switchMap((result: { status: FavoriteStatus, rating: number, reviewComment: string }) => {
                this.isOnSynchronizing = true;
                return this.favoriteService.addOrUpdateFavorite({
                    bangumiId: this.bangumi.id,
                    status: result.status,
                    rating: result.rating,
                    review: result.reviewComment,
                    syncToUpstream: true
                }, this.bangumi);
            }),)
            .subscribe({
                next: (fav: Favorite) => {
                    console.log(fav);
                    this.isOnSynchronizing = false;
                    this.bangumi.favorite = fav;
                },
                error: (err: HttpErrorResponse) => {
                    this._toastRef.show(extractErrorMessage(err));
                    this.isOnSynchronizing = false;
                }
            })
        );
    }

    deleteFavorite() {
        this.isOnSynchronizing = true;
        this.subscription.add(
            this.favoriteService.deleteFavorite(this.bangumi.favorite.id)
                .subscribe({
                    next: () => {
                        this._toastRef.show('已删除收藏');
                        this.bangumi.favorite = null;
                    },
                    error: (err: HttpErrorResponse) => {
                        this._toastRef.show(extractErrorMessage(err));
                        this.isOnSynchronizing = false;
                    }
                })
        );
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => {
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
        const favorite = this.bangumi.favorite;
        this.isOnSynchronizing = true;
        let favoriteInput = favorite?.externalFavoriteId ?
            this.miraApiService.getFavoriteById(favorite.externalFavoriteId).pipe(map(res => {
                return res.data;
            })) : this.miraApiService.getFavoriteByMainItemId(this.bangumi.itemId);
        this.subscription.add(
            forkJoin([
                favoriteInput,
                this.miraApiService.listSubItemFavorites(this.bangumi.itemId, null, null, null, null, true)
                    .pipe(map(res => res.data)),
            ])
            .subscribe({
                next: ([fav, subItemFavoriteList]) => {
                    if (favorite) {
                        favorite.externalFavoriteId = fav.id;
                        favorite.rating = fav.rating;
                        favorite.reviewComment = fav.reviewComment;
                        this.bangumi.favorite = {...favorite};
                        this.resolveConflictAndUpdateFavorite(fav, subItemFavoriteList, this.bangumi);
                    } else {
                        // conflict occurred.
                        this.resolveConflictAndUpdateFavorite(fav, subItemFavoriteList, this.bangumi);
                    }
                },
                error: (err: HttpErrorResponse) => {
                    if (err.status === 404) {
                        if (favorite) {
                            // conflict occurred.
                            this.isOnSynchronizing = true;
                            this.resolveConflictAndUpdateFavorite(null, [], this.bangumi);
                            return;
                        }
                    } else {
                        this._toastRef.show(extractErrorMessage(err));
                    }
                    this.isOnSynchronizing = false;
                }
            })
        );
        this.subscription.add(
            this.favoriteService.favoriteChanged
                .subscribe(event => {
                    if (event.op === 'remove' && this.bangumi.favorite.id === event.favorite.id) {
                        this.bangumi.favorite = null;
                    }
                    if (event.op === 'change') {
                        if (this.bangumi.id === event.favorite.bangumi.id) {
                            this.bangumi.favorite = event.favorite as Favorite;
                        }
                    }
                })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    resolveConflictAndUpdateFavorite(fav: ExternalFavorite, subItemFavoriteList: SubItemFavorite[], bangumi: Bangumi) {
        this.subscription.add(this.favoriteService.resolveConflict(fav, subItemFavoriteList, bangumi)
            .subscribe({
                next: (needReloadEpisode) => {
                    this.bangumi.favorite = {...this.bangumi.favorite};
                    if (needReloadEpisode) {
                        this.reloadEpisodes.next(true);
                    }
                },
                error: (err: HttpErrorResponse) => {
                    this._toastRef.show(extractErrorMessage(err));
                },
                complete: () => {
                    this.isOnSynchronizing = false;
                }
            }));
    }
}
