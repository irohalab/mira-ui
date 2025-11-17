import {Component, Input} from '@angular/core';
import {UIDialogRef} from '@irohalab/deneb-ui';
@Component({
    selector: 'confirm-dialog-modal',
    templateUrl: './confirm-dialog-modal.html',
    styles: [`
        :host {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
        }
    `],
    standalone: true
})
export class ConfirmDialogModal {

    @Input()
    title: string;

    @Input()
    content: string;

    constructor(private _dialogRef: UIDialogRef<ConfirmDialogModal>) {}

    cancel() {
        this._dialogRef.close('cancel');
    }

    confirm() {
        this._dialogRef.close('confirm');
    }
}
