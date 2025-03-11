import { Routes } from '@angular/router';
import { Admin } from './admin.component';
import { BangumiDetail } from './bangumi-detail';
import { ListBangumi } from './list-bangumi/list-bangumi.component';
import { TaskManager } from './task-manager/task-manager.component';
import { UserManager } from './user-manager/user-manager.component';
import { AnnounceComponent } from './announce/announce.component';
import { DownloadManagerComponent } from './download-manager/download-manager.component';
import { VideoProcessManagerComponent } from './video-process-manager/video-process-manager.component';
import { VideoProcessJobDetailComponent } from './video-process-job-detail/video-process-job-detail.component';


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
                path: 'video-manager/:id',
                component: VideoProcessJobDetailComponent
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
                path: '',
                redirectTo: 'bangumi',
                pathMatch: 'full'
            }
        ]
    }
];
