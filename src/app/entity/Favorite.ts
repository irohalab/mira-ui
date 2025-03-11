import { Bangumi } from './bangumi';
import { FavoriteStatus } from './FavoriteStatus';

export class Favorite {
    id!: string;
    userId!: string;
    bangumi!: Bangumi;
    status!: FavoriteStatus;
    updateTime!: string;
    checkTime!: string;

    // @Optional
    unwatchedCount!: number;
    // @Optional
    epsUpdateTime!: string;

    [key: string]: any;
}
