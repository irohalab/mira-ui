import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VideoProcessRule } from '../../../entity/VideoProcessRule';
import { catchError, map } from 'rxjs/operators';
import { BaseService } from '../../../../helpers/base.service';
import { VideoFile } from '../../../entity/video-file';

type ReqData = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    body?: any;
    params?: {[key: string]: string};
}

@Injectable()
export class VideoProcessRuleService extends BaseService {
    private _convertUrl = '/api/admin/video-process/proxy';
    constructor(private _httpClient: HttpClient) {
        super();
    }

    private sendRequest<T>(reqData: ReqData): Observable<T> {
        return this._httpClient.post<T>(`${this._convertUrl}`, reqData)
            .pipe(
                catchError(this.handleError)
            );
    }

    addRule(rule: VideoProcessRule): Observable<VideoProcessRule> {
        const reqData: ReqData = {
            method: 'POST',
            url: '/rule',
            body: rule
        };
        return this.sendRequest<{data: VideoProcessRule}>(reqData)
            .pipe(
                map(res => res.data)
            );
    }

    listRulesByBangumi(bangumiId: string): Observable<VideoProcessRule[]> {
        const reqData: ReqData = {
            method: 'GET',
            url: `/rule/bangumi/${bangumiId}`
        };
        return this.sendRequest<{data: VideoProcessRule[]}>(reqData)
            .pipe(
                map(res => res.data)
            );
    }

    editRule(rule: VideoProcessRule): Observable<VideoProcessRule> {
        const reqData: ReqData = {
            method: 'PUT',
            url: `/rule/${rule.id}`,
            body: rule
        };
        return this.sendRequest<{data: VideoProcessRule}>(reqData)
            .pipe(
                map(res => res.data)
            );
    }

    deleteRule(ruleId: string): Observable<any> {
        const reqData: ReqData = {
            method: 'DELETE',
            url: `/rule/${ruleId}`
        };
        return this.sendRequest<any>(reqData);
    }

    checkCondition(condition: string): Observable<any> {
        const reqData: ReqData = {
            method: 'POST',
            url: '/rule/condition',
            body: {condition: condition}
        };
        return this.sendRequest<any>(reqData);
    }

    listFonts(): Observable<string[]> {
        const reqData: ReqData = {
            method: 'GET',
            url: '/rule/font'
        };
        return this.sendRequest<{data: string[]}>(reqData).pipe(map(res => res.data));
    }

    createJobFromVideoFile(videoFile: VideoFile): Observable<any> {
        console.log(videoFile.url);
        const urlObj = new URL(videoFile.url, location.protocol + '//' + location.host);
        videoFile.url = urlObj.toString();
        const reqData: ReqData = {
            method: 'POST',
            url: '/rule/video-file',
            body: {
                bangumiId: videoFile.bangumi.id,
                videoFileId: videoFile.id,
                fileUrl: videoFile.url,
                filename: videoFile.filePath.substring(videoFile.filePath.lastIndexOf('/') + 1)
            }
        };
        return this.sendRequest<any>(reqData);
    }
}
