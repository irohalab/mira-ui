import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MediaFile } from '../../../../entity/MediaFile';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { AdminService } from '../../../admin.service';
import { copyElementValueToClipboard } from '../../../../../helpers/clipboard';
import { FormsModule } from '@angular/forms';
import { ReadableUnit } from '../../../../pipes/readable-unit';
import { NgClass } from '@angular/common';

@Component({
    selector: 'download-editor',
    templateUrl: './download-editor.html',
    styleUrls: ['./download-editor.less'],
    imports: [FormsModule, ReadableUnit, NgClass]
})
export class DownloadEditorComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;

    isDarkTheme: boolean;

    torrentTitle: string;
    downloadUrl: string;

    files: MediaFile[];

    eps_mapping: {eps_no: number, format: string, selected: boolean}[];

    bangumiId: string;

    resourceGroupId: string;

    @ViewChild('downloadUrlTextBox', {static: true}) _downloadUrlTextBoxRef: ElementRef;

    constructor(private adminService: AdminService,
                private dialogRef: UIDialogRef<DownloadEditorComponent>,
                private _darkThemeService: DarkThemeService,
                toast: UIToast) {
        this.toastRef = toast.makeText();
    }
    ngOnInit(): void {
        this.subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
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
                this.bangumiId,
                this.resourceGroupId,
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
