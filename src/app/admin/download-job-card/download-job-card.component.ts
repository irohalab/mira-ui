import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { DownloadJob } from '../../entity/DownloadJob';
import { DownloadJobStatus } from '../../entity/DownloadJobStatus';
import { DARK_THEME, DarkThemeService, UIDialog } from '@irohalab/deneb-ui';
import { FileMappingListComponent } from './file-mapping-list/file-mapping-list.component';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { ReadableUnit } from '../../pipes/readable-unit';

@Component({
    selector: 'download-job-card',
    templateUrl: './download-job-card.html',
    styleUrls: ['./download-job-card.less'],
    encapsulation: ViewEncapsulation.None,
    imports: [RouterLink, NgClass, ReadableUnit]
})
export class DownloadJobCardComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @Output()
    selectCard = new EventEmitter<string>();

    @Output()
    viewDetail = new EventEmitter<DownloadJob>();

    @Input()
    job: DownloadJob;

    mJobStatus = DownloadJobStatus;

    episodeNoList: string[]

    isDarkTheme: boolean;

    constructor(private _dialog: UIDialog,
                private _darkThemeService: DarkThemeService) {}

    onViewFileMapping(event: Event) {
        event.stopPropagation();
        const dialogRef = this._dialog.open(FileMappingListComponent, {stickyDialog: false, backdrop: true})
        dialogRef.componentInstance.fileMapping = this.job.fileMapping;
        dialogRef.componentInstance.jobId = this.job.id;
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        if (this.job.fileMapping) {
            this.episodeNoList = this.job.fileMapping
                .map(mapping => mapping.episode)
                .filter(eps => !!eps)
                .map(eps => eps.episodeNo + '');
        }
    }

    onClickCard(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.selectCard.emit(this.job.id);
    }

    onViewDetail(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.viewDetail.emit(this.job);
    }
}
