import { Router } from '@angular/router';
import { DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { of } from 'rxjs';
import { NavigationService } from '../../navigation.service';
import { AdminNavbar } from './admin-navbar.component';

describe('AdminNavbar', () => {
    let navbar: AdminNavbar;
    let navigationService: jasmine.SpyObj<NavigationService>;

    beforeEach(() => {
        navigationService = jasmine.createSpyObj<NavigationService>('NavigationService', ['goBack']);
        navbar = new AdminNavbar(
            {themeChange: of(DARK_THEME)} as DarkThemeService,
            navigationService,
            jasmine.createSpyObj<Router>('Router', ['navigate'])
        );
    });

    it('uses navigation history in normal route mode', () => {
        navbar.backLink = '/admin/video-manager?status=Running';

        navbar.back();

        expect(navigationService.goBack).toHaveBeenCalledOnceWith(navbar.backLink);
    });

    it('emits a local close request without changing history in dialog mode', () => {
        navbar.interceptBack = true;
        const backRequested = jasmine.createSpy('backRequested');
        navbar.backRequested.subscribe(backRequested);

        navbar.back();

        expect(backRequested).toHaveBeenCalled();
        expect(navigationService.goBack).not.toHaveBeenCalled();
    });
});