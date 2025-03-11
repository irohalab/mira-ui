import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { UIDialog, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';
import { Bangumi, Episode } from '../../../entity';
import { Item } from '../../../entity/item';
import { FeedService } from '../feed.service';
import { DownloadEditorComponent } from './download-editor/download-editor.component';

@Component({
    selector: 'universal-builder',
    templateUrl: './universal-builder.html',
    styleUrls: ['./universal-builder.less'],
    standalone: false
})
export class UniversalBuilderComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    availableMode: string[];

    @Input()
    bangumi: Bangumi;

    @Input()
    modeList: string[];

    @Input()
    mode: string;

    tableItemList: Item[];
    itemList: Item[];

    keywordControl: FormControl;

    isEdit: boolean;

    isSearching: boolean;
    noResultFound: boolean;

    static DIALOG_RESULT_UPDATE_BANGUMI = 'update_bangumi';
    static DIALOG_RESULT_DOWNLOAD_DIRECTLY = 'download_directly';
    static DIALOG_RESULT_DELETE = 'delete';

    constructor(private _feedService: FeedService,
                private _dialogRef: UIDialogRef<UniversalBuilderComponent>,
                private _uiDialog: UIDialog,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }

    cancel(): void {
        this._dialogRef.close(null);
    }

    delete(): void {
        let universalList = JSON.parse(this.bangumi.universal);
        for (let i = 0; i < universalList.length; i++) {
            if (universalList[i].mode === this.mode) {
                universalList.splice(i, 1);
                break;
            }
        }
        this._dialogRef.close({result: UniversalBuilderComponent.DIALOG_RESULT_DELETE, data: universalList});
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.keywordControl = new FormControl();
        let universalList: any[];
        if (this.bangumi.universal) {
            universalList = JSON.parse(this.bangumi.universal) as { mode: string, keyword: string }[];
            this.availableMode = this.modeList.filter(mode => {
                if (!this.mode) {
                    return mode === this.mode || !universalList.some(u => u.mode === mode)
                }
                return !universalList.some(u => u.mode === mode);
            });
        } else {
            this.availableMode = this.modeList;
        }
        if (this.mode && universalList) {
            this.isEdit = true;
            this.keywordControl.patchValue(universalList.find(u => u.mode === this.mode).keyword);
        } else {
            this.isEdit = false;
            this.mode = this.availableMode[0];
            this.keywordControl.patchValue('');
        }
    }

    save(): void {
        let result = {mode: this.mode, keyword: this.keywordControl.value};
        if (!result.keyword && this.isEdit) {
            this.delete();
            return;
        }
        let universalList;
        if (this.bangumi.universal) {
            universalList = JSON.parse(this.bangumi.universal);
        } else {
            universalList = [];
        }
        if (this.isEdit) {
            let found = false;
            for (let i = 0; i < universalList.length; i++) {
                if (universalList[i].mode === result.mode) {
                    universalList[i].keyword = result.keyword;
                    found = true;
                    break;
                }
            }
            if (!found) {
                universalList.push(result);
            }
        } else {
            universalList.push(result);
        }
        this._dialogRef.close({result: UniversalBuilderComponent.DIALOG_RESULT_UPDATE_BANGUMI, data: universalList});
    }

    selectMode(mode: string): void {
        this.mode = mode;
    }

    testFeed(): void {
        this.isSearching = true;
        this.noResultFound = false;
        const keyword = this.keywordControl.value;
        if (!keyword) {
            this._toastRef.show('请输入关键字');
            return;
        }
        this._subscription.add(
            this._feedService.queryUniversal(this.mode, keyword)
                .subscribe({
                    next: (result) => {
                        this.itemList = result;
                        this.noResultFound = this.itemList.length === 0;
                        this.isSearching = false;
                    },
                    error: (error) => {
                        this.isSearching = false;
                        this._toastRef.show(error.message);
                    }
                })
        );
    }

    downloadItemDirectly(index: number, item: Item): void {
        const dialogRef = this._uiDialog.open(DownloadEditorComponent, {stickyDialog: true, backdrop: true});
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
        dialogRef.componentInstance.bangumi_id = this.bangumi.id;
        dialogRef.componentInstance.torrentTitle = item.title;

        this._subscription.add(dialogRef.afterClosed().subscribe({
            next: (result: boolean) => {
                if (result) {
                    this._toastRef.show('已添加下载');
                    this._dialogRef.close({result: UniversalBuilderComponent.DIALOG_RESULT_DOWNLOAD_DIRECTLY});
                }
            }
        }));
    }
}
