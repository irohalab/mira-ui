import { AdminEntityReference } from './AdminEntityReference';

export class VideoFileAdminEntity {
    id!: string;
    bangumi!: AdminEntityReference;
    episode!: AdminEntityReference;
    resourceGroup!: AdminEntityReference;
    fileName?: string;
    filePath?: string;
    torrentId?: string;
    downloadUrl?: string;
    status!: number;
    resolutionW?: number;
    resolutionH?: number;
    duration?: number;
    label?: string;
    taskId?: string;
    kfTileSize?: number;
    kfFrameWidth?: number;
    kfFrameHeight?: number;
    kfImagePathList?: any;
    blobStorageUrlV0?: string;

    static STATUS_DOWNLOAD_PENDING = 1;
    static STATUS_DOWNLOADING = 2;
    static STATUS_DOWNLOADED = 3;
}

export interface VideoFileAdminPayload {
    id: string;
    bangumiId: string;
    episodeId: string;
    resourceGroupId: string;
    fileName?: string;
    filePath?: string;
    torrentId?: string;
    downloadUrl?: string;
    status: number;
    resolutionW?: number;
    resolutionH?: number;
    duration?: number;
    label?: string;
    blobStorageUrlV0?: string;
}
