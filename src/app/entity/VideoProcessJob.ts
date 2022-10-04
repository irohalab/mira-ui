import { VideoProcessJobStatus } from './VideoProcessJobStatus';
import { VideoProcessJobMessage } from './VideoProcessJobMessage';
import { VideoProcessJobState } from './VideoProcessJobState';

export class VideoProcessJob {

    public id: string;

    public jobMessageId: string;

    public jobMessage: VideoProcessJobMessage;

    /**
     * index of current action to be or being executed from actions array.
     */
    public progress: number;

    public stateHistory: VideoProcessJobState[];

    public status: VideoProcessJobStatus

    public jobExecutorId: string;

    public createTime: Date;

    public startTime: Date;

    public finishedTime: Date;

    public cleaned: boolean;
}
