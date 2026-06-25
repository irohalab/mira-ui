export interface ScanStatus {
    /* stable identifier of the scanner, e.g. 'resourceScan' */
    scannerName: string;
    /* configured interval between two scans in milliseconds */
    intervalMs: number;
    /* true while a scan cycle is currently running */
    isScanning: boolean;
    /* ISO time when the most recent scan cycle started */
    lastScanStartTime: string | null;
    /* ISO time when the most recent scan cycle finished */
    lastScanEndTime: string | null;
    /* duration of the most recent finished scan cycle in milliseconds */
    lastScanDurationMs: number | null;
    /* ISO time when the next scan cycle is scheduled to start */
    nextScanTime: string | null;
}
