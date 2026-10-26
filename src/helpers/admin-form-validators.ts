import { ValidatorFn } from '@angular/forms';
import { isItemProperties } from '../app/entity/ItemProperties';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCalendarDate(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export const calendarDateValidator: ValidatorFn = control => {
    const value = control.value;
    if (value === null || value === '') return null;
    return isCalendarDate(value) ? null : {calendarDate: true};
};

export const itemPropertiesValidator: ValidatorFn = control => {
    try {
        const value: unknown = JSON.parse(control.value);
        return isItemProperties(value) ? null : {itemProperties: true};
    } catch (error) {
        if (error instanceof SyntaxError) return {json: true};
        throw error;
    }
};
