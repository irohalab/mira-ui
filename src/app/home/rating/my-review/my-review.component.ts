import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter, HostBinding,
    Input,
    OnChanges, OnDestroy, OnInit, Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import { RATING_COLOR, RATING_TEXT } from '../rating.component';
import { DARK_THEME, DarkThemeService, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Favorite } from '../../../entity/Favorite';

@Component({
    selector: 'my-review',
    templateUrl: './my-review.html',
    styleUrls: ['./my-review.less'],
    standalone: false
})
export class MyReviewComponent implements AfterViewInit, OnChanges, OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    // exclude the first time OnChanges called.
    private _measured = false;

    @Input()
    favorite: Favorite;

    expanded = false;
    needTrimText = false;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @Output()
    editReview = new EventEmitter<any>();

    @ViewChild('reviewText', {static: false}) reviewTextRef: ElementRef;

    get ratingScore(): string {
        if (!this.favorite.rating) {
            return '0.0';
        }
        if (Math.floor(this.favorite.rating) === this.favorite.rating) {
            return this.favorite.rating + '.0';
        }
        return this.favorite.rating + '';
    }

    get ratingColor(): string {
        if (!this.favorite.rating) {
            return RATING_COLOR[0];
        }
        return RATING_COLOR[this.favorite.rating];
    }

    get ratingText(): string {
        if (!this.favorite.rating) {
            return RATING_TEXT[0];
        }
        return RATING_TEXT[this.favorite.rating];
    }

    constructor(toast: UIToast, private _darkThemeService: DarkThemeService) {
        this._toastRef = toast.makeText();
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }

    onClickEditReview() {
        this.editReview.emit('');
    }

    toggleComment(isExpanded: boolean) {
        this.expanded = isExpanded;
    }

    ngAfterViewInit(): void {
        if (this.favorite.reviewComment) {
            this.measureCommentHeight();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('favorite' in changes && this._measured) {
            this.measureCommentHeight();
        }
    }

    private measureCommentHeight() {
        window.setTimeout(() => {
            const reviewTextEl = this.reviewTextRef.nativeElement as HTMLElement;
            const boundingHeight = reviewTextEl.getBoundingClientRect().height;
            if (boundingHeight < reviewTextEl.scrollHeight) {
                this.needTrimText = true;
            }
            if (!this._measured) {
                this._measured = true;
            }
        }, 100);
    }
}
