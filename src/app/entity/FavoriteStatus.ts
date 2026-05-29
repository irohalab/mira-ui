import {FavoriteStatus as ExternalStatus} from '@irohalab/mira-sdk-angular';

export enum FavoriteStatus {
    WISH = 'WISH',
    WATCHED = 'WATCHED',
    WATCHING = 'WATCHING',
    PAUSE = 'PAUSE',
    ABANDONED = 'ABANDONED'
}

export function externalFavoriteStatusToNumber(externalFavoriteStatus: ExternalStatus): number {
    const externalMapping = {
        [ExternalStatus.Planned]: 1,
        [ExternalStatus.Watched]: 2,
        [ExternalStatus.Watching]: 3,
        [ExternalStatus.OnHold]: 4,
        [ExternalStatus.Dropped]: 5,
    };
    return externalMapping[externalFavoriteStatus] || 0;
}

export function favoriteStatusToNumber(favoriteStatus: FavoriteStatus): number {
    const statusMapping = {
        [FavoriteStatus.WISH]: 1,
        [FavoriteStatus.WATCHED]: 2,
        [FavoriteStatus.WATCHING]: 3,
        [FavoriteStatus.PAUSE]: 4,
        [FavoriteStatus.ABANDONED]: 5,
    }
    return statusMapping[favoriteStatus] || 0;
}

export const NUMBER_TO_EXTERNAL_FAVORITE_STATUS = [
    '',
    ExternalStatus.Planned,
    ExternalStatus.Watched,
    ExternalStatus.Watching,
    ExternalStatus.OnHold,
    ExternalStatus.Dropped
];

export const NUMBER_TO_FAVORITE_STATUS = [
    '',
    FavoriteStatus.WISH,
    FavoriteStatus.WATCHED,
    FavoriteStatus.WATCHING,
    FavoriteStatus.PAUSE,
    FavoriteStatus.ABANDONED,
]

export function isStatusEqual(externalStatus: ExternalStatus, status: FavoriteStatus) {
    return externalFavoriteStatusToNumber(externalStatus) === favoriteStatusToNumber(status);
}
