import { Condition } from './Condition';
import { ActionMap } from './action-map';

export class VideoProcessRule {
    public id?: string;
    public name: string;
    public bangumiId: string;
    public videoFileId: string;
    public condition: Condition;

    public actions: ActionMap;

    public priority: number;
}
