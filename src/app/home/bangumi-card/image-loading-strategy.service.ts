import {Injectable} from '@angular/core';

@Injectable()
export class ImageLoadingStrategy {
    imageUrl: {[key: string]: boolean} = {};

    hasLoaded(url: string) {
        return !!this.imageUrl[url];
    }

    addLoadedUrl(url: string) {
        this.imageUrl[url] = true;
    }
}
