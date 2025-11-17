import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { MediaFile } from '../../../../entity/MediaFile';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { AdminService } from '../../../admin.service';
import { copyElementValueToClipboard } from '../../../../../helpers/clipboard';

@Component({
    selector: 'download-editor',
    templateUrl: './download-editor.html',
    styleUrls: ['./download-editor.less'],
    standalone: false
})
export class DownloadEditorComponent implements OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;

    torrentTitle: string;
    downloadUrl: string;

    files: MediaFile[];

    eps_mapping: {eps_no: number, format: string, selected: boolean}[];

    bangumi_id: string;

    @ViewChild('downloadUrlTextBox', {static: true}) _downloadUrlTextBoxRef: ElementRef;

    constructor(private adminService: AdminService,
                private dialogRef: UIDialogRef<DownloadEditorComponent>,
                toast: UIToast) {
        this.toastRef = toast.makeText();
    }
    copyDownloadUrlToClipboard(): void {
        const downloadUrlInput = this._downloadUrlTextBoxRef.nativeElement;
        copyElementValueToClipboard(downloadUrlInput)
        this.toastRef.show('已经复制到剪贴板');
    }
    download(): void {
        const result = [];
        for (let i = 0; i < this.eps_mapping.length; i++) {
            let mapping = this.eps_mapping[i];
            if (mapping.selected) {
                result.push({
                    downloadUrl: this.downloadUrl,
                    epsNo: mapping.eps_no,
                    filePath: this.files[i].path,
                    fileName: this.files[i].name
                });
            }
        }
        this.subscription.add(
            this.adminService.downloadDirectly(
                this.bangumi_id,
                result)
                .subscribe({
                    next: () => {
                        this.dialogRef.close(true);
                    },
                    error: (error) => {
                        this.toastRef.show(error?.message);
                    }
                })
        );
    }

    cancel(): void {
        this.dialogRef.close(false);
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
