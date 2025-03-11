import { Component, Input } from '@angular/core';
import { UIDialogRef } from '@irohalab/deneb-ui';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'conflict-dialog',
    templateUrl: './conflict-dialog.html',
    styleUrls: ['./conflict-dialog.less'],
    standalone: false
})
export class ConflictDialogComponent {
    siteTitle = environment.siteTitle;

    STATUS_TEXT = ['', '想看', '看过', '在看', '搁置', '抛弃'];

    @Input()
    bangumiName: string;

    @Input()
    siteStatus: number;

    @Input()
    bgmStatus: number;

    constructor(private _dialogRef: UIDialogRef<ConflictDialogComponent>) {}

    chooseStatus(which: string) {
        this._dialogRef.close(which);
    }
}
