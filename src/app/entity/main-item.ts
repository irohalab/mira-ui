import { Episode } from "./episode";
import { BangumiRaw } from './BangumiRaw';

export class MainItem extends BangumiRaw {
    public itemId: string;
    public episodes: Episode[];
    constructor(rawData: any) {
        super();

        this.itemId = rawData.id;
        this.bgmId = rawData.bgmId;
        this.name = rawData.name;
        this.nameCn = rawData.nameCn;
        this.type = rawData.type;
        this.summary = rawData.summary;
        this.airDate = rawData.publicTime;
        this.airWeekday = rawData.properties.airWeekday;


        if (Array.isArray(rawData.eps) && rawData.eps.length > 0) {
            this.episodes = rawData.eps.filter((item: any) => item.type === Episode.EPISODE_TYPE_NORMAL).map((item: any) => Episode.fromRawData(item, item.sort));
            this.eps = this.episodes.length;
        } else {
            this.episodes = [];
            this.eps = 0;
        }

    }
}
