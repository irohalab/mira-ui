export interface BrowserInfo {
    name: string;
    version: string;
    majorVersion: string;
    webview: boolean;
    chromium: boolean;
    webkit: boolean;
}

export interface FeedbackPayload {
    deviceType: string;
    os: string;
    browser: BrowserInfo;
    userAgent: string;
    issue: string;
    videoId: string;
}
