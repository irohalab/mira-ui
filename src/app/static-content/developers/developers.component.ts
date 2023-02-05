import { Component } from '@angular/core';

@Component({
    selector: 'developers',
    templateUrl: './developers.html',
    styles: [`
        @import "../static-content.dark";
        .parent-dark-theme();
    `]
})
export class DevelopersComponent {
}
