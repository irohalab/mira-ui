import { Pipe, PipeTransform } from '@angular/core';

const profileTypeMapping: {[key: string]: string} = {
    'default': 'Default',
    'sound_only': 'Sound Only',
    'video_only': 'Video Only',
    'custom': 'Custom'
};

@Pipe({
    name: 'ProfileType',
    standalone: false
})
export class ProfileTypePipe implements PipeTransform {
    transform(value: any, ...args: any[]): any {
        return profileTypeMapping[value] || value;
    }
}
