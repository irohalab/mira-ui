import { EpisodeType } from './EpisodeType';
import { ItemProperties } from '../ItemProperties';
import { VideoFileAdminEntity } from './VideoFileAdminEntity';
import { Image } from '../image';
import { AdminEntityReference } from './AdminEntityReference';

export class EpisodeAdminEntity {
    id!: string;
    subItemId!: string | null;
    type!: EpisodeType | null;
    bangumi!: AdminEntityReference;
    bgmEpsId!: number;
    episodeNo!: number;
    sort!: number;
    name?: string | null;
    nameCn?: string | null;
    properties: ItemProperties = {};
    duration?: string | null;
    airdate?: string | null;
    status!: number;
    createTime!: string;
    updateTime!: string | null;
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

export interface EpisodeAdminPayload {
    bangumiId: string;
    subItemId: string | null;
    type: EpisodeType | null;
    bgmEpsId: number;
    episodeNo: number;
    sort: number;
    name: string | null;
    nameCn: string | null;
    properties: ItemProperties;
    duration: string | null;
    airdate: string | null;
    status: number;
}

export type EpisodeUpstreamFields = Partial<Pick<EpisodeAdminPayload,
    'subItemId' | 'bgmEpsId' | 'episodeNo' | 'sort' | 'type' | 'name' | 'nameCn' | 'airdate' | 'properties'>>;

export interface EpisodeUpstreamFieldsResult {
    fields: EpisodeUpstreamFields;
    warnings: {field: keyof EpisodeUpstreamFields; message: string}[];
}
