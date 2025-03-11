import {Bangumi} from './bangumi';
import {WatchProgress} from './watch-progress';
import {VideoFile} from './video-file';
import { Image } from './image';

export class Episode {

    static EPISODE_TYPE_NORMAL: number = 0;
    static EPISODE_TYPE_SPECIAL: number = 1;

    id: string;
    bangumi: Bangumi;
    bangumi_id: string;
    bgmEpsId: number;
    episodeNo: number;
    name: string;
    nameCn: string;
    duration: string;
    airdate: string;
    status: number;
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

    // optional
    watchProgress: WatchProgress;

    // deprecated
    thumbnail_color: string;

    thumbnailImage: Image | null;


    static fromRawData(rawData: any, episode_no?: number) {
        let episode = new Episode();
        episode.bgmEpsId = rawData.id;
        episode.episodeNo = episode_no;
        episode.name = rawData.name;
        episode.nameCn = rawData.name_cn;
        episode.duration = rawData.duration;
        episode.airdate = rawData.airdate;
        return episode;
    }

    static STATUS_NOT_DOWNLOADED = 0;
    static STATUS_DOWNLOADING = 1;
    static STATUS_DOWNLOADED = 2;

    // for display purpose, not persistent
    removedMark: boolean;
}
