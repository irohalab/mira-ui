import { homeRoutes } from './home/home.routes';
import { ErrorComponent } from './error/error.component';
import { Routes } from '@angular/router';
import { staticContentRoutes } from './static-content/static-content.routes';
import { NotFoundComponent } from './not-found/not-found.component';
import { roleGuard } from './user-service';
import { User } from './entity';


export const appRoutes: Routes = [
    ...homeRoutes,
    {
        path: 'admin',
        data: {minRole: User.ADMIN_ROLE},
        canActivate: [roleGuard],
        loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
    },
    {
        path: 'error',
        component: ErrorComponent
    },
    ...staticContentRoutes,
    {
        path: '**',
        component: NotFoundComponent
    }
];
