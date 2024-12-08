import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { Staff } from '../interfaces';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'bangumi-staff-info',
    templateUrl: './bangumi-staff-info.html',
    styleUrls: ['./bangumi-staff-info.less'],
    standalone: false
})
export class BangumiStaffInfoComponent implements OnInit {
    private _subscription = new Subscription();

    @Input()
    staffList: Staff[];

    staffMap: {[job: string]: Staff[]};

    jobs: string[];

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _darkThemeService: DarkThemeService) {
        this.staffMap = {};
        this.jobs = [];
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME;})
        );
        this.staffList.forEach(staff => {
            staff.jobs.forEach(job => {
                if (!this.staffMap[job]) {
                    this.jobs.push(job);
                    this.staffMap[job] = [];
                }
                this.staffMap[job].push(staff);
            });
        });
    }

}
