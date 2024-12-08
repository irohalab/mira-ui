import {Component, Input} from '@angular/core';
import {UIDialogRef} from '@irohalab/deneb-ui';

@Component({
    selector: 'user-promote-modal',
    templateUrl: './user-promote-modal.html',
    styleUrls: ['./user-promote-modal.less'],
    standalone: false
})
export class UserPromoteModal {

    @Input() level: number;

    constructor(private _dialogRef: UIDialogRef<UserPromoteModal>){}

    cancel() {
        this._dialogRef.close(null);
    }

    save() {
        this._dialogRef.close({level: this.level});
    }
}
