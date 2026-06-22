import { Bangumi } from './bangumi';

export class Announce {
    id?: string;
    content: string;
    bangumi?: Bangumi;
    imageUrl?: string;
    position: number;
    sortOrder: number;
    startTime: number;
    endTime: number;

    static POSITION_BANNER = 1;
    static POSITION_BANGUMI = 2;
}
