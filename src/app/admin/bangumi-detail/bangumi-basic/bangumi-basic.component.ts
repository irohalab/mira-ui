import { Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UIDialogRef, DARK_THEME, DarkThemeService } from '@irohalab/deneb-ui';
import { Account } from '../../../entity/Account';
import { Subscription } from 'rxjs';
import { BangumiAdminEntity } from '../../../entity/admin/BangumiAdminEntity';

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
    bangumi: BangumiAdminEntity;

    bangumiForm: FormGroup;

    adminList: Account[];

    constructor(private _fb: FormBuilder,
                private _darkThemeService: DarkThemeService,
                private _dialogRef: UIDialogRef<BangumiBasic>) {
    }

    ngOnInit(): void {
        console.log('adminList', this.adminList);
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => { this.isDarkTheme = theme === DARK_THEME; })
        );
        this.bangumiForm = this._fb.group({
            eps_no_offset: this.bangumi.epsNoOffset,
            status: this.bangumi.status,
            maintainedByUid: this.bangumi.maintainedByUid || '',
            alertTimeout: this.bangumi.alertTimeout
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
