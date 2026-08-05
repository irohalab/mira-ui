import { EpisodeType } from './EpisodeType';
import { ItemProperties } from '../ItemProperties';
import { VideoFileAdminEntity } from './VideoFileAdminEntity';
import { Image } from '../image';
import { AdminEntityReference } from './AdminEntityReference';

export class EpisodeAdminEntity {
    id!: string;
    subItemId!: string;
    type!: EpisodeType;
    bangumi!: AdminEntityReference;
    bgmEpsId!: number;
    episodeNo!: number;
    sort!: number;
    name?: string;
    nameCn?: string;
    properties: ItemProperties = {};
    duration?: string;
    airdate?: string;
    status!: number;
    createTime!: string;
    updateTime!: string;
    deleteMark?: string;
    thumbnailColor?: string;
    thumbnailImage?: Image | null;
    videoFiles?: VideoFileAdminEntity[];

    // Client-only state used when previewing episode synchronization.
    removedMark?: boolean;

    static STATUS_NOT_DOWNLOADED = 0;
    static STATUS_DOWNLOADING = 1;
    static STATUS_DOWNLOADED = 2;
}
