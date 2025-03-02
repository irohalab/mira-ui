import { Injectable } from '@angular/core';
import { InfiniteDataBucketsStub } from '@irohalab/deneb-ui';
import { Bangumi } from '../../entity';

@Injectable()
export class BangumiListService {
    scrollPosition = 0;
    sort = 'desc';
    type = Bangumi.TYPE_ALL;
    isMovie = false;
    timelineCache: {[key: string]: number[]} = {};
    bucketsStubCache: {[key: string]: InfiniteDataBucketsStub} = {};
    bangumiIdCache: {[key: string]: string[]} = {};
    bangumiCache: {[id: string]: Bangumi} = {};

    tryGetBangumi(key: string, start: number, end: number): Bangumi[] {
        // in case first bucket start is not 0.
        const startOfFirstBucket = this.bucketsStubCache[key].buckets[0].start;
        const offset = start - startOfFirstBucket;
        const idList = this.bangumiIdCache[key];
        if (idList && this.timelineCache[key].length === idList.length) {
            const bangumiList: Bangumi[] = [];
            for (let i = offset; i < idList.length && i<= end - startOfFirstBucket; i++) {
                const bangumi = this.bangumiCache[idList[i]];
                if (!bangumi) {
                    // if one bangumi is missing. we consider a cache miss.
                    return null;
                }
                bangumiList.push(bangumi);
            }
            return bangumiList;
        }
        return null;
    }

    cacheBangumiIds(key: string, start: number, length: number, bangumiList: Bangumi[]): void {
        // in case first bucket start is not 0.
        const startOfFirstBucket = this.bucketsStubCache[key].buckets[0].start;
        const offset = start - startOfFirstBucket;
        if (!this.bangumiIdCache[key]) {
            this.bangumiIdCache[key] = new Array(length);
        }
        for (let i = 0; i < bangumiList.length; i++) {
            this.bangumiIdCache[key][offset + i] = bangumiList[i].id;
            this.bangumiCache[bangumiList[i].id] = bangumiList[i];
        }
    }
}
