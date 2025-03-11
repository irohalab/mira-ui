import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BangumiRaw } from '../../../entity/BangumiRaw';

@Component({
    selector: 'result-detail',
    templateUrl: './result-detail.html',
    styleUrls: ['./result-detail.less'],
    standalone: false
})
export class ResultDetail {

    @Input()
    bangumi: BangumiRaw;

    @Input()
    showDetail: boolean = false;

    @Output()
    finish = new EventEmitter<string|null>();

    constructor() {
    }

    back() {
        this.finish.emit(null);
    }

    done() {
        this.finish.emit(this.bangumi.itemId);
    }
}
