import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { environment } from './environments/environment';
import { DeviceDetectorService } from './helpers/browser-detect';
import { AnalyticsService } from './app/analytics.service';
import { NavigationService } from './app/navigation.service';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { RefreshSameRouteStrategy } from './app/RefreshSameRouteStrategy';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideOAuthClient, OAuthStorage } from 'angular-oauth2-oidc';
import { storageAPI } from './helpers/localstorage';
import { provideApi } from '@irohalab/mira-sdk-angular';
import { ResponsiveGenerateSrcService, SRC_GENERATOR_SERVICE } from '@irohalab/deneb-ui';
import { provideAnimations } from '@angular/platform-browser/animations';
import { appRoutes } from './app/app.routes';
import { App } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
    providers: [
        provideZoneChangeDetection(),
        provideApi(environment.bgmProviderBaseURL + '/api'),
        provideAnimations(),
        DeviceDetectorService,
        AnalyticsService,
        NavigationService,
        {
            provide: RouteReuseStrategy,
            useClass: RefreshSameRouteStrategy
        },
        provideHttpClient(withFetch(), withInterceptorsFromDi()),
        provideOAuthClient({
            resourceServer: {
                allowedUrls: [environment.resourceProvider, environment.bgmProviderBaseURL],
                sendAccessToken: true
            }
        }),
        { provide: OAuthStorage, useFactory: () => storageAPI },
        { provide: SRC_GENERATOR_SERVICE, useClass: ResponsiveGenerateSrcService },
        provideRouter(appRoutes)
    ]
})
  .catch(err => console.error(err));
