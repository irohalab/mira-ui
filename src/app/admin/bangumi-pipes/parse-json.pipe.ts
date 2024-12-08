import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'parseJson',
    standalone: false
})
export class ParseJsonPipe implements PipeTransform {

    transform(json: string): any {
        try {
            return JSON.parse(json);
        } catch (e) {
            return [];
        }
    }
}
