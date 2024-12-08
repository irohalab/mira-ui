import { Pipe, PipeTransform } from '@angular/core';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import dayjs from 'dayjs';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const byteUnit = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const thresh = 1024;
@Pipe({
    name: 'readableUnit',
    standalone: false
})
export class ReadableUnit implements PipeTransform {
    public transform(value: any, unit: string, decimal: number): any {
        let readableValue: any;
        const r = 10**decimal;
        switch (unit) {
            case 'byte':
                if (Math.abs(value) < thresh) {
                    return value + 'B';
                }
                let u = -1;
                do {
                    value /= thresh;
                    ++u;
                } while (Math.round(Math.abs(value) * r) / r >= thresh && u < byteUnit.length - 1);
                return value.toFixed(decimal) + byteUnit[u];
            case 'second':
                const duration = dayjs.duration(value, 'seconds');
                return duration.humanize();
            default:
                console.log(value + ' fall to default in ReadableUnit');
                // do nothing return the original
                readableValue = value;
        }
        return readableValue;
    }
}
