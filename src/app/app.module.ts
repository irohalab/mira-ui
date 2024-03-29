import { NgModule } from '@angular/core';
import { App } from './app.component';
import { AnalyticsService } from './analytics.service';
import { RouteReuseStrategy, RouterModule } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { appRoutes } from './app.routes';
import { Login } from './login/login.component';
import { Register } from './register/register.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ErrorComponent } from './error/error.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TaskService } from './admin/task-manager/task.service';
import { HomeModule } from './home/home.module';
import { EmailConfirmModule } from './email-confirm/email-confirm.module';
import { ForgetPassModule } from './forget-pass/forget-pass.module';
import { ResetPassModule } from './reset-pass/reset-pass.module';
import { UserServiceModule } from './user-service/index';
import { StaticContentModule } from './static-content/static-content.module';
import { RefreshSameRouteStrategy } from './RefreshSameRouteStrategy';
import { NavigationService } from './navigation.service';

@NgModule({
    declarations: [
        App,
        Login,
        Register,
        ErrorComponent
    ],
    providers: [
        AnalyticsService,
        NavigationService,
        TaskService,
        {
            provide: RouteReuseStrategy,
            useClass: RefreshSameRouteStrategy
        }
    ],
    imports: [
        RouterModule.forRoot(appRoutes, {
            useHash: false
        }),
        BrowserModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        HomeModule,
        EmailConfirmModule,
        ForgetPassModule,
        ResetPassModule,
        UserServiceModule,
        StaticContentModule
    ],
    bootstrap: [App]
})
export class AppModule {
}
