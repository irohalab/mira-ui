import { Episode } from './episode';
import { Favorite } from './Favorite';
import { Image } from './image';
import { User } from './user';

export class BangumiRaw {
    id!: string;
    itemId!: string;
    bgmId!: number;
    name!: string;
    nameCn!: string;
    type!: number;
    eps!: number;
    summary!: string;
    image!: string;
    airDate!: string;
    airWeekday!: number;
    subType!: string;
    universal!: string;
    status!: number;
    createTime!: number;
    updateTime!: number;
    // @Optional
    eps_no_offset!: number;
    // @Optional
    episodes!: Episode[];
    delete_mark!: number;

    // @Optional
    favorite!: Favorite;

    // @Optional
    delete_eta!: number;

    // @deprecated
    cover_color!: string;

    coverImage!: Image | null;

    // @Optional
    created_by!: User;

    // @Optional
    maintained_by!: User;
    maintained_by_uid!: string;

    // @Optional
    alert_timeout!: number;

    static WISH = 1;
    static WATCHED = 2;
    static WATCHING = 3;
    static PAUSE = 4;
    static ABANDONED = 5;

    static TYPE_ALL = 'all';
    static TYPE_ANIME = 'anime';
    static TYPE_REAL = 'real';

    [key: string]: any;
}
