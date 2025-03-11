import {Pipe, PipeTransform} from '@angular/core';

export const BANGUMI_TYPES: {[key: number]: string} = {
    2: '动画',
    6: '电视剧'
};

@Pipe({
    name: 'bangumiTypeName',
    standalone: false
})
export class BangumiTypeNamePipe implements PipeTransform {

    transform(value: number | string): any {
        return BANGUMI_TYPES[value as number] || '未知类型';
    }
}
