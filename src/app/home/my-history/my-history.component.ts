import { Component, OnDestroy, OnInit } from '@angular/core';
import { WatchProgress } from '../../entity/watch-progress';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Home } from '../home.component';
import { DARK_THEME, DarkThemeService, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Title } from '@angular/platform-browser';
import { WatchService } from '../watch.service';

@Component({
    selector: 'my-history',
    templateUrl: './my-history.html',
    styleUrls: ['./my-history.less']
})
export class MyHistoryComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    isLoading: boolean;

    total: number = 0;
    countPerPage = 20;
    currentPage = 1;

    isDarkTheme: boolean;

    watchProgressList: WatchProgress[];

    constructor(private _watchService: WatchService,
                private _homeComponent: Home,
                private _darkThemeService: DarkThemeService,
                toastService: UIToast,
                titleService: Title) {
        titleService.setTitle(`观看历史 - ${environment.siteTitle}`);

        this._toastRef = toastService.makeText();
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME; })
        );

        this.getHistoryList(this.currentPage);
    }

    getHistoryList(page:number): void {
        this.isLoading = true;
        let offset = (page - 1) * this.countPerPage;
        this._subscription.add(
            this._watchService.list_history(offset, this.countPerPage)
                .subscribe({
                    next: ({data, total}) => {
                        this.watchProgressList = data;
                        this.total = total;
                        this.isLoading = false;
                    },
                    error: (err: any) => {
                        this.isLoading = false;
                        this._toastRef.show(err.message);
                    }
                })
        );
    }
}
