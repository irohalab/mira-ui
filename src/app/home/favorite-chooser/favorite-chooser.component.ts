import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { AuthInfo, LOGON_STATUS } from '../../browser-extension/chrome-extension.service';
import { Bangumi } from '../../entity';
import { BANGUMI_TYPE, FAVORITE_LABEL } from '../../entity/constants';
import { EditReviewDialogComponent } from '../rating/edit-review-dialog/edit-review-dialog.component';
import { FavoriteStatus } from '../../entity/FavoriteStatus';
import { FavoriteService } from '../favorite.service';
import { Favorite } from '../../entity/Favorite';

@Component({
    selector: 'favorite-chooser',
    templateUrl: './favorite-chooser.html',
    styleUrls: ['./favorite-chooser.less'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class FavoriteChooser implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    FAVORITE_LABEL = FAVORITE_LABEL;
    BANGUMI_TYPE = BANGUMI_TYPE;
    eFavoriteStatus = FavoriteStatus;

    isChoosingFavorite = false;
    isSavingFavorite = false;

    toggleButtonText = '收藏';

    @Input()
    bangumi: Bangumi;

    isExtensionEnabled: boolean;
    authInfo: AuthInfo;
    isBgmLogin = LOGON_STATUS.UNSURE;

    get syncEnabled(): boolean {
        return this.isExtensionEnabled && !!this.authInfo && this.isBgmLogin === LOGON_STATUS.TRUE;
    }

    @Input()
    loadBgmInfo: boolean;

    @Output()
    reloadEpisodes = new EventEmitter<any>();

    userFavoriteInfo: any;

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
        dialogRef.componentInstance.comment = this.userFavoriteInfo ? this.userFavoriteInfo.comment : '';
        dialogRef.componentInstance.rating = this.userFavoriteInfo ? this.userFavoriteInfo.rating : 0;
        dialogRef.componentInstance.tags = this.userFavoriteInfo ? (Array.isArray(this.userFavoriteInfo.tags) ? this.userFavoriteInfo.tags.join(' ') : '') : '';
        dialogRef.componentInstance.bangumi = this.bangumi;
        // this._subscription.add(dialogRef.afterClosed().pipe(
        //     filter(result => !!result),
        //     switchMap((result) => {
        //         this.isOnSynchronizing = true;
        //         /**
        //          * export interface FavoriteStatus {
        //          *      interest: number;
        //          *      rating: number;
        //          *      tags: string;
        //          *      comment: string;
        //          * }
        //          */
        //         return this._favoriteManagerService.manuallyChangeFavorite(this.bangumi, result);
        //     }),)
        //     .subscribe((result) => {
        //         console.log(result);
        //         this.isOnSynchronizing = false;
        //         this.userFavoriteInfo = result;
        //     }, (error) => {
        //         console.log(error);
        //         if (error && error.status === 404) {
        //             this.bangumi.favorite_status = 0;
        //             this.userFavoriteInfo = null;
        //         }
        //         this.isOnSynchronizing = false;
        //         this._toastRef.show('更新失败');
        //     })
        // );
    }

    deleteFavorite() {
        // this.isOnSynchronizing = true;
        this.subscription.add(
            this.favoriteService.deleteFavorite(this.bangumi.favorite.id)
                .subscribe({
                    next: () => {
                        this.bangumi.favorite = null;
                    },
                    error: err => {
                    }
                })
        );

        // this._subscription.add(
        //     this._favoriteManagerService.manuallyDeleteFavorite(this.bangumi)
        //         .subscribe(() => {
        //             this.isOnSynchronizing = false;
        //             this.bangumi.favorite_status = 0;
        //             this.userFavoriteInfo = null;
        //             this._toastRef.show('已删除收藏');
        //         }, () => {
        //             this.isOnSynchronizing = false;
        //         })
        // );
    }

    toggleFavoriteChooser() {
        if (this.syncEnabled) {
            this.onEditReview();
        } else {
            this.isChoosingFavorite = !this.isChoosingFavorite;
        }
    }

    chooseFavoriteStatus(status: string) {
        this.isChoosingFavorite = false;
        this.isSavingFavorite = true;
        this.subscription.add(
            this.favoriteService.changeFavorite(status, this.bangumi)
                .subscribe((fav) => {
                    this.isSavingFavorite = false;
                })
        );
    }

    ngOnInit(): void {
        this.isOnSynchronizing = true;
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        // this._subscription.add(
        //     this._chromeExtensionService.isEnabled.pipe(
        //         tap(isEnabled => {
        //             this.isExtensionEnabled = isEnabled === ENABLED_STATUS.TRUE;
        //         }),
        //         filter(isEnabled => isEnabled === ENABLED_STATUS.TRUE),
        //         switchMap(() => {
        //             return this._chromeExtensionService.authInfo;
        //         }),
        //         tap(authInfo => {
        //             this.authInfo = authInfo;
        //         }),
        //         filter(authInfo => !!authInfo),
        //         switchMap(() => {
        //             return this._chromeExtensionService.isBgmTvLogon;
        //         }),
        //         tap(isLogin => {
        //             this.isBgmLogin = isLogin;
        //             if (this.isBgmLogin === LOGON_STATUS.TRUE && !!this.authInfo) {
        //                 this.toggleButtonText = '收藏/评价';
        //             } else {
        //                 this.toggleButtonText = '收藏';
        //             }
        //         }),
        //         filter(isLogin => isLogin === LOGON_STATUS.TRUE),
        //         switchMap(() => {
        //             return this._favoriteManagerService.resyncBangumi(this.bangumi);
        //         }),)
        //         .subscribe(result => {
        //             this.isOnSynchronizing = false;
        //             this.userFavoriteInfo = result.data;
        //             if (result.progressResult && result.progressResult.status === 0) {
        //                 this.reloadEpisodes.emit(true);
        //             }
        //             console.log(result);
        //         }, (error) => {
        //             console.log(error);
        //         })
        // );
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
