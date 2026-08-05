import { ResourceScanner } from './ResourceScanner';
import { VideoFileAdminEntity } from './admin/VideoFileAdminEntity';
import { AdminEntityReference } from './admin/AdminEntityReference';

export class ResourceGroup {
    id!: string;
    displayName!: string;
    createdTime!: string;
    updatedTime!: string;
    lastCheckTime!: string;
    alertThresholdDay!: number;
    bangumi!: AdminEntityReference;
    scanner: ResourceScanner[] = [];
    videoFiles: VideoFileAdminEntity[] = [];
    color!: string;
}
