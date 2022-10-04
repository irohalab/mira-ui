import { Component } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
    selector: 'static-content',
    templateUrl: './static-content.html',
    styleUrls: ['./static-content.less']
})
export class StaticContentComponent {
    siteTitle: string = environment.siteTitle;
}
