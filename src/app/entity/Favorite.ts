import { Bangumi } from './bangumi';
import { FavoriteStatus } from './FavoriteStatus';

export class Favorite {
    id!: string;
    userId!: string;
    bangumi!: Bangumi;
    status!: FavoriteStatus;
    updateTime!: string;
    checkTime!: string;
    itemId!: string;
    externalFavoriteId!: string;

    // @Optional
    unwatchedCount!: number;
    // @Optional
    epsUpdateTime!: string;

    // @Optional
    rating!: number;
    // @Optional
    reviewComment!: string;

    [key: string]: any;
}
