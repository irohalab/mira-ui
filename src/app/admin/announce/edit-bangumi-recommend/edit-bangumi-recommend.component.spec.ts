import { FormBuilder } from '@angular/forms';
import { DARK_THEME, DarkThemeService, UIDialogRef } from '@irohalab/deneb-ui';
import dayjs from 'dayjs';
import { of } from 'rxjs';
import {
    EditBangumiRecommendComponent,
    MAX_DATE_RANGE,
} from './edit-bangumi-recommend.component';

describe('EditBangumiRecommendComponent', () => {
    let component: EditBangumiRecommendComponent;

    beforeEach(() => {
        component = new EditBangumiRecommendComponent(
            new FormBuilder(),
            {themeChange: of(DARK_THEME)} as DarkThemeService,
            jasmine.createSpyObj<UIDialogRef<EditBangumiRecommendComponent>>('UIDialogRef', ['close']),
        );
        component.bangumi = {id: 'bangumi-1', name: 'Bangumi'};
        component.ngOnInit();
    });

    afterEach(() => component.ngOnDestroy());

    it('creates a valid default form with the maximum date range', () => {
        const startTime = dayjs(component.recommendForm.get('startTime').value);
        const endTime = dayjs(component.recommendForm.get('endTime').value);

        expect(component.recommendForm.valid).toBeTrue();
        expect(endTime.diff(startTime, 'millisecond')).toBe(MAX_DATE_RANGE * 24 * 3600 * 1000);
    });

    it('rejects an end time that is not after the start time', () => {
        const startTime = dayjs('2026-08-29T00:00:00');
        component.recommendForm.patchValue({startTime, endTime: startTime});

        expect(component.recommendForm.errors?.['dateRange']).toBe('invalid range');
    });

    it('rejects a date range longer than the maximum', () => {
        const startTime = dayjs('2026-08-29T00:00:00');
        component.recommendForm.patchValue({
            startTime,
            endTime: startTime.add(MAX_DATE_RANGE + 1, 'day'),
        });

        expect(component.recommendForm.errors?.['dateRange']).toBe('exceed max range');
    });
});
