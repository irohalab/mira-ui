import { Pipe, PipeTransform } from '@angular/core';

/**
 * convert ratio to percentage and set minimal percentage to avoid a zero length progress
 */
@Pipe({name: 'progressValue'})
export class ProgressValuePipe implements PipeTransform {
    transform(value: any): string {
        const percentageValue = value * 100;
        if (percentageValue === 0 || !Number.isFinite(percentageValue)) {
            return '5%';
        } else {
            return percentageValue + '%';
        }
    }
}
