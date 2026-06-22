import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { Bangumi } from '../../../entity';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialogRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Account } from '../../../entity/Account';
import { Subscription } from 'rxjs';

@Component({
    selector: 'bangumi-basic',
    templateUrl: './bangumi-basic.html',
    styleUrls: ['./bangumi-basic.less'],
    imports: [FormsModule, ReactiveFormsModule]
})
export class BangumiBasic implements OnInit, OnDestroy {
    private _subscription = new Subscription();

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    @Input()
    bangumi: Bangumi;

    bangumiForm: FormGroup;

    adminList: Account[];

    constructor(private _fb: FormBuilder,
                private _darkThemeService: DarkThemeService,
                private _dialogRef: UIDialogRef<BangumiBasic>) {
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this.bangumiForm = this._fb.group({
            eps_no_offset: this.bangumi.eps_no_offset,
            status: this.bangumi.status,
            maintained_by_uid: this.bangumi.maintained_by ? this.bangumi.maintained_by.id: '',
            alert_timeout: this.bangumi.alert_timeout
        });
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }

    cancel() {
        this._dialogRef.close(null);
    }

    save() {
        this._dialogRef.close(this.bangumiForm.value);
    }
}
