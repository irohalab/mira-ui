export type StorageMigrationRunMode = 'canary' | 'batch';
export type StorageMigrationRunStatus =
    | 'inventory'
    | 'ready'
    | 'running'
    | 'paused'
    | 'awaiting-review'
    | 'cleanup-ready'
    | 'cleaning'
    | 'completed'
    | 'failed'
    | 'cancelled';
export type StorageMigrationRunStage = 'inventory' | 'copying' | 'verifying' | 'switching' | 'review' | 'cleanup' | 'complete';
export type StorageMigrationUnitStatus =
    | 'queued'
    | 'copying'
    | 'verified'
    | 'switched-retained'
    | 'rollback-requested'
    | 'rolled-back'
    | 'failed'
    | 'locally-cleaned';
export type StorageMigrationReviewDecision = 'approved' | 'rejected';

export interface StorageMigrationRunSummary {
    selectedUnits: number;
    verifiedUnits: number;
    completedUnits: number;
    failedUnits: number;
    reviewedUnits: number;
    retainedUnits: number;
    cleanedUnits: number;
    selectedBytes: string;
    retainedBytes: string;
    preflight?: {
        status: 'ready' | 'failed';
        checkedAt: string;
        error?: string;
    };
    inventory?: {
        examinedRecords: number;
        dispositionCounts: Record<string, number>;
        lookupWarnings: string[];
    };
}

export interface StorageMigrationLifecycle {
    total: number;
    verified: number;
    switched: number;
    rollbackRequested: number;
    rolledBack: number;
    cleaned: number;
    failed: number;
    retained: number;
    reviewRequired: number;
    reviewApproved: number;
    pendingTargetDeletion: number;
    actionableTargetDeletion: number;
}

export interface StorageMigrationRun {
    id: string;
    mode: StorageMigrationRunMode;
    status: StorageMigrationRunStatus;
    stage: StorageMigrationRunStage;
    requestedAction: string | null;
    workerPending: boolean;
    limits: {
        videoFiles: number;
        sourceBytes: string;
        reviewSamples: number;
    };
    summary: StorageMigrationRunSummary;
    lifecycle?: StorageMigrationLifecycle;
    createdByAccountId: string;
    createdAt: string;
    updatedAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    cleanupStartedAt: string | null;
    cleanupFinishedAt: string | null;
    lastError: string | null;
    availableActions: {
        start: boolean;
        pause: boolean;
        resume: boolean;
        cancel: boolean;
        rollback: boolean;
        cleanup: boolean;
    };
}

export interface StorageMigrationAsset {
    id: string;
    type: 'video' | 'keyframe' | 'thumbnail';
    status: string;
    sourceRelativePath: string;
    sourceBytes: string;
    targetUri: string;
    attemptCount: number;
    lastError: string | null;
    uploadedAt: string | null;
    verifiedAt: string | null;
    switchedAt: string | null;
    rolledBackAt: string | null;
    targetDeletedAt: string | null;
    cleanedAt: string | null;
    availableActions: {retryTargetDeletion: boolean};
}

export interface StorageMigrationUnit {
    id: string;
    runId: string;
    videoFileId: string | null;
    bangumiId: string;
    episodeId: string;
    episodeNo: number;
    status: StorageMigrationUnitStatus;
    reviewRequired: boolean;
    reviewDecision: StorageMigrationReviewDecision | null;
    reviewedByAccountId: string | null;
    reviewedAt: string | null;
    reviewNote: string | null;
    warnings: string[];
    lastError: string | null;
    sourceBytes: string;
    assetProgress: {total: number; verified: number; failed: number; cleaned: number};
    createdAt: string;
    updatedAt: string;
    assets: StorageMigrationAsset[];
    availableActions: {
        approve: boolean;
        reject: boolean;
        retry: boolean;
        rollback: boolean;
        openPlayer: boolean;
    };
}

export interface StorageMigrationEligibility {
    total: number;
    eligible: number;
    statusNotDownloaded: number;
    missingFilePath: number;
    alreadyS3: number;
    externalBlob: number;
    softDeleted: number;
    activeMigration: number;
    requiresWorkerInspection: number;
}

export interface StorageMigrationOverview {
    enabled: boolean;
    buckets: {video: string; image: string};
    limits: {
        retainedBytes: string;
        retainedLimitBytes: string;
        canaryUnits: number;
        batchUnits: number;
        batchBytes: string;
        reviewSamples: number;
        workerPollSeconds: number;
    };
    canaryGate: {required: number; approved: boolean; unlocked: boolean};
    preflight: {status: 'unknown' | 'ready' | 'failed'; checkedAt: string | null; error: string | null};
    eligibility: StorageMigrationEligibility;
    activeRun: StorageMigrationRun | null;
}

export interface CreateStorageMigrationRun {
    mode: StorageMigrationRunMode;
    videoFileLimit?: number;
    sourceLimitGiB?: number;
    reviewSampleCount?: number;
    allowOversizedSingle?: boolean;
}

export interface StorageMigrationUnitFilter {
    status?: StorageMigrationUnitStatus;
    review?: 'all' | 'pending' | StorageMigrationReviewDecision;
    hasIssues?: boolean;
}

export interface PageResult<T> {
    data: T[];
    total: number;
}

export function formatStorageBytes(value: string): string {
    let bytes: bigint;
    try {
        bytes = BigInt(value || '0');
    } catch {
        return '—';
    }
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    let unitIndex = 0;
    let unit = 1n;
    while (unitIndex < units.length - 1 && bytes >= unit * 1024n) {
        unit *= 1024n;
        unitIndex++;
    }
    if (unitIndex === 0) return `${bytes} B`;
    const scaled = bytes * 100n / unit;
    const whole = scaled / 100n;
    const fraction = String(scaled % 100n).padStart(2, '0').replace(/0+$/, '');
    return `${whole}${fraction ? `.${fraction}` : ''} ${units[unitIndex]}`;
}

export function storageBudgetPercent(used: string, limit: string): number {
    try {
        const denominator = BigInt(limit);
        if (denominator <= 0n) return 0;
        return Number(BigInt(used) * 10000n / denominator) / 100;
    } catch {
        return 0;
    }
}
