import { MQMessage } from './MQMessage';
import { RemoteFile } from './RemoteFile';
import { Action } from './action';
import { JobType } from './JobType';

export class VideoProcessJobMessage implements MQMessage {
    public id: string;
    public bangumiId: string;
    public videoId: string;
    public actions: Action[];
    public videoFile: RemoteFile;
    public otherFiles: RemoteFile[];
    public downloadAppId: string;
    public downloadTaskId: string;
    public jobType: JobType;
    public version: string;
}
