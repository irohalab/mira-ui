import {Bangumi} from './bangumi';
import {WatchProgress} from './watch-progress';
import {VideoFile} from './video-file';
import { Image } from './image';
import { SubItem } from '@irohalab/mira-sdk-angular';
import EpisodeTypeEnum = SubItem.EpisodeTypeEnum;

export class Episode {

    id: string;
    bangumi: Bangumi;
    bangumi_id: string;
    bgmEpsId: number;
    episodeNo: number;
    name: string;
    nameCn: string;
    duration: string;
    airDate: string;
    status: number;
    subItemId: string;
    type: EpisodeTypeEnum;
    torrent_id: string;
    create_time: number;
    update_time: number;
    // @deprecated
    thumbnail: string; // optional
    videoFiles: VideoFile[]; // optional

    // @Optional
    delete_mark: number;
    // @Optional
    delete_eta: number;

    sort: number;

    // optional
    watchProgress: WatchProgress;

    // deprecated
    thumbnail_color: string;

    thumbnailImage: Image | null;

    static STATUS_NOT_DOWNLOADED = 0;
    static STATUS_DOWNLOADING = 1;
    static STATUS_DOWNLOADED = 2;

    // for display purpose, not persistent
    removedMark: boolean;
}
