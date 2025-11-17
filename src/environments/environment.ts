// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    siteTitle: 'mira',
    chromeExtensionId: '',
    firefoxExtensionId: '',
    firefoxExtensionUrl: '',
    edgeExtensionId: '',
    authAudience: 'https://iroha.io',
    authIssuer: 'http://box.moe:4444',
    authRedirectUri: 'http://localhost:4200',
    authClientId: '79e0ed3b-5ecf-4589-94a2-c320704120fd',
    authShowDebugInformation: true,
    authRequireHttps: false,
    resourceProvider: '/api/v2',
    resourceProviderClientId: '9e2b0512-c267-4b63-a1c1-0da5bfd33ed9',
    bgmProviderBaseURL: 'http://box.moe:8080',
    legacyApiBaseURL: '/api'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
