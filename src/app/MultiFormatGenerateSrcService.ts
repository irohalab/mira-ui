import { IResponsiveGenerateSrc, ResponsiveGenerateSrcService } from '@irohalab/deneb-ui';
import { Injectable } from '@angular/core';

const IMAGE_KIT_PATTERN = /^https:\/\/ik\.imagekit\.io\/([^\/]+)\/([^\/.]+)\.(jpg|png|gif|tiff|webp)/;

@Injectable()
export class MultiFormatGenerateSrcService implements IResponsiveGenerateSrc {
    private responsiveGenerateSrc: IResponsiveGenerateSrc;

    constructor() {
        this.responsiveGenerateSrc = new ResponsiveGenerateSrcService();
    }


    private makeImageKitSrc(src: string, width: number, height: number, ratio: number): string {
        if (width !== 0) {
            width = Math.round(width / 20) * 20;
            if (height !== 0) {
                height = width * ratio;
            }
        } else if (height !== 0) {
            height = Math.round(height / 20) * 20;
            if (width !== 0) {
                width = height / ratio;
            }
        }
        if (width === 0) {
            return `${src}?tr=h-${height}`;
        } else if (height === 0) {
            return `${src}?tr=w-${width}`;
        } else {
            return `${src}?tr=w-${width},h-${height}`;
        }
    }

    makeRespSrc(src: string, width: number, height: number, originalWidth: number, originalHeight: number, ratio: number): string {
        if (IMAGE_KIT_PATTERN.test(src)) {
            return this.makeImageKitSrc(src, width, height, ratio);
        } else {
            return this.responsiveGenerateSrc.makeRespSrc(src, width, height, originalWidth, originalHeight, ratio);
        }
    }

}
