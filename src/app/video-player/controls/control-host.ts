import { InjectionToken } from '@angular/core';

export interface VideoControlHost {
    readonly configPopoverPlacement: 'top' | 'bottom';
    onMotion(): void;
    keepShow(keep: boolean): void;
}

export const VIDEO_CONTROL_HOST = new InjectionToken<VideoControlHost>('VIDEO_CONTROL_HOST');
