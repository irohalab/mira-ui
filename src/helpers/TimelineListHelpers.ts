import { InfiniteDataBucket } from '@irohalab/deneb-ui';

function quarterKey(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const quarter = Math.floor(date.getUTCMonth() / 3); // 0, 1, 2, 3
    return `${year}-${quarter}`;
}

export function groupByQuarters(timeline: number[]): InfiniteDataBucket[] {
    const buckets: InfiniteDataBucket[] = [];
    let startIdx = 0;
    while (startIdx < timeline.length) {
        const currentKey = quarterKey(timeline[startIdx]);
        let endIdx = startIdx;
        while (endIdx < timeline.length && quarterKey(timeline[endIdx]) === currentKey) {
            endIdx++;
        }
        buckets.push({
            start: startIdx,
            end: endIdx - 1,
            filled: false,
            fetching: false
        });
        startIdx = endIdx;
    }
    return buckets;
}
