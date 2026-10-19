import { Routes } from '@angular/router';
import { Admin } from './admin.component';
import { BangumiDetail } from './bangumi-detail';
import { ListBangumi } from './list-bangumi/list-bangumi.component';
import { UserManager } from './user-manager/user-manager.component';
import { AnnounceComponent } from './announce/announce.component';
import { DownloadManagerComponent } from './download-manager/download-manager.component';
import { VideoProcessManagerComponent } from './video-process-manager/video-process-manager.component';
import { VideoProcessJobDetailComponent } from './video-process-job-detail/video-process-job-detail.component';
import { StorageMigrationDashboardComponent } from './storage-migration/storage-migration-dashboard.component';
import { StorageMigrationRunDetailComponent } from './storage-migration/storage-migration-run-detail.component';
import { roleGuard } from '../user-service/auth.guard';
import { User } from '../entity/user';


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
                path: 'announce',
                component: AnnounceComponent
            },
            {
                path: 'storage-migration',
                component: StorageMigrationDashboardComponent,
                canActivate: [roleGuard],
                data: {minRole: User.SUPER_ADMIN_ROLE}
            },
            {
                path: 'storage-migration/runs/:id',
                component: StorageMigrationRunDetailComponent,
                canActivate: [roleGuard],
                data: {minRole: User.SUPER_ADMIN_ROLE}
            },
            {
                path: '',
                redirectTo: 'bangumi',
                pathMatch: 'full'
            }
        ]
    }
];
