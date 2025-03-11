import { Component, OnDestroy, OnInit } from '@angular/core';
import { HomeChild, HomeService } from "../home.service";
import { Bangumi } from "../../entity";
import { FAVORITE_LABEL } from '../../entity/constants';
import { Subscription } from 'rxjs';
import { Announce } from '../../entity/announce';
import { PersistStorage } from '../../user-service';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { UserService } from '../../user-service';
import { filter, switchMap } from 'rxjs/operators';
import { User } from '../../entity';

const BANGUMI_TYPE_KEY = 'default_bangumi_type_2';

@Component({
    selector: 'default-component',
    templateUrl: './default.html',
    styleUrls: ['./default.less'],
    standalone: false
})
export class DefaultComponent extends HomeChild implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    // recentEpisodes: Episode[];

    onAirBangumi: Bangumi[];

    bangumiType = 'anime'; // anime , real
    eBangumiType = {
        Anime: Bangumi.TYPE_ANIME,
        Real: Bangumi.TYPE_REAL,
    }

    FAVORITE_LABEL = FAVORITE_LABEL;

    announce_in_banner: Announce;
    announce_in_bangumi: Announce[];

    isDarkTheme: boolean;

    constructor(homeService: HomeService,
                private persistStorage: PersistStorage,
                private darkThemeService: DarkThemeService,
                private userService: UserService) {
        super(homeService);
    }

    changeBangumiType(type: string) {
        this.bangumiType = type;
        this.persistStorage.setItem(BANGUMI_TYPE_KEY, `${type}`);
        this.getOnAir();
    }

    getOnAir() {
        this._subscription.add(
            this.homeService.onAir(this.bangumiType)
                .subscribe(
                    {
                        next:(bangumiList: Bangumi[]) => {
                            this.onAirBangumi = bangumiList;
                        },
                        error: (error) => console.log(error)
                    }
                )
        );
    }

    ngOnInit(): void {
        this._subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME })
        );
        this.bangumiType = this.persistStorage.getItem(BANGUMI_TYPE_KEY, Bangumi.TYPE_ANIME);
        this.getOnAir();
        this._subscription.add(
            this.userService.userInfo.pipe(
                filter(userInfo => !!userInfo && userInfo.id !== User.ID_INITIAL_USER && userInfo.role !== User.GUEST_ROLE),
                switchMap(() => {
                    return this.homeService.listAnnounce();
                })
            )
                .subscribe((announce_list) => {
                    this.announce_in_banner = announce_list.find((announce) => {
                        return announce.position === Announce.POSITION_BANNER;
                    });
                    this.announce_in_bangumi = announce_list.filter(announce => {
                        return announce.position === Announce.POSITION_BANGUMI;
                    })
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
