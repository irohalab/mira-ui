import {NgModule} from '@angular/core';
import {UserLevelNamePipe} from './user-level-name.pipe';
import {WeekdayPipe} from './weekday.pipe';
import { ReadableUnit } from './readable-unit';
import { ContrastColorPipe } from './contrast-color.pipe';

export const PIPES = [
    UserLevelNamePipe,
    WeekdayPipe,
    ReadableUnit,
    ContrastColorPipe
];

@NgModule({
    declarations: PIPES,
    exports: PIPES
})
export class DenebCommonPipes {

}
