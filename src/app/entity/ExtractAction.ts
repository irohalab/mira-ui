/**
 * Action that extract files, streams or subtitles from message.
 * This action cannot have upstream action
 */
import { Action } from './action';
import { ActionType } from './action-type';
import { ExtractSource } from './ExtractSource';
import { ExtractTarget } from './ExtractTarget';

export class ExtractAction extends Action {
    public type = ActionType.Extract;
    public videoFilePath: string;
    public otherFilePaths: string[];
    public extractFrom: ExtractSource;
    public extractTarget: ExtractTarget;
    // If file is extracted from subtitle files, outputExtname must be provided or the outputPath extension name will
    // be by default .vtt, this may cause an issue.
    public outputExtname: string;
    public extractRegex: string;
    public extractorId = 'Default';
    public extraData: any = {};
}
