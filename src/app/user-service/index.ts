import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { UserService } from './user.service';
import { RouterModule } from '@angular/router';
import { PersistStorage } from './persist-storage';

@NgModule({ imports: [RouterModule], providers: [
        UserService,
        PersistStorage,
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class UserServiceModule {

}

export * from './user.service';
export * from './auth.guard';
export * from './persist-storage';
