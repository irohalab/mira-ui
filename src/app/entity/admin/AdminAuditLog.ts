export const AUDIT_RESOURCES = {
    'bangumi.create': 'bangumi',
    'bangumi.update': 'bangumi',
    'bangumi.sync': 'bangumi',
    'bangumi.mark-for-deletion': 'bangumi',
    'bangumi.restore': 'bangumi',
    'bangumi.sync-episodes': 'bangumi',
    'resource-group.create': 'resource-group',
    'resource-group.update': 'resource-group',
    'resource-group.delete': 'resource-group',
    'episode.status-update': 'episode',
    'episode.fields-update': 'episode',
    'episode.delete': 'episode',
    'episode.direct-download.prepare': 'bangumi',
    'video-file.create': 'video-file',
    'video-file.update': 'video-file',
    'video-file.delete': 'video-file',
    'account.invitation-create': 'invitation',
    'account.update': 'account',
    'announce.create': 'announcement',
    'announce.update': 'announcement',
    'announce.delete': 'announcement',
} as const;

export type AdminAuditAction = keyof typeof AUDIT_RESOURCES;
export type AdminAuditResource = typeof AUDIT_RESOURCES[AdminAuditAction];

export const ADMIN_AUDIT_ACTION_LABELS: Record<AdminAuditAction, string> = {
    'bangumi.create': '创建番组',
    'bangumi.update': '更新番组',
    'bangumi.sync': '同步番组',
    'bangumi.mark-for-deletion': '标记删除番组',
    'bangumi.restore': '恢复番组',
    'bangumi.sync-episodes': '同步剧集',
    'resource-group.create': '创建资源组',
    'resource-group.update': '更新资源组',
    'resource-group.delete': '删除资源组',
    'episode.status-update': '更新剧集状态',
    'episode.fields-update': '更新剧集信息',
    'episode.delete': '删除剧集',
    'episode.direct-download.prepare': '准备直接下载',
    'video-file.create': '创建视频文件',
    'video-file.update': '更新视频文件',
    'video-file.delete': '删除视频文件',
    'account.invitation-create': '生成邀请码',
    'account.update': '更新账号',
    'announce.create': '创建公告',
    'announce.update': '更新公告',
    'announce.delete': '删除公告',
};

export interface AdminAuditActor {
    uid: string | null;
    nickName: string | null;
    role: string | null;
}

export class AdminAuditLog {
    id!: string;
    timestamp!: string;
    accountId!: string;
    actor!: AdminAuditActor | null;
    action!: AdminAuditAction;
    summary!: string;
}

export interface AdminAuditDetails {
    name?: string;
    fields?: string[];
    status?: number;
    upstreamItemId?: string;
    added?: number;
    updated?: number;
    prepared?: number;
    episodeCount?: number;
    resourceGroupId?: string;
    generated?: number;
    steps?: {
        storage: 'removed' | 'failed' | 'skipped' | 'unknown';
        torrentCleanup: 'acknowledged' | 'failed' | 'skipped';
        database: 'deleted' | 'unchanged';
    } | {
        acknowledged: number;
        failed: number;
        database: 'deleted' | 'unchanged';
    };
}

export class AdminAuditLogDetail extends AdminAuditLog {
    resourceType!: AdminAuditResource;
    resourceId!: string | null;
    bangumiIds!: string[];
    details!: AdminAuditDetails | null;
}

export interface AdminAuditLogPage {
    data: AdminAuditLog[];
    total: number;
}
