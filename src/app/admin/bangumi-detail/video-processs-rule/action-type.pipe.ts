import { Pipe, PipeTransform } from '@angular/core';

const actionTypeMapping: {[key: string]: string} = {
    'convert': 'Convert Action',
    'Merge': 'Merge Action'
};

@Pipe({
    name: 'ActionType',
    standalone: false
})
export class ActionTypePipe implements PipeTransform {
    transform(value: any, ...args: any[]): any {
        return actionTypeMapping[value] || value;
    }
}
