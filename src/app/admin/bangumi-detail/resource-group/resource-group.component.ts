import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Bangumi } from '../../../entity';
import { ResourceGroup } from '../../../entity/ResourceGroup';
import { EMPTY, Subscription } from 'rxjs';
import { AdminService } from '../../admin.service';
import { UIDialog, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { ResourceScannerEditor } from '../resource-scanner-editor/resource-scanner-editor.component';
import { FeedService } from '../feed.service';
import { ResourceScanner } from '../../../entity/ResourceScanner';
import { filter, switchMap } from 'rxjs/operators';
import { nanoid } from 'nanoid';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
    selector: 'app-resource-group',
    templateUrl: './resource-group.component.html',
    styleUrl: './resource-group.component.less',
    standalone: false
})
export class ResourceGroupComponent implements OnInit, OnDestroy {
    private subscription = new Subscription();
    private toastRef!: UIToastRef<UIToastComponent>;

    @Input()
    bangumi!: Bangumi;

    resourceGroupList: ResourceGroup[] = [];

    feedList: string[];
    scannerLoadingState = false;

    rgFormDict: {[rgId: string]: FormGroup} = {};

    @Output()
    episodeChanged = new EventEmitter<string>();

    constructor(private adminService: AdminService,
                private feedService: FeedService,
                private uiDialog: UIDialog,
                private formBuilder: FormBuilder,
                toastService: UIToast) {
        this.toastRef = toastService.makeText();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    ngOnInit(): void {
        this.subscription.add(
            this.adminService.listResourceGroups(
                this.bangumi.id
            )
                .subscribe({
                    next: (resourceGroups: ResourceGroup[]) => {
                        this.resourceGroupList = resourceGroups;

                        for (const resourceGroup of this.resourceGroupList) {
                            this.rgFormDict[resourceGroup.id] = this.formBuilder.group({
                                displayName: [resourceGroup.displayName, Validators.required],
                                alertThresholdDay: [resourceGroup.alertThresholdDay]
                            });
                        }
                    }
                })
        );
        this.subscription.add(
            this.feedService.getUniversalMeta()
                .subscribe({
                    next: (metaList) => {
                        this.feedList = metaList;
                    },
                    error: (error) => {
                        this.toastRef.show(error.message);
                    }
                })
        );
    }

    updateResourceGroup(resourceGroup: ResourceGroup): void {
        const rgForm = this.rgFormDict[resourceGroup.id];
        if (rgForm.invalid) {
            return;
        }
        const value = rgForm.value as { displayName: string, alertThresholdDay: number };
        resourceGroup.displayName = value.displayName;
        resourceGroup.alertThresholdDay = value.alertThresholdDay;
        this.subscription.add(
            this.adminService.updateResourceGroup(resourceGroup)
                .subscribe({
                    next: (updatedRG: ResourceGroup) => {
                        const idx = this.resourceGroupList.findIndex(rg => rg.id === updatedRG.id);
                        if (idx >= 0) {
                            this.resourceGroupList[idx] = updatedRG
                        }
                        this.toastRef.show(`Update resourceGroup successfully`);
                    },
                    error: (error) => {
                        this.toastRef.show(error.error?.message || 'Unknown error');
                    }
                })
        )
    }

    resetForm(resourceGroup: ResourceGroup): void {
        this.rgFormDict[resourceGroup.id].patchValue({
            displayName: resourceGroup.displayName,
            alertThresholdDay: resourceGroup.alertThresholdDay
        });
        this.rgFormDict[resourceGroup.id].markAsPristine();
    }

    addScanner(group: ResourceGroup): void {
        const scanner: ResourceScanner = {
            id: nanoid(8),
            feed: this.feedList[0],
            criteria: '',
            enableRegex: false
        };
        this.editScanner(scanner, group, false);
    }

    editScanner(scanner: ResourceScanner, group: ResourceGroup, isEditing: boolean = true): void {
        let dialogRef = this.uiDialog.open(ResourceScannerEditor, {stickyDialog: true, backdrop: true});
        dialogRef.componentInstance.bangumi = this.bangumi;
        dialogRef.componentInstance.feedList = this.feedList;
        dialogRef.componentInstance.scanner = scanner;
        const index = group.scanner.findIndex(sc => sc.id === scanner.id);
        dialogRef.componentInstance.scannerIndex = index >= 0 ? index : group.scanner.length;
        dialogRef.componentInstance.isEditing = isEditing;
        this.subscription.add(
            dialogRef.afterClosed().pipe(
                filter((result: any) => !!result),
                switchMap((result: any) => {
                    this.scannerLoadingState = true;
                    if (result.result === ResourceScannerEditor.DIALOG_RESULT_DOWNLOAD_DIRECTLY) {
                        this.episodeChanged.emit(this.bangumi.id);
                        return EMPTY;
                    } else if (result === ResourceScannerEditor.DIALOG_RESULT_DELETE) {
                        if (index >= 0) {
                            group.scanner.splice(index, 1);
                            return this.adminService.updateResourceGroup(group);
                        } else {
                            return EMPTY;
                        }
                    } else {
                        const idx = group.scanner.findIndex(sc => sc.id === scanner.id);
                        if (idx >= 0) {
                            group.scanner[idx] = scanner;
                        } else {
                            group.scanner.push(scanner);
                        }
                        return this.adminService.updateResourceGroup(group);
                    }
                }),)
                .subscribe({
                    next: () => {
                        this.scannerLoadingState = false;
                        this.toastRef.show('更新成功');
                    },
                    error: (error) => {
                        this.scannerLoadingState = false;
                        this.toastRef.show(error.message);
                    }
                })
        );
    }
}
