import { NgModule } from '@angular/core';
import { AlertDialog } from './alert-dialog.component';
import { UIDialogModule } from '@irohalab/deneb-ui';
@NgModule({
    declarations: [AlertDialog],
    imports: [UIDialogModule],
    exports: [AlertDialog]
})
export class AlertDialogModule {

}
