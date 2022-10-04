import {Component, Input} from '@angular/core';
import {UIDialogRef} from '@irohalab/deneb-ui';
@Component({
    selector: 'confirm-dialog-modal',
    templateUrl: './confirm-dialog-modal.html',
    styles: [`
        .ui.modal.active {
            transform: translate3d(0, -50%, 0);
        }
    `]
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
