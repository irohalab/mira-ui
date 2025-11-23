import { Injectable } from '@angular/core';
import getAgent, { getAccurateAgent } from '@egjs/agent';
import { BrowserInfo } from '../app/entity/FeedbackPayload';

export interface DeviceInfo {
    deviceType: string;
    os: string;
    browser: BrowserInfo;
    userAgent: string;
}

@Injectable({
    providedIn: 'root'
})
export class DeviceDetectorService {
    private agent: any = null;
    private _deviceInfo: DeviceInfo | null = null;
    private agentPromise: Promise<any> | null = null;

    constructor() {
        this.initializeAgent();
    }

    private async initializeAgent(): Promise<void> {
        if (!this.agentPromise) {
            this.agentPromise = getAccurateAgent()
                .then(accurateAgent => {
                    this.agent = accurateAgent;
                    return accurateAgent;
                })
                .catch(() => {
                    // Fallback to regular getAgent if client hints not available
                    this.agent = getAgent();
                    return this.agent;
                });
        }
        await this.agentPromise;
    }

    async getDeviceInfoAsync(): Promise<DeviceInfo> {
        await this.initializeAgent();
        if (!this._deviceInfo) {
            this._deviceInfo = this.detectDevice();
        }
        return this._deviceInfo;
    }

    get deviceInfo(): DeviceInfo {
        // Synchronous getter - may not have accurate agent data yet
        if (!this.agent) {
            this.agent = getAgent(); // Fallback to sync agent
        }
        if (!this._deviceInfo) {
            this._deviceInfo = this.detectDevice();
        }
        return this._deviceInfo;
    }

    private detectDevice(): DeviceInfo {
        const agent = this.agent || getAgent();
        const ua = navigator.userAgent;
        
        // Detect device type with model information
        const deviceType = this.getDetailedDeviceType(ua);
        
        // Format OS string with better detection
        const os = this.getDetailedOS(agent, ua);
        
        // Extract browser info
        const browser = this.getBrowserInfo(agent);
        
        // Get user agent
        const userAgent = ua;
        
        return {
            deviceType,
            os,
            browser,
            userAgent,
        };
    }

    private getBrowserInfo(agent: any): BrowserInfo {
        const browser = agent.browser || {};
        return {
            name: browser.name || 'Unknown',
            version: browser.version || 'Unknown',
            majorVersion: browser.majorVersion || 'Unknown',
            webview: browser.webview || false,
            chromium: browser.chromium || false,
            webkit: browser.webkit || false,
        };
    }

    private getDetailedDeviceType(ua: string): string {
        const uaLower = ua.toLowerCase();
        
        // iOS devices
        if (uaLower.includes('iphone')) {
            const model = this.extractiOSModel(ua);
            return model ? `iPhone (${model})` : 'iPhone';
        }
        if (uaLower.includes('ipad')) {
            const model = this.extractiOSModel(ua);
            return model ? `iPad (${model})` : 'iPad';
        }
        if (uaLower.includes('ipod')) {
            return 'iPod Touch';
        }
        
        // Android devices
        if (uaLower.includes('android')) {
            const model = this.extractAndroidModel(ua);
            if (uaLower.includes('mobile')) {
                return model ? `Android Phone (${model})` : 'Android Phone';
            } else {
                return model ? `Android Tablet (${model})` : 'Android Tablet';
            }
        }
        
        // Windows Phone
        if (uaLower.includes('windows phone')) {
            return 'Windows Phone';
        }
        
        // Desktop browsers
        if (uaLower.includes('windows')) {
            return 'Windows Desktop';
        }
        if (uaLower.includes('macintosh') || uaLower.includes('mac os x')) {
            return 'Mac Desktop';
        }
        if (uaLower.includes('linux')) {
            // Try to detect specific Linux distributions
            if (uaLower.includes('ubuntu')) {
                return 'Linux Desktop (Ubuntu)';
            }
            if (uaLower.includes('fedora')) {
                return 'Linux Desktop (Fedora)';
            }
            if (uaLower.includes('debian')) {
                return 'Linux Desktop (Debian)';
            }
            return 'Linux Desktop';
        }
        if (uaLower.includes('cros')) {
            return 'Chrome OS';
        }
        
        return 'Desktop';
    }

    private extractiOSModel(ua: string): string | null {
        // Try to extract iOS version which can indicate device generation
        const match = ua.match(/OS (\d+_\d+(_\d+)?)/);
        if (match) {
            return `iOS ${match[1].replace(/_/g, '.')}`;
        }
        return null;
    }

    private extractAndroidModel(ua: string): string | null {
        // Try to extract Android device model
        // Pattern: Android version; manufacturer model
        const patterns = [
            /Android[^;]*;\s*([^)]+)\)/i,  // Generic pattern
            /\(Linux; Android [^;]+;\s*([^)]+)\)/i,  // Standard Android pattern
            /Android[^;]+;\s*([^;]+);/i  // Alternative pattern
        ];
        
        for (const pattern of patterns) {
            const match = ua.match(pattern);
            if (match && match[1]) {
                let model = match[1].trim();
                // Clean up common prefixes
                model = model.replace(/^Build\//, '');
                // Limit length
                if (model.length > 50) {
                    model = model.substring(0, 50) + '...';
                }
                return model;
            }
        }
        
        return null;
    }

    private getDetailedOS(agent: any, ua: string): string {
        const uaLower = ua.toLowerCase();
        
        // Use agent's OS detection first
        let osName = agent.os?.name || '';
        let osVersion = agent.os?.version || '';
        
        // Special handling for "Unknown -1" or empty values
        if (!osName || osName === 'Unknown' || osVersion === '-1') {
            osName = '';
            osVersion = '';
        }
        
        // Enhanced detection from user agent
        if (!osName) {
            if (uaLower.includes('windows nt 10.0')) {
                osName = 'Windows';
                osVersion = '10';
            } else if (uaLower.includes('windows nt 6.3')) {
                osName = 'Windows';
                osVersion = '8.1';
            } else if (uaLower.includes('windows nt 6.2')) {
                osName = 'Windows';
                osVersion = '8';
            } else if (uaLower.includes('windows nt 6.1')) {
                osName = 'Windows';
                osVersion = '7';
            } else if (uaLower.includes('mac os x')) {
                osName = 'Mac OS X';
                const match = ua.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/);
                if (match) {
                    osVersion = match[1].replace(/_/g, '.');
                }
            } else if (uaLower.includes('ubuntu')) {
                osName = 'Ubuntu';
                // Try to extract version from UA
                const match = ua.match(/Ubuntu[;\/]?\s*(\d+\.\d+)/i);
                if (match) {
                    osVersion = match[1];
                }
            } else if (uaLower.includes('fedora')) {
                osName = 'Fedora';
            } else if (uaLower.includes('debian')) {
                osName = 'Debian';
            } else if (uaLower.includes('linux')) {
                osName = 'Linux';
                // Check for X11 architecture info
                const archMatch = ua.match(/Linux\s+([^;)]+)/i);
                if (archMatch && archMatch[1]) {
                    const arch = archMatch[1].trim();
                    if (arch !== 'Android' && !arch.includes('Linux')) {
                        osVersion = arch; // e.g., "x86_64"
                    }
                }
            } else if (uaLower.includes('android')) {
                osName = 'Android';
                const match = ua.match(/Android\s+(\d+(\.\d+)?)/);
                if (match) {
                    osVersion = match[1];
                }
            } else if (uaLower.includes('iphone') || uaLower.includes('ipad')) {
                osName = 'iOS';
                const match = ua.match(/OS (\d+_\d+(_\d+)?)/);
                if (match) {
                    osVersion = match[1].replace(/_/g, '.');
                }
            } else if (uaLower.includes('cros')) {
                osName = 'Chrome OS';
            }
        }
        
        // Build final OS string
        if (!osName) {
            return 'Unknown';
        }
        
        return osVersion ? `${osName} ${osVersion}` : osName;
    }

    private isTabletDevice(): boolean {
        const ua = navigator.userAgent.toLowerCase();
        return (
            ua.includes('ipad') ||
            (ua.includes('android') && !ua.includes('mobile')) ||
            ua.includes('tablet') ||
            (ua.includes('kindle') && !ua.includes('mobile'))
        );
    }

    // Helper methods for quick checks
    isMobile(): boolean {
        if (!this.agent) {
            this.agent = getAgent();
        }
        return this.agent.isMobile && !this.isTabletDevice();
    }

    isTablet(): boolean {
        if (!this.agent) {
            this.agent = getAgent();
        }
        return this.agent.isMobile && this.isTabletDevice();
    }

    isDesktop(): boolean {
        if (!this.agent) {
            this.agent = getAgent();
        }
        return !this.agent.isMobile;
    }

    isChrome(): boolean {
        if (!this.agent) {
            this.agent = getAgent();
        }
        const browserName = this.agent.browser?.name?.toLowerCase() || '';
        return browserName === 'chrome' || browserName === 'chromium';
    }

    isFirefox(): boolean {
        if (!this.agent) {
            this.agent = getAgent();
        }
        return this.agent.browser?.name?.toLowerCase() === 'firefox';
    }

    isIE(): boolean {
        if (!this.agent) {
            this.agent = getAgent();
        }
        const browserName = this.agent.browser?.name?.toLowerCase() || '';
        return browserName === 'ie' || browserName === 'internet explorer';
    }

    isEdge(): boolean {
        if (!this.agent) {
            this.agent = getAgent();
        }
        const browserName = this.agent.browser?.name?.toLowerCase() || '';
        return browserName === 'edge' || browserName === 'edg';
    }

    getDeviceType(): string {
        return this.deviceInfo.deviceType;
    }

    getOS(): string {
        return this.deviceInfo.os;
    }

    getBrowser(): BrowserInfo {
        return this.deviceInfo.browser;
    }

    getUserAgent(): string {
        return this.deviceInfo.userAgent;
    }

    // Get device info in FeedbackPayload format (async version for accurate data)
    async getDeviceInfoForFeedbackAsync(): Promise<Pick<DeviceInfo, 'deviceType' | 'os' | 'browser' | 'userAgent'>> {
        const info = await this.getDeviceInfoAsync();
        return {
            deviceType: info.deviceType,
            os: info.os,
            browser: info.browser,
            userAgent: info.userAgent,
        };
    }

    // Get device info in FeedbackPayload format (sync version, may be less accurate)
    getDeviceInfoForFeedback(): Pick<DeviceInfo, 'deviceType' | 'os' | 'browser' | 'userAgent'> {
        return {
            deviceType: this.deviceInfo.deviceType,
            os: this.deviceInfo.os,
            browser: this.deviceInfo.browser,
            userAgent: this.deviceInfo.userAgent,
        };
    }
}

// Export backward compatible constants for non-Angular code
const agent = getAgent();
export const isChrome = agent.browser.name === 'chrome' || agent.browser.name === 'chromium';
export const isFirefox = typeof InstallTrigger !== 'undefined';
export const isIE = /*@cc_on!@*/false || !!document.documentMode;
export const isEdge = !isIE && !!window && !!window.StyleMedia;
