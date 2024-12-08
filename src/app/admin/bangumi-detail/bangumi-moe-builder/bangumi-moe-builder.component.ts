
import {fromEvent as observableFromEvent, Observable, Subscription} from 'rxjs';

import {mergeMap, filter, distinctUntilChanged, debounceTime, map} from 'rxjs/operators';
import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {UIDialogRef, UIToast, UIToastComponent, UIToastRef} from '@irohalab/deneb-ui';
import {Bangumi} from '../../../entity/bangumi';
import {BangumiMoeService} from './bangumi-moe.service';
import {Tag, Torrent} from './bangum-moe-entity';


@Component({
    selector: 'bangumi-moe-builder',
    templateUrl: './bangumi-moe-builder.html',
    styleUrls: ['./bangumi-moe-builder.less'],
    standalone: false
})
export class BangumiMoeBuilder implements OnInit, OnDestroy, AfterViewInit {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    @ViewChild('searchBox', {static: false}) searchBox: ElementRef;

    @Input()
    bangumi: Bangumi;

    selectedTags: Tag[];
    formatTags: Tag[];
    langTags: Tag[];
    miscTags: Tag[];
    categoryTags: Tag[];
    popularTeamTags: Tag[];
    popularBangumiTags: Tag[];

    searchResultTags: Tag[];

    torrentList: Torrent[];
    page: number = 1;
    total: number = 0;

    constructor(private _bangumiMoeService: BangumiMoeService,
                private _dialogRef: UIDialogRef<BangumiMoeBuilder>,
                toastService: UIToast) {
        this._toastRef = toastService.makeText();
    }

    ngOnInit(): void {
        if (this.bangumi.bangumi_moe) {
            this.selectedTags = JSON.parse(this.bangumi.bangumi_moe);
        } else {
            this.selectedTags = [];
        }
        if (Array.isArray(this.selectedTags) && this.selectedTags.length > 0) {
            this.searchTorrent();
        }
        this._subscription.add(
            this._bangumiMoeService.commonTags()
            .subscribe(
                (tags: Tag[]) => {
                    this.formatTags = tags.filter(tag => tag.type === 'format');
                    this.langTags = tags.filter(tag => tag.type === 'lang');
                    this.miscTags = tags.filter(tag => tag.type === 'misc');
                },
                (error) => {
                    this._toastRef.show(error);
                }
            )
        );
        this._subscription.add(
            this._bangumiMoeService.miscTags()
                .subscribe(
                    (tags: Tag[]) => {
                        this.categoryTags = tags;
                    },
                    (error) => {
                        this._toastRef.show(error);
                    }
                )
        );
        this._subscription.add(
            this._bangumiMoeService.popularTeamTags()
                .subscribe(
                    (tags: Tag[]) => {
                        this.popularTeamTags = tags;
                    },
                    (error) => {
                        this._toastRef.show(error);
                    }
                )
        );
        this._subscription.add(
            this._bangumiMoeService.popoluarBangumTags()
                .subscribe(
                    (tags: Tag[]) => {
                        this.popularBangumiTags = tags;
                    },
                    (error) => {
                        this._toastRef.show(error);
                    }
                )
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngAfterViewInit(): void {
        let searchBox = this.searchBox.nativeElement;
        this._subscription.add(
            observableFromEvent(searchBox, 'input').pipe(
                map(() => {
                    return (searchBox as HTMLInputElement).value;
                }),
                debounceTime(500),
                distinctUntilChanged(),
                filter(value => !!value),
                mergeMap(
                    (name: string) => {
                        return this._bangumiMoeService.searchTag(name)
                    }
                ),)
                .subscribe(
                    (result: {success: boolean, found: boolean, tag: Tag[]}) => {
                        this.searchResultTags = result.tag;
                    }
                )
        )
    }

    cancel() {
        this._dialogRef.close(null);
    }

    save() {
        let tags;
        if (this.selectedTags.length > 0) {
            tags = JSON.stringify(this.selectedTags);
        } else {
            tags = null;
        }
        this._dialogRef.close({result: tags});
    }

    selectTag(tag: Tag) {
        this.selectedTags.push(tag);
        this.searchTorrent();
    }

    removeTag(tag: Tag) {
        this.selectedTags.splice(this.selectedTags.indexOf(tag), 1);
        this.searchTorrent();
    }

    searchTorrent() {
        if(this.selectedTags.length === 0) {
            return;
        }
        let tag_ids = this.selectedTags.map(tag => tag._id);
        this._subscription.add(
            this._bangumiMoeService
                .searchTorrent(tag_ids, this.page)
                .subscribe(
                    (result) => {
                        this.torrentList = result.torrents;
                        this.total = result.count;
                    }
                )
        );
    }
}
