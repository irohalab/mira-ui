import { ActionType } from './action-type';

export class Action {
    id:string;
    type: ActionType;
    // for serialization
    upstreamActionIds: string[] = [];
    downstreamIds: string[] = [];
    outputFilename: string;
}
