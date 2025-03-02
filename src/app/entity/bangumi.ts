import { Episode } from "./episode";
import { Image } from './image';
import { Favorite } from './Favorite';
import { Account } from './Account';

export class Bangumi {
    id!: string;
    bgmId!: number;
    name!: string;
    nameCn!: string;
    type!: string;
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
    // @Optional
    favorite_status!: number;
    // @Optional
    unwatched_count!: number;
    // @Optional
    favorite_update_time!: number;
    // @Optional
    favorite_check_time!: number;
    // @Optional
    eps_update_time!: number;
    // @Optional
    delete_mark!: number;

    // @Optional
    favorite!: Favorite;

    // @Optional
    delete_eta!: number;

    // @deprecated
    cover_color!: string;

    coverImage!: Image | null;

    // @Optional
    created_by!: Account;

    // @Optional
    maintained_by!: Account;
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

    static containKeyword(bangumi: Bangumi, name: string): boolean {
        let nameLowerCase = name.toLowerCase();
        let keywords = nameLowerCase.split(' ');
        if (keywords.length === 1 && !keywords[0]) {
            return (bangumi.name && bangumi.name.toLowerCase().indexOf(nameLowerCase) !== -1)
                || (bangumi.nameCn && bangumi.nameCn.toLowerCase().indexOf(nameLowerCase) !== -1)
                || (bangumi.summary && bangumi.summary.toLowerCase().indexOf(nameLowerCase) !== -1);
        }
        return (bangumi.name && keywords.every(k => bangumi.name.toLowerCase().indexOf(k) !== -1))
            || (bangumi.nameCn && keywords.every(k => bangumi.nameCn.toLowerCase().indexOf(k) !== -1))
            || (bangumi.summary && keywords.every(k => bangumi.summary.toLowerCase().indexOf(k) !== -1));
    }
    // for index convenient
    [key: string]: any;
}
