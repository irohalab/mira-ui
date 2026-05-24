import {NgModule} from '@angular/core';
import {UserLevelNamePipe} from './user-level-name.pipe';
import {WeekdayPipe} from './weekday.pipe';
import { ReadableUnit } from './readable-unit';
import { ContrastColorPipe } from './contrast-color.pipe';
import { FavoriteStatusTextPipe } from './favorite-status-text.pipe';

export const PIPES = [
    UserLevelNamePipe,
    WeekdayPipe,
    ReadableUnit,
    ContrastColorPipe,
    FavoriteStatusTextPipe
];

@NgModule({
    declarations: PIPES,
    exports: PIPES
})
export class DenebCommonPipes {

}
