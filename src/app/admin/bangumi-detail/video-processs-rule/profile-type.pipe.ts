import { Pipe, PipeTransform } from '@angular/core';

const profileTypeMapping: {[key: string]: string} = {
    'default': 'Default',
    'sound_only': 'Sound Only',
    'video_only': 'Video Only',
    'container_only': 'Container Only',
    'image_subtitle': 'Image Subtitle',
    'custom': 'Custom'
};

@Pipe({ name: 'ProfileType' })
export class ProfileTypePipe implements PipeTransform {
    transform(value: any, ...args: any[]): any {
        return profileTypeMapping[value] || value;
    }
}
