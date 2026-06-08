import { Component } from '@angular/core';

@Component({
    selector: 'privacy',
    templateUrl: './privacy.html',
    styles: [`
        @import "../static-content.dark.less";
        .parent-dark-theme();
    `]
})
export class PrivacyComponent {
}
