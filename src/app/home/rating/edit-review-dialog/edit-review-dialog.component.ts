import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DARK_THEME, DarkThemeService, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Bangumi } from '../../../entity';
import { RATING_TEXT } from '../rating.component';
import { FavoriteStatus } from '../../../entity/FavoriteStatus';

@Component({
    selector: 'edit-review-dialog',
    templateUrl: './edit-review-dialog.html',
    styleUrls: ['./edit-review-dialog.less'],
    standalone: false
})
export class EditReviewDialogComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    reviewForm: FormGroup;

    @Input()
    bangumi: Bangumi;

    eFavoriteStatus = FavoriteStatus;
    favoriteStatus: FavoriteStatus;
    rating!: number;
    hoverScore: number;
    isHovering: boolean;

    hoveringText = '';
    ratingText = '';

    isSaving = false;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _dialogRef: UIDialogRef<EditReviewDialogComponent>,
                private _fb: FormBuilder,
                private _darkThemeService: DarkThemeService,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }

    onHoverRating(s: number) {
        this.isHovering = s > 0;
        this.hoverScore = s;
        if (!this.isHovering) {
            this.hoveringText = '';
        } else {
            this.hoveringText = RATING_TEXT[s];
        }
    }

    onSelectRating(s: number) {
        this.rating = s;
        this.ratingText = RATING_TEXT[s];
    }

    chooseFavoriteStatus(status: FavoriteStatus) {
        this.favoriteStatus = status;
    }

    onSubmit(event: Event) {
        event.preventDefault();
        event.stopPropagation();
    }

    save(): void {
        if (this.reviewForm.invalid) {
            return;
        }
        this.isSaving = true;
        const comment = this.reviewForm.value.comment;

        this._dialogRef.close({
            status: this.favoriteStatus,
            rating: this.rating,
            reviewComment: comment
        });
    }

    cancel(): void {
        this._dialogRef.close(null);
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        if (this.bangumi.favorite) {
            this.favoriteStatus = this.bangumi.favorite.status;
        }
        this.reviewForm = this._fb.group({
            comment: ['', Validators.maxLength(200)]
        });
        if (this.bangumi.favorite?.rating) {
            this.rating = this.bangumi.favorite.rating;
        }
        if (this.bangumi.favorite?.reviewComment) {
            this.reviewForm.patchValue({
                comment: this.bangumi.favorite.reviewComment,
            });
        }
        this.ratingText = RATING_TEXT[this.bangumi.favorite?.rating || 0];
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
