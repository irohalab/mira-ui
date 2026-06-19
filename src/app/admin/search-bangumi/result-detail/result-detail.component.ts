import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BangumiRaw } from '../../../entity/BangumiRaw';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'result-detail',
    templateUrl: './result-detail.html',
    styleUrls: ['./result-detail.less'],
    imports: [NgClass, FormsModule]
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
