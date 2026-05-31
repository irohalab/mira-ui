import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FileMapping } from '../../../entity/FileMapping';
import { DownloadManagerService } from '../../download-manager/download-manager.service';
import { Subscription } from 'rxjs';
import { UIDialogRef } from '@irohalab/deneb-ui';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
    selector: 'file-mapping-list',
    templateUrl: './file-mapping-list.html',
    styleUrls: ['./file-mapping-list.less']
})
export class FileMappingListComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    fileMappingEnhanced = false;

    constructor(private downloadManagerService: DownloadManagerService,
                private dialogRef: UIDialogRef<FileMappingListComponent>,
                private formBuilder: FormBuilder) {
    }

    @Input()
    fileMapping: FileMapping[];

    @Input()
    jobId: string;

    fileMappingFormGroup!: FormGroup;

    public ngOnInit(): void {
        this.fileMappingFormGroup = this.formBuilder.group(this.fileMapping.reduce((prev, curr) => {
            prev[curr.videoId] = curr.filePath;
            return prev;
        }, {} as {[id: string]: string}));

        this._subscription.add(
            this.downloadManagerService.enhance_file_mapping(this.fileMapping)
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
        this.dialogRef.close();
    }
}
