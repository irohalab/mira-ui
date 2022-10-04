import { MQMessage } from './MQMessage';
import { RemoteFile } from './RemoteFile';
import { Action } from './action';

export class VideoProcessJobMessage implements MQMessage {
    public id: string;
    public bangumiId: string;
    public videoId: string;
    public actions: Action[];
    public videoFile: RemoteFile;
    public otherFiles: RemoteFile[];
    public downloadAppId: string;
    public downloadTaskId: string;
    public version: string;
}
