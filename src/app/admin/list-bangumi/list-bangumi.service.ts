import { Injectable } from '@angular/core';

@Injectable()
export class ListBangumiService {
    scrollPosition: number;
    orderBy: string = 'createTime';
    sort: string = 'desc';
    type: number = 0;
    isMovie: boolean = false;
}
