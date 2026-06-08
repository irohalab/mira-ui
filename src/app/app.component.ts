/*
 * Angular 2 decorators and services
 */
import { afterEveryRender, Component, ViewEncapsulation, Inject, DOCUMENT } from '@angular/core';

import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavigationService } from './navigation.service';
import { APP_COLORS } from '../helpers/color';

/*
 * App Component
 * Top Level Component
 */
@Component({
    selector: 'app',
    template: `
        <router-outlet>
        </router-outlet>
    `,
    encapsulation: ViewEncapsulation.None,
    imports: [RouterOutlet]
})
export class App {

    private routeEventsSubscription: Subscription;

    private removePreLoader() {
        if (document) {
            let $body = document.body;
            let preloader = document.getElementById('preloader');
            if (preloader) {
                $body.removeChild(preloader);
                this.routeEventsSubscription.unsubscribe();
            }
            $body.classList.remove('loading');
        }
    }

    get themeVariables() {
        return {
            '--primary-color': APP_COLORS.primary,
            '--secondary-color': APP_COLORS.secondary,
            '--red-color': APP_COLORS.red,
            '--orange-color': APP_COLORS.orange,
            '--yellow-color': APP_COLORS.yellow,
            '--olive-color': APP_COLORS.olive,
            '--green-color': APP_COLORS.green,
            '--teal-color': APP_COLORS.teal,
            '--blue-color': APP_COLORS.blue,
            '--violet-color': APP_COLORS.violet,
            '--purple-color': APP_COLORS.purple,
            '--pink-color': APP_COLORS.pink,
            '--brown-color': APP_COLORS.brown,
            '--grey-color': APP_COLORS.grey,
            '--black-color': APP_COLORS.black,
            '--white-color': APP_COLORS.white,
            '--default-button-bg-color': APP_COLORS.defaultButtonBg,
            '--default-button-color': APP_COLORS.defaultButtonColor,
        };
    }

    constructor(
        router: Router,
        navigationService: NavigationService,
        @Inject(DOCUMENT) private document: Document
    ) {
        this.routeEventsSubscription = router.events
            .subscribe(
                (event) => {
                    if (event instanceof NavigationEnd) {
                        this.removePreLoader();
                    }
                }
            );

        navigationService.startSaveHistory();
        afterEveryRender(() => {
            this.setThemeVariables();
        });
    }

    private setThemeVariables() {
        const body = this.document.body;
        Object.entries(this.themeVariables).forEach(([key, value]) => {
            body.style.setProperty(key, value);
        });
    }
}
