import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { Bangumi } from '../../../entity';
import { Character } from '../interfaces';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { NgClass } from '@angular/common';
import { Home } from '../../home.component';


@Component({
    selector: 'bangumi-character',
    templateUrl: './bangumi-character.html',
    styleUrls: ['./bangumi-character.less'],
    imports: [NgClass]
})
export class BangumiCharacterComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Input()
    bangumi: Bangumi;
    @Input()
    characterList: Character[];

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _darkThemeService: DarkThemeService) {
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME;})
        );
    }
}
