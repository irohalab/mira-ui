import { Pipe, PipeTransform } from '@angular/core';
import { externalFavoriteStatusToNumber, FavoriteStatus, favoriteStatusToNumber } from '../entity/FavoriteStatus';
import { FavoriteStatus as ExternalFavoriteStatus } from '@irohalab/mira-sdk-angular';

const NUMBER_TO_TEXT = ['', '想看','看过','在看','搁置', '抛弃'];

@Pipe({
    name: 'favoriteStatusText',
    standalone: false
})
export class FavoriteStatusTextPipe implements PipeTransform {
    transform(value: string, ...args: string[]): unknown {
        let result: string;
        if (!value) {
            return '';
        }
        if (args.length > 0 && args[0] === 'external') {
            result = NUMBER_TO_TEXT[externalFavoriteStatusToNumber(value as ExternalFavoriteStatus)];
        } else {
            result = NUMBER_TO_TEXT[favoriteStatusToNumber(value as FavoriteStatus)];
        }
        return result;
    }
}
