import { Component, Input, OnInit } from '@angular/core';
import { Bangumi } from '../../../entity';
import { FormBuilder, FormGroup } from '@angular/forms';
import { UIDialogRef } from '@irohalab/deneb-ui';
import { Account } from '../../../entity/Account';

@Component({
    selector: 'bangumi-basic',
    templateUrl: './bangumi-basic.html',
    styleUrls: ['./bangumi-basic.less'],
    standalone: false
})
export class BangumiBasic implements OnInit {

    @Input()
    bangumi: Bangumi;

    bangumiForm: FormGroup;

    adminList: Account[];

    constructor(private _fb: FormBuilder,
                private _dialogRef: UIDialogRef<BangumiBasic>) {
    }

    ngOnInit(): void {
        this.bangumiForm = this._fb.group({
            eps_no_offset: this.bangumi.eps_no_offset,
            status: this.bangumi.status,
            maintained_by_uid: this.bangumi.maintained_by ? this.bangumi.maintained_by.id: '',
            alert_timeout: this.bangumi.alert_timeout
        });
    }

    cancel() {
        this._dialogRef.close(null);
    }

    save() {
        this._dialogRef.close(this.bangumiForm.value);
    }
}
