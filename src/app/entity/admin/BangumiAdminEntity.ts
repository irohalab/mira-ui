import { Image } from '../image';
import { Account } from '../Account';
import { EpisodeAdminEntity } from './EpisodeAdminEntity';
import { ItemProperties } from '../ItemProperties';

export class BangumiAdminEntity {
    id!: string;
    itemId!: string;
    bgmId!: number;
    name!: string;
    nameCn!: string;
    type!: number | string;
    eps!: number;
    summary!: string;
    properties!: ItemProperties;
    image!: string;
    airDate!: string;
    airWeekday!: number;
    subType!: string;
    universal!: string;
    status!: number;
    createTime!: string;
    updateTime!: string;
    // @Optional
    epsNoOffset?: number;
    // @Optional
    episodes!: EpisodeAdminEntity[];
    deleteMark?: string;

    // @Optional
    deleteEta?: string;

    // @deprecated
    coverColor?: string;

    coverImage!: Image | null;

    // @Optional
    createdBy?: Account;
    createdByUid?: string;

    // @Optional
    maintainedBy?: Account;
    maintainedByUid?: string;

    // @Optional
    alertTimeout!: number;

    lockedFields?: Record<string, boolean>;

    watchingCount?: number;
    favoriteCount?: number;

    static WISH = 1;
    static WATCHED = 2;
    static WATCHING = 3;
    static PAUSE = 4;
    static ABANDONED = 5;

    static TYPE_ALL = 'all';
    static TYPE_ANIME = 'anime';
    static TYPE_REAL = 'real';

}
