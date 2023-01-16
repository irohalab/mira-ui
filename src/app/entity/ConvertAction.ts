import { Action } from './action';
import { ActionType } from './action-type';

export class ConvertAction extends Action {
    profile: string;
    profileExtraData: any;
    type = ActionType.Convert;
    forceFontName: string;
    // below properties will not be serialized.
    videoFilePath?: string;
    audioFilePath?: string;
    subtitlePath?: string;
}
