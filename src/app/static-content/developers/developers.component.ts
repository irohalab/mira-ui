import { Component } from '@angular/core';

@Component({
    selector: 'developers',
    templateUrl: './developers.html',
    styles: [`
        @import "../static-content.dark.less";
        .parent-dark-theme();
    `],
    standalone: false
})
export class DevelopersComponent {
}
