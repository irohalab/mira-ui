import { Routes } from '@angular/router';
import { Admin } from './admin.component';
import { BangumiDetail } from './bangumi-detail/bangumi-detail.component';
import { ListBangumi } from './list-bangumi/list-bangumi.component';
import { TaskManager } from './task-manager/task-manager.component';
import { UserManager } from './user-manager/user-manager.component';
import { AnnounceComponent } from './announce/announce.component';
import { WebHookComponent } from './web-hook/web-hook.component';
import { DownloadManagerComponent } from './download-manager/download-manager.component';
import { VideoProcessManagerComponent } from './video-process-manager/video-process-manager.component';


export const adminRoutes: Routes = [
    {
        path: '',
        component: Admin,
        children: [
            {
                path: 'bangumi/:id',
                component: BangumiDetail
            },
            {
                path: 'bangumi',
                component: ListBangumi
            },
            {
                path: 'download-manager',
                component: DownloadManagerComponent
            },
            {
                path: 'video-manager',
                component: VideoProcessManagerComponent
            },
            {
                path: 'user',
                component: UserManager
            },
            {
                path: 'task',
                component: TaskManager
            },
            {
                path: 'announce',
                component: AnnounceComponent
            },
            {
                path: 'web-hook',
                component: WebHookComponent
            },
            {
                path: '',
                redirectTo: 'bangumi',
                pathMatch: 'full'
            }
        ]
    }
];
