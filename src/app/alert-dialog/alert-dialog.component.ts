import { Component, Input } from '@angular/core';
import { UIDialogRef } from '@irohalab/deneb-ui';

@Component({
    selector: 'alert-dialog',
    templateUrl: './alert-dialog.html',
    styles: [`
        :host {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
        }
    `]
})
export class AlertDialog {
    @Input()
    confirmButtonText: string;

    @Input()
    title: string;

    @Input()
    content: string;


    constructor(private _dialogRef: UIDialogRef<AlertDialog>) {}

    confirm() {
        this._dialogRef.close('confirm');
    }
}
