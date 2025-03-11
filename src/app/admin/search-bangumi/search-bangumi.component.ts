import { fromEvent as observableFromEvent, Observable, Subscription } from 'rxjs';

import { distinctUntilChanged, map, debounceTime, takeWhile, mergeMap, tap, filter } from 'rxjs/operators';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { AdminService } from '../admin.service';
import { UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { BaseError } from '../../../helpers/error/BaseError';
import { MainItem } from '../../entity/main-item';
import { BangumiRaw } from '../../entity/BangumiRaw';

// export const SEARCH_BAR_HEIGHT = 4.8;

@Component({
    selector: 'search-bangumi',
    templateUrl: './search-bangumi.html',
    styleUrls: ['./search-bangumi.less'],
    standalone: false
})
export class SearchBangumi implements AfterViewInit {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    @ViewChild('searchBox', {static: false}) searchBox: ElementRef;
    @ViewChild('typePicker', {static: false}) typePicker: ElementRef;

    name: string;
    bangumiType: number = 2;

    currentPage: number = 1;
    total: number = 0;
    count: number = 10;

    bangumiList: BangumiRaw[];
    isLoading: boolean = false;

    typePickerOpen: boolean = false;

    selectedBgm: BangumiRaw;

    showDetail: boolean = false;
    isSaving: boolean = false;

    constructor(private _adminService: AdminService,
                private _dialogRef: UIDialogRef<SearchBangumi>,
                toastService: UIToast) {
        this._toastRef = toastService.makeText();
    }

    ngAfterViewInit(): void {
        let searchBox = <HTMLElement>this.searchBox.nativeElement;
        let typePicker = <HTMLElement>this.typePicker.nativeElement;

        this._subscription.add(
            observableFromEvent<MouseEvent>(typePicker, 'click').pipe(
                filter(() => !this.typePickerOpen),
                tap((event: MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.typePickerOpen = true;
                }),
                mergeMap(() => {
                    return observableFromEvent<MouseEvent>(document.body, 'click').pipe(
                        tap((event: MouseEvent) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }),
                        takeWhile(() => this.typePickerOpen),)
                }),)
                .subscribe(
                    () => {
                        this.typePickerOpen = false;
                    }
                )
        );

        this._subscription.add(
            observableFromEvent(searchBox, 'keyup').pipe(
                debounceTime(500),
                map(() => (searchBox as HTMLInputElement).value),
                distinctUntilChanged(),
                filter(name => !!name),)
                .subscribe(
                    (name: string) => {
                        this.currentPage = 1;
                        this.name = name;
                        this.fetchData();
                    }
                )
        );
        // setTimeout(() => {
        //     let cardHeight = getRemPixel(CARD_HEIGHT_REM);
        //     let viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        //     let scaleFactor = viewportHeight < 600 ? 1 : 0.8;
        //     let uiPaginationHeight = getRemPixel(1/* font-size */ + 0.92857143/* padding */ * 2 + 2 /* margin-top */);
        //     this.bangumiListHeight = Math.floor(viewportHeight * scaleFactor) - getRemPixel(SEARCH_BAR_HEIGHT) - uiPaginationHeight;
        //     this.count = Math.max(1, Math.floor((this.bangumiListHeight - uiPaginationHeight) / cardHeight));
        //     console.log(this.count);
        // });
    }

    onPageChanged(page: number) {
        this.currentPage = page;
        this.fetchData();
    }

    onTypeChanged(type: number) {
        this.bangumiType = type;
        this.fetchData();
    }

    fetchData() {
        if (!this.name) {
            return;
        }
        let offset = (this.currentPage - 1) * this.count;
        this.isLoading = true;
        this._adminService.searchBangumi({
            keyword: this.name,
            type: this.bangumiType,
            offset: offset,
            count: this.count
        })
            .subscribe({
                next: (result: { data: BangumiRaw[], total: number }) => {
                    this.bangumiList = result.data;
                    this.total = result.total;
                    this.isLoading = false;
                },
                error: (error: BaseError) => {
                    this.bangumiList = [];
                    this._toastRef.show(error.message);
                    this.isLoading = false;
                }
            });
    }

    cancelSearch() {
        this._dialogRef.close('cancelled');
    }

    viewDetail(bangumi: BangumiRaw): void {
        if (bangumi.id) {
            return;
        }
        this.selectedBgm = bangumi;
        this.showDetail = true;
    }

    fromDetail(itemId: string): void {
        if (itemId) {
            this.isSaving = true;
            this._subscription.add(
                this._adminService.addBangumi(itemId)
                    .subscribe({
                        next: (bangumi: BangumiRaw) => {
                            this._dialogRef.close(bangumi.id);
                        },
                        error: (error: BaseError) => {
                            this.isSaving = false;
                            this._toastRef.show(error.message);
                        }
                    })
            );
        } else {
            this.showDetail = false;
        }
    }
}
