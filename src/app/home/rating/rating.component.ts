import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { Rating } from '../../entity/rating';
import { Subscription } from 'rxjs';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';

export const RATING_TEXT = ['无评分', '不忍直视', '很差', '差', '较差', '不过不失', '还行', '推荐', '力荐', '神作', '超神作'];
export const RATING_COLOR = [
    '#cccccc',
    '#a80407',
    '#ec4017',
    '#df641d',
    '#da9003',
    '#ffd400',
    '#c2e008',
    '#65e615',
    '#72e7a3',
    '#71dddf',
    '#04afff'
];

@Component({
    selector: 'bangumi-rating',
    templateUrl: './rating.html',
    styleUrls: ['./rating.less'],
    standalone: false
})
export class RatingComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    rating: Rating;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    get countDist(): {r: number, c: number}[] {
        if (this.rating) {
            return Object.keys(this.rating.count)
                .map(r => parseInt(r, 10))
                .sort((r1, r2) => r2 - r1)
                .map(r => {
                    return {r: r, c: this.rating.count[r]};
                });
        } else {
            return [];
        }
    }

    get ratingScore(): string {
        if (!this.rating) {
            return '0.0';
        }
        if (Math.floor(this.rating.score) === this.rating.score) {
            return this.rating.score + '.0';
        }
        return this.rating.score + '';
    }

    get roundedScore(): number {
        if (!this.rating) {
            return 0;
        }
        return Math.round(this.rating.score);
    }

    get ratingText(): string {
        if (!this.rating) {
            return RATING_TEXT[0];
        }
        return RATING_TEXT[this.roundedScore];
    }

    get ratingColor(): string {
        if (!this.rating) {
            return RATING_COLOR[0];
        }
        return RATING_COLOR[this.roundedScore];
    }
    constructor(private _darkThemeService: DarkThemeService) {
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
}
