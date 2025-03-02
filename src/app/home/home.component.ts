import { fromEvent as observableFromEvent, Observable, Subscription } from 'rxjs';
import { Component, EventEmitter, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HomeService } from './home.service';
import { Bangumi, User } from '../entity';
import { Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { DARK_THEME, DarkThemeService, UIDialog } from '@irohalab/deneb-ui';
import { UserService } from '../user-service';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

const BREAK_POINT = 1330;

@Component({
    selector: 'home',
    templateUrl: './home.html',
    styleUrls: ['./home.less'],
    animations: [
        trigger('sidebarActive', [
            state('active', style({
                transform: 'translateX(0)'
            })),
            state('inactive', style({
                transform: 'translateX(-100%)'
            })),
            transition('inactive => active', animate('100ms ease-in')),
            transition('active => inactive', animate('100ms ease-out'))
        ])
    ],
    standalone: false
})
export class Home implements OnInit, OnDestroy {

    private subscription = new Subscription();

    isShowAdminLink: Observable<boolean>;
    isUserLogonObservable: Observable<boolean>;
    isUserActivated: Observable<boolean>;

    siteTitle: string = environment.siteTitle;

    currentRouteName: string = '';

    sidebarActive = 'active';

    sidebarOverlap: boolean = false;

    showFloatSearchFrame: boolean;

    sidebarToggle = new EventEmitter<string>();

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    today = Date.now();

    constructor(titleService: Title,
                private darkThemeService: DarkThemeService,
                private homeService: HomeService,
                private dialogService: UIDialog,
                private userService: UserService,
                private router: Router) {
        this.checkOverlapMode();
        if (this.sidebarOverlap) {
            this.sidebarActive = 'inactive';
        }
        homeService.childRouteChanges.subscribe((routeName) => {
            if (routeName === 'Play' || routeName === 'PV') {
                this.sidebarActive = 'inactive';
            } else if (!this.sidebarOverlap) {
                this.sidebarActive = 'active';
            }

            this.currentRouteName = routeName;

            if (routeName === 'Bangumi') {
                titleService.setTitle(`所有新番 - ${this.siteTitle}`);
            } else if (routeName === 'Default') {
                titleService.setTitle(this.siteTitle);
            }
        });

        this.isShowAdminLink = this.userService.userInfo.pipe(map(user => user && user.role === User.ADMIN_ROLE || user.role === User.SUPER_ADMIN_ROLE));
        this.isUserLogonObservable = this.userService.userInfo.pipe(map(user => user && user.id !== User.ID_INITIAL_USER));
        this.isUserActivated = this.userService.userInfo.pipe(map(user => user && user.id !== User.ID_INITIAL_USER && user.role !== User.GUEST_ROLE));
    }

    login(): void {
        this.userService.login();
    }

    searchBangumi(name: string) {
        this.router.navigate(['/bangumi', {name: name}]);
    }

    toggleFloatSearchFrame() {
        this.showFloatSearchFrame = !this.showFloatSearchFrame;
    }

    onClickSidebar(event: Event) {
        if (!this.sidebarOverlap) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.sidebarActive = 'inactive';
        if (this.sidebarOverlap) {
            this.sidebarToggle.emit(this.sidebarActive);
        }
    }

    onClickSidebarBackdrop(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.sidebarActive = 'inactive';
        if (this.sidebarOverlap) {
            this.sidebarToggle.emit(this.sidebarActive);
        }
    }

    toggleSidebar(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.sidebarActive = this.sidebarActive === 'active' ? 'inactive': 'active';
        if (this.sidebarOverlap) {
            this.sidebarToggle.emit(this.sidebarActive);
        }
    }

    ngOnInit(): void {
        this.subscription.add(
            this.darkThemeService.themeChange
                .subscribe(theme => {
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
        this.subscription.add(observableFromEvent(window, 'resize')
            .subscribe(
                () => {
                    this.checkOverlapMode();
                }
            ));
    }


    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }


    private checkOverlapMode() {
        let viewportWidth = window.innerWidth;
        this.sidebarOverlap = viewportWidth <= BREAK_POINT;
    }
}
