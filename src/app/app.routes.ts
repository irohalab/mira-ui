import { homeRoutes } from './home/home.routes';
import { ErrorComponent } from './error/error.component';
import { Routes } from '@angular/router';
import { staticContentRoutes } from './static-content/static-content.routes';
import { NotFoundComponent } from './not-found/not-found.component';


export const appRoutes: Routes = [
    ...homeRoutes,
    {
        path: 'admin',
        data: {level: 2},
        // canActivate: [Authentication], // TODO: need route guard with new auth method
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
