import { Routes } from '@angular/router';
import { Home } from './home.component';
import { DefaultComponent } from './default/default.component';
import { PlayEpisode } from './play-episode/play-episode.component';
import { BangumiList } from './bangumi-list/bangumi-list.component';
import { BangumiDetail } from './bangumi-detail/bangumi-detail.components';
import { UserCenter } from './user-center/user-center.component';
// import { WebHookComponent } from './web-hook/web-hook.component';
import { PreviewVideoComponent } from './preview-video/preview-video.component';
import { FavoriteListComponent } from './favorite-list/favorite-list.component';
// import { BangumiAccountBindingComponent } from './bangumi-account-binding/bangumi-account-binding.component';
import { MyHistoryComponent } from './my-history/my-history.component';
import { MessageCenterComponent } from './message-center/message-center.component';
import { authGuard, roleGuard } from '../user-service';
import { User } from '../entity';

export const homeRoutes: Routes = [
    {
        path: '',
        component: Home,
        children: [
            {
                path: '',
                component: DefaultComponent
            },
            {
                path: 'play/:episode_id',
                component: PlayEpisode,
                data: {
                    refresh: false,
                    minRole: User.INVITED_ROLE
                },
                canActivate: [roleGuard]
            },
            {
                path: 'bangumi/:bangumi_id',
                component: BangumiDetail,
                data: {
                    refresh: true
                }
            },
            {
                path: 'bangumi',
                component: BangumiList
            },
            {
                path: 'settings/user',
                component: UserCenter,
                canActivate: [authGuard]
            },
            // {
            //     path: 'settings/web-hook',
            //     component: WebHookComponent
            // },
            // {
            //     path: 'settings/bangumi',
            //     component: BangumiAccountBindingComponent
            // },
            {
                path: 'pv',
                component: PreviewVideoComponent,
                data: {
                    minRole: User.INVITED_ROLE
                },
                canActivate: [roleGuard]
            },
            {
                path: 'favorite',
                component: FavoriteListComponent,
                data: {
                    minRole: User.INVITED_ROLE
                },
                canActivate: [roleGuard]
            },
            {
                path: 'history',
                component: MyHistoryComponent,
                data: {
                    minRole: User.INVITED_ROLE
                },
                canActivate: [roleGuard]
            },
            {
                path: 'message',
                component: MessageCenterComponent,
                data: {
                    minRole: User.INVITED_ROLE
                },
                canActivate: [roleGuard]
            }
        ]
    },
];
