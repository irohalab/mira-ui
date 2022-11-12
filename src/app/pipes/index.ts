import {NgModule} from '@angular/core';
import {UserLevelNamePipe} from './user-level-name.pipe';
import {WeekdayPipe} from './weekday.pipe';
import { ReadableUnit } from './readable-unit';

export const PIPES = [
    UserLevelNamePipe,
    WeekdayPipe,
    ReadableUnit
];

@NgModule({
    declarations: PIPES,
    exports: PIPES
})
export class DenebCommonPipes {

}
