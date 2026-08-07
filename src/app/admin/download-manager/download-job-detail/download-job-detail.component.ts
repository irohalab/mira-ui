import { Component, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DARK_THEME, DarkThemeService, UIDialogRef, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { DownloadJob } from '../../../entity/DownloadJob';
import { concat, Observable, of, Subscription, timer } from 'rxjs';
import { DownloadManagerService } from '../download-manager.service';
import { catchError, filter, finalize, map, switchMap, takeWhile } from 'rxjs/operators';
import { DownloadJobStatus } from '../../../entity/DownloadJobStatus';
import { TorrentFile } from '../../../entity/TorrentFile';
import { Router } from '@angular/router';
import { DatePipe, NgClass, PercentPipe } from '@angular/common';
import { ReadableUnit } from '../../../pipes/readable-unit';
import { FinishMessageResendState } from '../../../entity/FinishMessageResendState';

type JobDetailTab = 'details' | 'content' | 'downloadedObjects';

interface FinishMessageResendUpdate {
    state: FinishMessageResendState;
    job?: DownloadJob;
    refreshError?: unknown;
}

@Component({
    selector: 'download-job-detail',
    templateUrl: './download-job-detail.html',
    styleUrls: ['./download-job-detail.less'],
    imports: [NgClass, PercentPipe, DatePipe, ReadableUnit]
})
export class DownloadJobDetailComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;

    mJobStatus = DownloadJobStatus;

    @Input()
    job: DownloadJob;

    @Output()
    navigationRequested = new EventEmitter<any[]>();

    jobContent: TorrentFile[] = [];
    activeTab: JobDetailTab = 'details';
    isResendingCompleteMessage: boolean = false;
    finishMessageResend?: FinishMessageResendState;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    constructor(private _dialogRef: UIDialogRef<DownloadJobDetailComponent>,
                private _downloadManagerService: DownloadManagerService,
                private _darkThemeService: DarkThemeService,
                private _router: Router,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }
    closePanel(): void {
        this._dialogRef.close(null);
    }

    selectTab(tab: JobDetailTab): void {
        this.activeTab = tab;
    }

    navigate(commands: any[]): void {
        if (this.navigationRequested.observed) {
            this.navigationRequested.emit(commands);
            return;
        }
        this.closePanel();
        this._router.navigate(commands);
    }

    resendCompleteMessage(): void {
        if (this.isResendingCompleteMessage) {
            return;
        }

        this.monitorFinishMessageResend(
            this._downloadManagerService.resendJobCompleteMessage(this.job.id)
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );

        const existingResend = this.job.finishMessageResend;
        this.finishMessageResend = existingResend;
        if (this.isFinishMessageResendActive(existingResend)) {
            this.monitorFinishMessageResend(of(existingResend));
        }

        const refreshJob$ = this.isActiveJob(this.job)
            ? timer(0, 5000).pipe(takeWhile(() => this.isActiveJob(this.job)))
            : of(0);

        this._subscription.add(
            refreshJob$
                .pipe(
                    switchMap(() => this._downloadManagerService.getJob(this.job.id)),
                    switchMap((job) => {
                        this.job = job;
                        return this.hasContent(job) ? this._downloadManagerService.getJobContent(job.id) : of([]);
                    }))
                .subscribe({
                    next: (content) => {
                        this.jobContent = content;
                    },
                    error: (error) => {
                        this._toastRef.show(error.message || error);
                    }
                })
        );
    }

    get resendProgressPercent(): number {
        const percent = this.finishMessageResend?.percent ?? 0;
        return Math.min(Math.max(percent, 0), 100);
    }

    get hasResendProgress(): boolean {
        return this.finishMessageResend?.percent !== undefined;
    }

    get resendStatusLabel(): string {
        const resend = this.finishMessageResend;
        if (!resend) {
            return '';
        }
        if (resend.status === 'succeeded') {
            return 'Message sent';
        }
        if (resend.status === 'failed') {
            return 'Resend failed';
        }
        switch (resend.phase) {
            case 'preparing':
                return 'Preparing files';
            case 'uploading':
                return 'Uploading files';
            case 'publishing':
                return 'Publishing message';
            default:
                return 'Queued';
        }
    }

    private monitorFinishMessageResend(start$: Observable<FinishMessageResendState>): void {
        this.isResendingCompleteMessage = true;
        this._subscription.add(
            start$
                .pipe(
                    switchMap(initialState => concat(
                        of(initialState),
                        timer(1000, 1000).pipe(
                            switchMap(() => this._downloadManagerService.getJobCompleteMessageResend(this.job.id)),
                            filter((state): state is FinishMessageResendState => state !== null)
                        )
                    )),
                    takeWhile(state => this.isFinishMessageResendActive(state), true),
                    switchMap((state): Observable<FinishMessageResendUpdate> => {
                        if (this.isFinishMessageResendActive(state)) {
                            return of({state});
                        }
                        return this._downloadManagerService.getJob(this.job.id).pipe(
                            map(job => ({
                                state: job.finishMessageResend ?? state,
                                job
                            })),
                            catchError(refreshError => of({state, refreshError}))
                        );
                    }),
                    finalize(() => { this.isResendingCompleteMessage = false; })
                )
                .subscribe({
                    next: ({state, job, refreshError}) => {
                        if (job) {
                            this.job = job;
                        }
                        this.finishMessageResend = state;
                        if (state.status === 'succeeded') {
                            const message = refreshError
                                ? `Complete message sent, but job refresh failed: ${this.getErrorMessage(refreshError)}`
                                : 'Complete message sent.';
                            this._toastRef.show(message);
                        } else if (state.status === 'failed') {
                            this._toastRef.show(state.error ? `Resend failed: ${state.error}` : 'Resend failed.');
                        }
                    },
                    error: (error) => {
                        this._toastRef.show(error.message || error);
                    }
                })
        );
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    private isFinishMessageResendActive(state?: FinishMessageResendState): boolean {
        return state?.status === 'pending' || state?.status === 'running';
    }

    private isActiveJob(job: DownloadJob): boolean {
        return job.status === DownloadJobStatus.Downloading
            || job.status === DownloadJobStatus.Pending
            || job.status === DownloadJobStatus.Paused;
    }

    private hasContent(job: DownloadJob): boolean {
        return job.status === DownloadJobStatus.Complete || this.isActiveJob(job);
    }
}
