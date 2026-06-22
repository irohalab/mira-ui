import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { BangumiRaw } from '../../../entity/BangumiRaw';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'result-detail',
    templateUrl: './result-detail.html',
    styleUrls: ['./result-detail.less'],
    imports: [NgClass, FormsModule]
})
export class ResultDetail implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    bangumi: BangumiRaw;

    @Input()
    showDetail: boolean = false;

    @Output()
    finish = new EventEmitter<string|null>();

    isDarkTheme: boolean;

    constructor(private _darkThemeService: DarkThemeService) {
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    back() {
        this.finish.emit(null);
    }

    done() {
        this.finish.emit(this.bangumi.itemId);
    }
}
