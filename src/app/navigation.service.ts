import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';

@Injectable({providedIn: 'root'})
export class NavigationService {
    private _history: string[] = [];

    constructor(private _router: Router, private _location: Location) {
    }

    public startSaveHistory(): void {
        this._router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this._history.push(event.urlAfterRedirects);
            }
        });
    }

    public goBack(fallBackUrl: string = '/'): void {
        this._history.pop();

        if (this._history.length > 0) {
            this._location.back();
        } else {
            this._router.navigateByUrl(fallBackUrl);
        }
    }
}
