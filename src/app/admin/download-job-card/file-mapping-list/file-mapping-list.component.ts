import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FileMapping } from '../../../entity/FileMapping';
import { DownloadManagerService } from '../../download-manager/download-manager.service';
import { Subscription } from 'rxjs';
import { UIDialogRef } from '@irohalab/deneb-ui';

@Component({
    selector: 'file-mapping-list',
    templateUrl: './file-mapping-list.html',
    styleUrls: ['./file-mapping-list.less'],
    standalone: false
})
export class FileMappingListComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    fileMappingEnhanced = false;

    constructor(private _downloadManagerService: DownloadManagerService,
                private _dialogRef: UIDialogRef<FileMappingListComponent>) {
    }

    @Input()
    fileMapping: FileMapping[];

    @Input()
    jobId: string;

    public ngOnInit(): void {
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
