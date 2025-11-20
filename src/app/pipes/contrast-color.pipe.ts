import { Pipe, PipeTransform } from '@angular/core';
import { APP_COLORS } from '../../helpers/color';

@Pipe({
    name: 'contrastColor',
    standalone: false
})
export class ContrastColorPipe implements PipeTransform {

    transform(hexColor: string | null | undefined): string {
        if (!hexColor) return APP_COLORS.defaultButtonColor; // Default fallback

        // Remove hash if present
        const hex = hexColor.replace('#', '');

        // Parse r, g, b
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Calculate YIQ brightness (standard formula)
        // ((Red value X 299) + (Green value X 587) + (Blue value X 114)) / 1000
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        // If brightness >= 128, it's light -> use black text
        // Otherwise it's dark -> use white text
        return (yiq >= 128) ? APP_COLORS.defaultButtonColor : 'white';
    }
}
