import { Image } from '../image';

export interface BangumiCardItem {
    id?: string;
    name?: string;
    nameCn?: string;
    summary?: string;
    coverImage?: Image | null;
    image?: string;
    airDate?: string;
    eps?: number;
    deleteMark?: string;
    deleteEta?: string;
}

export interface BangumiSearchResult extends BangumiCardItem {
    itemId: string;
    bgmId: number;
    type: string;
}