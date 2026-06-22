import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { FileMapping } from '../../../entity/FileMapping';
import { DownloadManagerService } from '../../download-manager/download-manager.service';
import { Subscription } from 'rxjs';
import { DARK_THEME, DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import { NgClass } from '@angular/common';

@Component({
    selector: 'file-mapping-list',
    templateUrl: './file-mapping-list.html',
    styleUrls: ['./file-mapping-list.less'],
    imports: [NgClass]
})
export class FileMappingListComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    fileMappingEnhanced = false;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _downloadManagerService: DownloadManagerService,
                private _darkThemeService: DarkThemeService,
                private _dialogRef: UIDialogRef<FileMappingListComponent>) {
    }

    @Input()
    fileMapping: FileMapping[];

    @Input()
    jobId: string;

    public ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this._subscription.add(
            this._downloadManagerService.enhance_file_mapping(this.fileMapping)
                .subscribe((newMapping) => {
                    this.fileMappingEnhanced = true;
                    this.fileMapping = newMapping;
                })
        );
    }

    public ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    close(): void {
        this._dialogRef.close();
    }
}
