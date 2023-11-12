import { ItemType } from './item-type';
import { Publisher } from './publisher';
import { Team } from './team';
import { MediaFile } from './MediaFile';

export class Item {
    id: any;
    title: string;
    eps_no_list: { eps_no: number, format: string }[];
    type: ItemType;
    team?: Team;
    timestamp: Date;
    uri?: string;
    publisher: Publisher;
    torrent_url?: string;
    magnet_uri?: string;
    ext: string;
    files: MediaFile[];
}
