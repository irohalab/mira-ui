import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Bangumi } from '../../entity';
import { BANGUMI_TYPE, FAVORITE_LABEL } from '../../entity/constants';
import { EditReviewDialogComponent } from '../rating/edit-review-dialog/edit-review-dialog.component';
import { FavoriteStatus } from '../../entity/FavoriteStatus';
import { FavoriteService } from '../favorite.service';
import { Favorite } from '../../entity/Favorite';
import { filter, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage } from '../../../helpers/http-error-helper';
import { NgClass } from '@angular/common';
import { ConfirmDialogDirective } from '../../confirm-dialog/confirm-dialog.directive';
import { MyReviewComponent } from '../rating/my-review/my-review.component';

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
}
