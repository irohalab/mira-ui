import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'tos',
    templateUrl: './tos.html',
    styles: [`
        @import "../static-content.dark.less";
        .parent-dark-theme();
    `],
    standalone: false
})
export class TosComponent {
    siteName = environment.siteTitle;
}
