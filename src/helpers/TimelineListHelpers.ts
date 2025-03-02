import { InfiniteDataBucket } from '@irohalab/deneb-ui';

export function groupByQuarters(timeline: number[]): InfiniteDataBucket[] {
    let startIdx = 0;
    const buckets: InfiniteDataBucket[] = [];
    while(startIdx < timeline.length) {
        let date = new Date(timeline[startIdx]);
        let year = date.getUTCFullYear();
        let startMonth = Math.floor(date.getUTCMonth() / 3) * 3; // 0, 3, 6, 9
        // calculate the quarter start and end months
        const quarterStart = new Date(Date.UTC(year, startMonth, 1));
        const quarterEnd = new Date(Date.UTC(year, startMonth + 3, 0)); // last day of the quarter
        console.log(quarterStart.toISOString(), quarterEnd.toISOString());
        let endIdx = startIdx;
        let currentDate= new Date(timeline[endIdx]);
        while (endIdx < timeline.length &&
        currentDate <= quarterEnd && currentDate >= quarterStart) {
            endIdx++;
            currentDate = new Date(timeline[endIdx]);
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
