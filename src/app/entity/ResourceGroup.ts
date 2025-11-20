import { Bangumi } from './bangumi';
import { ResourceScanner } from './ResourceScanner';
import { VideoFile } from './video-file';

export class ResourceGroup {
    id!: string;
    displayName!: string;
    createdTime!: string;
    updatedTime!: string;
    lastCheckTime!: string;
    alertThresholdDay!: number;
    bangumi!: Bangumi;
    scanner: ResourceScanner[] = [];
    videoFiles: VideoFile[] = [];
    color!: string;
}
