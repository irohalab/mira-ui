import { Injectable } from '@angular/core';
import { UIDialog } from '@irohalab/deneb-ui';
import { Observable } from 'rxjs';

import { tap } from 'rxjs/operators';
import { ChromeExtensionService } from '../browser-extension/chrome-extension.service';
import { Bangumi } from '../entity';

/**
 * Synchronize with bgm.tv, need browser extension support
 */
@Injectable({
    providedIn: 'root'
})
export class SynchronizeService {

    private _cache = new Map<string, any>();

    constructor(private _dialog: UIDialog,
                private _chromeExtensionService: ChromeExtensionService) {

    }

    updateFavorite(bangumi: Bangumi, favStatus: any): Observable<any> {
        return this._chromeExtensionService.updateFavoriteAndSync(bangumi, favStatus).pipe(
            tap(() => {
                this._cache.delete(bangumi.id);
            }));
    }

    deleteFavorite(bangumi: Bangumi): Observable<any> {
        return this._chromeExtensionService.deleteFavoriteAndSync(bangumi).pipe(
            tap(() => {
                this._cache.delete(bangumi.id);
            }));
    }
}
