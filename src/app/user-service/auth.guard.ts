import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { UserService } from './user.service';
import { User } from '../entity';
import { AuthError } from '../../helpers/error/AuthError';

/**
 * Resolves the current user once the initial auth state has settled.
 * Waits for `userLoaded` so a hard refresh doesn't evaluate against the
 * transient `ID_INITIAL_USER` placeholder.
 */
function resolvedUser(userService: UserService): Observable<User> {
    return userService.userLoaded.pipe(
        filter(loaded => loaded),
        take(1),
        switchMap(() => userService.userInfo.pipe(take(1)))
    );
}

function redirectToLogin(router: Router): boolean {
    router.navigate(['/error', { message: AuthError.LOGIN_REQUIRED, status: 401 }]);
    return false;
}

/**
 * Requires a logged-in (non-initial) user. Anonymous users are sent to the
 * error page, which offers a login button that triggers the OAuth flow.
 */
export const authGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);
    return resolvedUser(userService).pipe(
        map(user => User.isLoggedIn(user) ? true : redirectToLogin(router))
    );
};

/**
 * Requires a logged-in user whose role rank is >= `route.data['minRole']`.
 * Anonymous users get the login prompt; logged-in users with an insufficient
 * role get a 403 permission-denied error.
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const userService = inject(UserService);
    const router = inject(Router);
    const minRole: string = route.data['minRole'];
    return resolvedUser(userService).pipe(
        map(user => {
            if (!User.isLoggedIn(user)) {
                return redirectToLogin(router);
            }
            if (User.satisfiesRole(user.role, minRole)) {
                return true;
            }
            router.navigate(['/error', { message: AuthError.PERMISSION_DENIED, status: 403 }]);
            return false;
        })
    );
};
