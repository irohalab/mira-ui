import { ActionType } from './action-type';
import { nanoid } from 'nanoid';

export class Action {
    id = nanoid(4);
    type: ActionType;
    // for serialization
    upstreamActionIds: string[] = [];
    downstreamIds: string[] = [];
    outputFilename: string;
}
