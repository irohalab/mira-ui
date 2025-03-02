import { Bangumi } from './bangumi';
import { Episode } from './episode';

export class VideoFile {
    id: string;
    bangumi?: Bangumi;
    episode?: Episode;
    fileName?: string;
    filePath?: string;
    torrentId?: string;
    downloadUrl?: string;
    status?: number;

    resolutionW: number;
    resolutionH: number;
    duration?: number;
    label?: string;
    // optional, only available at end-user api
    url: string;

    kfTileSize?: number;
    kfFrameWidth?: number;
    kfFrameHeight?: number;
    kfImagePathList?: string;
    blobStorageUrlV0?: string;

    static STATUS_DOWNLOAD_PENDING = 1;
    static STATUS_DOWNLOADING = 2;
    static STATUS_DOWNLOADED = 3;
}
