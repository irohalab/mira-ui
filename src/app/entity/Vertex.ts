import { ActionType } from './action-type';
import { Action } from './action';
import { VertexStatus } from './VertexStatus';

export class Vertex {
    public id: string;
    public jobId: string;
    public status: VertexStatus;
    public upstreamVertexIds: string[] = [];
    public downstreamVertexIds: string[] = [];
    public outputPath: string;
    public action: Action;
    public actionType: ActionType;
    public startTime: Date;
    public finishedTime: Date;
}
