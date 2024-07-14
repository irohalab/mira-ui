import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { UserService } from './user.service';
import { RouterModule } from '@angular/router';
import { Authentication } from './authentication.service';
import { PersistStorage } from './persist-storage';

@NgModule({ imports: [RouterModule], providers: [
        UserService,
        Authentication,
        PersistStorage,
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class UserServiceModule {

}

export * from './user.service';
export * from './authentication.service';
export * from './persist-storage';
