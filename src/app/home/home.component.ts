
import {fromEvent as observableFromEvent, Subscription } from 'rxjs';
import { Component, EventEmitter, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HomeService } from './home.service';
import { Bangumi, User } from '../entity';
import { Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AlertDialog } from '../alert-dialog/alert-dialog.component';
import { DARK_THEME, DarkThemeService, UIDialog } from '@irohalab/deneb-ui';
import { UserService } from '../user-service';
import { environment } from '../../environments/environment';

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
    ]
})
export class Home implements OnInit, OnDestroy {

    private _subscription = new Subscription();

    user: User;

    siteTitle: string = environment.siteTitle;

    currentRouteName: string = '';

    sidebarActive = 'active';

    sidebarOverlap: boolean = false;

    showFloatSearchFrame: boolean;

    sidebarToggle = new EventEmitter<string>();

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(titleService: Title,
                private _darkThemeService: DarkThemeService,
                private _homeService: HomeService,
                private _dialogService: UIDialog,
                private _userService: UserService,
                private _router: Router) {
        this.checkOverlapMode();
        if (this.sidebarOverlap) {
            this.sidebarActive = 'inactive';
        }
        _homeService.childRouteChanges.subscribe((routeName) => {
            if (routeName === 'Play' || routeName === 'PV') {
                this.sidebarActive = 'inactive';
            } else if (!this.sidebarOverlap) {
                this.sidebarActive = 'active';
            }

            this.currentRouteName = routeName;

            if (routeName === 'Bangumi') {
                titleService.setTitle(`???????????? - ${this.siteTitle}`);
            } else if (routeName === 'Default') {
                titleService.setTitle(this.siteTitle);
            }
        });
    }

    searchBangumi(name: string) {
        this._router.navigate(['/bangumi', {name: name}]);
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
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {
                    this.isDarkTheme = theme === DARK_THEME;
                })
        );
        this._subscription.add(this._userService.userInfo
            .subscribe(
                (user: User) => {
                    this.user = user;
                    if (user && (!user.email_confirmed || !user.email)) {
                        console.log('please input your email');
                        let dialogRef = this._dialogService.open(AlertDialog, {stickyDialog: true, backdrop: true});
                        if (user.email && !user.email_confirmed) {
                            dialogRef.componentInstance.title = '??????????????????????????????';
                            dialogRef.componentInstance.content = '???????????????????????????????????????????????????????????????????????????????????????????????????????????????';
                            dialogRef.componentInstance.confirmButtonText = '?????????';
                            this._subscription.add(dialogRef.afterClosed().subscribe(() => {}));
                        } else {
                            dialogRef.componentInstance.title = '??????????????????????????????';
                            dialogRef.componentInstance.content = '????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????';
                            dialogRef.componentInstance.confirmButtonText = '??????????????????';
                            this._subscription.add(dialogRef.afterClosed().subscribe(() => {
                                this._router.navigate(['/settings/user']);
                            }));
                        }
                    }
                }
            ));
        this._subscription.add(observableFromEvent(window, 'resize')
            .subscribe(
                () => {
                    this.checkOverlapMode();
                }
            ));
    }


    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }


    private checkOverlapMode() {
        let viewportWidth = window.innerWidth;
        this.sidebarOverlap = viewportWidth <= BREAK_POINT;
    }
}
