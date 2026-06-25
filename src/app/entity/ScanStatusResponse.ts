import { ScanStatus } from './ScanStatus';

export interface ScanStatusResponse {
    resourceScan?: ScanStatus;
    videoFileScan?: ScanStatus;
    serverTime: string;
}
