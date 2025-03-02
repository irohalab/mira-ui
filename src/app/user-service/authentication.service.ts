import { Observable } from 'rxjs';

import { map } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { User } from '../entity';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthError } from '../../helpers/error/AuthError';


@Injectable()
export class Authentication  {

    user: User;

    constructor(private userService: UserService, private router: Router) {
        this.userService.userInfo
            .subscribe(
                user => {
                    this.user = user;
                }
            );
    }

    public invalidateUser(): void {
        this.user = null;
    }

    private hasPermission(route: ActivatedRouteSnapshot): boolean {
        if (route.data && typeof route.data['level'] !== 'undefined') {
            return this.user.level >= route.data['level'];
        } else {
            return true;
        }
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | boolean {
        return this.userService.userInfo.pipe(
            map(() => {
                if (this.hasPermission(route)) {
                    return true;
                } else {
                    this.router.navigate(['/error', {message: AuthError.PERMISSION_DENIED, status: 403}]);
                    return false;
                }
            }),);
    }
}
