import {PipeTransform, Pipe} from "@angular/core";

@Pipe({
    name: 'weekday',
    standalone: false
})
export class WeekdayPipe implements PipeTransform {

  weekday_cn = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

  transform(value:any, ...args: any[]):any {
    if(Number.isInteger(value) && value < this.weekday_cn.length) {
      return this.weekday_cn[value];
    } else {
      return '';
    }
  }
}
