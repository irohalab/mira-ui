import { Component, Input } from '@angular/core';
import { UIDialogRef } from '@irohalab/deneb-ui';
import { FavoriteStatus as ExternalFavoriteStatus } from '@irohalab/mira-sdk-angular';
import { environment } from '../../../../environments/environment';
import { FavoriteStatus } from '../../../entity/FavoriteStatus';
import { FavoriteStatusTextPipe } from '../../../pipes/favorite-status-text.pipe';

@Component({
    selector: 'conflict-dialog',
    templateUrl: './conflict-dialog.html',
    styleUrls: ['./conflict-dialog.less'],
    imports: [FavoriteStatusTextPipe]
})
export class ConflictDialogComponent {
    siteTitle = environment.siteTitle;

    @Input()
    bangumiName: string;

    @Input()
    siteStatus: FavoriteStatus;

    @Input()
    externalStatus: ExternalFavoriteStatus;

    @Input()
    siteProgress: number;

    @Input()
    externalProgress: number;

    constructor(private _dialogRef: UIDialogRef<ConflictDialogComponent>) {}

    chooseStatus(which: string) {
        this._dialogRef.close(which);
    }
}
