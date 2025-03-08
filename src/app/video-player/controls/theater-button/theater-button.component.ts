import { Component, HostListener, Input } from '@angular/core';
import { VideoPlayer } from '../../video-player.component';

@Component({
    selector: 'video-theater-button',
    template: `
        <i class="svg-icon enable-theater" *ngIf="!isTheaterMode" title="剧场模式">
            <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                viewBox="0 0 122.879 100.426" xml:space="preserve"><g><path d="M23.417,50.189V23.298h27.528v9.584H33.001v17.307H23.417L23.417,50.189z M14.279,0h94.323 c3.914,0,7.48,1.609,10.076,4.201l0.01-0.01c2.586,2.586,4.191,6.158,4.191,10.088v71.87c0,3.906-1.605,7.473-4.191,10.066 l-0.029,0.031c-2.596,2.58-6.154,4.18-10.057,4.18H14.279c-3.931,0-7.502-1.605-10.088-4.191c-0.108-0.107-0.209-0.219-0.305-0.334 C1.479,93.336,0,89.9,0,86.148v-71.87c0-3.932,1.605-7.503,4.19-10.088C6.776,1.605,10.346,0,14.279,0L14.279,0z M108.602,9.743 H14.279c-1.242,0-2.375,0.512-3.2,1.336c-0.824,0.825-1.336,1.958-1.336,3.2v71.87c0,1.164,0.436,2.225,1.149,3.02l0.187,0.178 c0.825,0.826,1.958,1.338,3.199,1.338h94.323c1.254,0,2.385-0.506,3.197-1.318l0.02-0.02c0.813-0.813,1.318-1.945,1.318-3.197 v-71.87c0-1.241-0.512-2.375-1.338-3.199l0.01-0.009l-0.01-0.01C110.988,10.248,109.855,9.743,108.602,9.743L108.602,9.743z M99.463,50.237v26.892H71.934v-9.584h17.945V50.237H99.463L99.463,50.237z"/></g></svg>
        </i>
        <i class="svg-icon disable-theater" *ngIf="isTheaterMode" title="普通模式">
            <svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 122.88 114.71" xml:space="preserve"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;}</style><g><path class="st0" d="M2.09,0h118.71c1.15,0,2.09,0.89,2.09,1.98v110.74c0,1.09-0.93,1.98-2.09,1.98H2.09 c-1.15,0-2.09-0.89-2.09-1.98V1.98C0,0.89,0.93,0,2.09,0L2.09,0z M54.94,39.53L70.52,50.4c0.26,0.16,0.49,0.38,0.67,0.64 c0.73,1.06,0.46,2.5-0.59,3.23L55.09,65c-0.4,0.33-0.91,0.52-1.47,0.52c-1.29,0-2.33-1.04-2.33-2.33V41.44h0.01 c0-0.46,0.14-0.92,0.42-1.33C52.44,39.05,53.89,38.8,54.94,39.53L54.94,39.53z M28.02,83.15h50.93c0.49,0,0.89,0.4,0.89,0.89v3.32 c0,0.49-0.4,0.89-0.89,0.89H28.02c-0.49,0-0.89-0.4-0.89-0.89v-3.32C27.13,83.55,27.53,83.15,28.02,83.15L28.02,83.15z M17.02,83.15h4.23c0.49,0,0.89,0.4,0.89,0.89v3.32c0,0.49-0.4,0.89-0.89,0.89h-4.23c-0.49,0-0.89-0.4-0.89-0.89v-3.32 C16.13,83.55,16.53,83.15,17.02,83.15L17.02,83.15z M17.36,98.54H85.3c0.68,0,1.23,0.84,1.23,1.86v0.67c0,1.02-0.56,1.86-1.23,1.86 H17.36c-0.68,0-1.23-0.84-1.23-1.86v-0.67C16.13,99.37,16.68,98.54,17.36,98.54L17.36,98.54z M16.13,29.92h90.62 c1.1,0,2,0.82,2,1.84v41.12c0,1.01-0.89,1.84-2,1.84H16.13c-1.1,0-2-0.82-2-1.84V31.76C14.13,30.74,15.03,29.92,16.13,29.92 L16.13,29.92z M104.75,33.59H18.13v37.44h86.63V33.59L104.75,33.59z M95.8,6.71c2.19,0,3.97,1.78,3.97,3.97s-1.78,3.97-3.97,3.97 c-2.19,0-3.97-1.78-3.97-3.97S93.6,6.71,95.8,6.71L95.8,6.71z M81.88,6.71c2.19,0,3.97,1.78,3.97,3.97s-1.78,3.97-3.97,3.97 c-2.19,0-3.97-1.78-3.97-3.97S79.68,6.71,81.88,6.71L81.88,6.71z M109.71,6.71c2.19,0,3.97,1.78,3.97,3.97s-1.78,3.97-3.97,3.97 s-3.97-1.78-3.97-3.97S107.52,6.71,109.71,6.71L109.71,6.71z M118.71,21.37H4.17v89.37h114.54V21.37L118.71,21.37z"/></g></svg>
        </i>
    `,
    styles: [`
        :host {
            display: inline-block;
            box-sizing: border-box;
            flex: 0 0 auto;
            margin-left: 0.5rem;
            margin-right: 0.5rem;
            padding: 0.4rem;
            cursor: pointer;
            line-height: 1;
        }

        .svg-icon {
            font-size: 1em;
            display: inline-block;
            &.enable-theater {
                width: 1.18em;
                height: 1em;
                margin-top: 0.15em;
            }

            &.disable-theater {
                width: 1em;
                height: 0.8em;
                margin-top: 0.15em;
            }
            svg {
                path {
                    fill: #f0f0f0;
                }
            }
        }
    `]
})
export class TheaterButtonComponent {

    @Input()
    controlVisibleState: boolean;

    get isTheaterMode(): boolean {
        if (this._videoPlayer) {
            return this._videoPlayer.isTheaterMode;
        }
        return false;
    }

    constructor(private _videoPlayer: VideoPlayer) {
    }

    @HostListener('click', ['$event'])
    onClick(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.controlVisibleState) {
            return;
        }
        this._videoPlayer.toggleTheaterMode();
    }
}
