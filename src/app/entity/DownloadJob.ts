/*
 * Copyright 2020 IROHA LAB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DownloaderType } from './DownloaderType';
import { DownloadJobStatus } from './DownloadJobStatus';
import { DownloadTaskMessage } from './DownloadTaskMessage';
import { FileMapping } from './FileMapping';
import { Bangumi } from './bangumi';

export class DownloadJob {
    public id: string;
    public torrentId: string;
    public downloader: DownloaderType;
    public status: DownloadJobStatus
    public torrentUrl: string;
    public bangumiId: string;
    public downloadTaskMessageId: string;
    public downloadTaskMessage: DownloadTaskMessage;
    public fileMapping: FileMapping[];
    public appliedProcessRuleId: string;
    public videoId: string;
    public torrentName: string;
    public progress: number;
    public downloadSpeed: number;
    public eta: number;
    public availability: number;
    public priority: number;
    public size: number;
    public downloaded: number;
    public amountLeft: number;
    public activeTime: number;
    public seeds: number;
    public leechers: number;
    public connectedSeeds: number;
    public connectedLeechers: number;
    public createTime: string;
    public endTime: string;
    public errorInfo: { message?: string, stack?: string };

    // not from database
    public bangumi: Bangumi;
}
