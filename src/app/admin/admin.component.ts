import { Component, OnDestroy } from '@angular/core';
import { UserService } from '../user-service/user.service';
import { User } from '../entity/user';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { DownloadJobStatus } from '../entity/DownloadJobStatus';

@Component({
    selector: 'admin',
    templateUrl: './admin.html',
    styleUrls: ['./admin.less'],
    standalone: false
})
export class Admin implements OnDestroy {
    private _subscription = new Subscription();

    siteTitle = environment.siteTitle;

    user: User;

    eDownloadJobStatus = DownloadJobStatus;

    constructor(private _userService: UserService) {
        this._subscription.add(
            this._userService.userInfo
                .subscribe((u) => {
                    this.user = u;
                })
        );
    }


    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
