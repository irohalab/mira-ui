import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'tos',
    templateUrl: './tos.html'
})
export class TosComponent {
    siteName = environment.siteTitle;
}
