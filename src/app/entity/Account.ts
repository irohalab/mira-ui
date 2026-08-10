export type FavoriteSyncStatus = 'queued' | 'running' | 'completed' | 'failed';

export type FavoriteSyncStage = 'queued' | 'preparing' | 'syncing' | 'applying' | 'completed' | 'failed';

export interface FavoriteSyncProgress {
    syncId: string;
    status: FavoriteSyncStatus;
    stage: FavoriteSyncStage;
    completedBatches: number;
    totalBatches: number;
    percentage: number;
    startedAt: string;
    updatedAt: string;
    finishedAt?: string;
}

export interface FavoriteSyncLog {
    syncId: string;
    startedAt: string;
    finishedAt?: string;
    request: unknown | null;
    response: unknown | null;
    error?: string;
}

export interface FavoriteSyncLogResponse {
    progress: FavoriteSyncProgress | null;
    log: FavoriteSyncLog | null;
}

export class Account {
    id!: string;
    subjectId!: string;
    uid!: string;
    role!: string;
    nickName!: string;
    email!: string;
    activateTime!: string;
    updateTime!: string;
    favoriteSyncProgress?: FavoriteSyncProgress;
}
