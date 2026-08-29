import { Bangumi } from './bangumi';

export class Announce {
    id?: string;
    content: string;
    bangumi?: Bangumi;
    imageUrl?: string;
    position: number;
    sortOrder: number;
    startTime: Date;
    endTime: Date;

    static POSITION_BANNER = 1;
    static POSITION_BANGUMI = 2;
    static fromResponse(resp: Omit<Announce, 'startTime'|'endTime'> & {startTime: string, endTime: string}): Announce {
        return {
            ...resp,
            startTime: new Date(resp.startTime),
            endTime: new Date(resp.endTime)
        };
    }
}
