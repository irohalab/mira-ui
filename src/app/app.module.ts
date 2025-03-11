import { NgModule } from '@angular/core';
import { App } from './app.component';
import { AnalyticsService } from './analytics.service';
import { RouteReuseStrategy, RouterModule } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { appRoutes } from './app.routes';
import { ReactiveFormsModule } from '@angular/forms';
import { ErrorComponent } from './error/error.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TaskService } from './admin/task-manager/task.service';
import { HomeModule } from './home';
import { UserServiceModule } from './user-service';
import { StaticContentModule } from './static-content/static-content.module';
import { RefreshSameRouteStrategy } from './RefreshSameRouteStrategy';
import { NavigationService } from './navigation.service';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { OAuthStorage, provideOAuthClient } from 'angular-oauth2-oidc';
import { NotFoundComponent } from './not-found/not-found.component';
import { storageAPI } from '../helpers/localstorage';
import { environment } from '../environments/environment';

@NgModule({
    declarations: [
        App,
        ErrorComponent,
        NotFoundComponent,
    ],
    providers: [
        AnalyticsService,
        NavigationService,
        TaskService,
        {
            provide: RouteReuseStrategy,
            useClass: RefreshSameRouteStrategy
        },
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        provideOAuthClient({
            resourceServer: {
                allowedUrls: [environment.resourceProvider],
                sendAccessToken: true
            }
        }),
        {provide: OAuthStorage, useFactory: () => storageAPI}
    ],
    imports: [
        RouterModule.forRoot(appRoutes, {
            useHash: false
        }),
        BrowserModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        HomeModule,
        UserServiceModule,
        StaticContentModule
    ],
    bootstrap: [App]
})
export class AppModule {
}
