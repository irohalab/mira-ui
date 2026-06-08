import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialog, UIDialogRef, UIToast, UIToastComponent, UIToastRef, UIDropdown, UIToggle } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Bangumi, Episode } from '../../../entity';
import { Item } from '../../../entity/item';
import { FeedService } from '../feed.service';
import { DownloadEditorComponent } from './download-editor/download-editor.component';
import { ResourceScanner } from '../../../entity/ResourceScanner';
import { NgClass } from '@angular/common';
import { ConfirmDialogDirective } from '../../../confirm-dialog/confirm-dialog.directive';

@Component({
    selector: 'resource-scanner-editor',
    templateUrl: './resource-scanner-editor.html',
    styleUrls: ['./resource-scanner-editor.less'],
    imports: [FormsModule, ReactiveFormsModule, UIDropdown, UIToggle, NgClass, ConfirmDialogDirective]
})
export class ResourceScannerEditor implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef: UIToastRef<UIToastComponent>;

    @Input()
    bangumi!: Bangumi;

    @Input()
    feedList!: string[];

    @Input()
    scanner!: ResourceScanner;

    @Input()
    scannerIndex!: number;

    @Input()
    isEditing: boolean;

    @Input()
    resourceGroupId: string;

    scannerForm!: FormGroup;

    tableItemList: Item[];
    itemList: Item[];
    isSearching: boolean;
    noResultFound: boolean;

    static DIALOG_RESULT_UPDATE = 'update';
    static DIALOG_RESULT_DOWNLOAD_DIRECTLY = 'download_directly';
    static DIALOG_RESULT_DELETE = 'delete';

    constructor(private feedService: FeedService,
                private dialogRef: UIDialogRef<ResourceScannerEditor>,
                private uiDialog: UIDialog,
                private formBuilder: FormBuilder,
                toast: UIToast) {
        this.toastRef = toast.makeText();
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    delete(): void {
        this.dialogRef.close(ResourceScannerEditor.DIALOG_RESULT_DELETE);
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.scannerForm = this.formBuilder.group({
            feed: [this.scanner.feed],
            criteria: [this.scanner.criteria, Validators.required],
            offset: [this.scanner.offset],
            enableRegex: [!!this.scanner.matchRegex],
            matchRegex: [this.scanner.matchRegex]
        });
    }

    save(): void {
        const result = this.scannerForm.value as ResourceScanner;
        this.scanner.feed = result.feed;
        this.scanner.criteria = result.criteria;
        this.scanner.offset = result.offset;
        if (result.enableRegex) {
            this.scanner.matchRegex = result.matchRegex;
        }
        this.dialogRef.close(ResourceScannerEditor.DIALOG_RESULT_UPDATE);
    }

    selectMode(feed: string): void {
        this.scannerForm.patchValue({feed});
    }

    testFeed(): void {
        this.isSearching = true;
        this.noResultFound = false;
        const scannerValue = this.scannerForm.value as ResourceScanner;
        if (!scannerValue.criteria) {
            this.toastRef.show('请输入关键字');
            return;
        }
        let matchRegex = null;
        if (scannerValue.enableRegex && scannerValue.matchRegex) {
            matchRegex = scannerValue.matchRegex;
        }
        this.subscription.add(
            this.feedService.queryUniversal(scannerValue.feed, scannerValue.criteria, matchRegex)
                .subscribe({
                    next: (result) => {
                        this.itemList = result;
                        this.noResultFound = this.itemList.length === 0;
                        this.isSearching = false;
                    },
                    error: (error) => {
                        this.isSearching = false;
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    downloadItemDirectly(index: number, item: Item): void {
        const dialogRef = this.uiDialog.open(DownloadEditorComponent, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.files = item.files
        dialogRef.componentInstance.eps_mapping = item.eps_no_list.map(entry => {
            const episode = this.bangumi.episodes.find(eps => {
                return eps.episodeNo === entry.eps_no;
            })
            return {
                eps_no: entry.eps_no,
                format: entry.format,
                selected: episode ? episode.status === Episode.STATUS_NOT_DOWNLOADED : false
            };
        });
        dialogRef.componentInstance.downloadUrl = item.magnet_uri;
        dialogRef.componentInstance.bangumiId = this.bangumi.id;
        dialogRef.componentInstance.torrentTitle = item.title;
        dialogRef.componentInstance.resourceGroupId = this.resourceGroupId;

        this.subscription.add(dialogRef.afterClosed().subscribe({
            next: (result: boolean) => {
                if (result) {
                    this.toastRef.show('已添加下载');
                    this.dialogRef.close(ResourceScannerEditor.DIALOG_RESULT_DOWNLOAD_DIRECTLY);
                }
            }
        }));
    }
}
