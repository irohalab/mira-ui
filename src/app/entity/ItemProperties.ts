/*
 * Copyright 2026 IROHA LAB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export enum PropertyType {
    Staff = 'Staff',
    Item = 'Item',
    Character = 'Character',
    Info = 'Info',
    Cast = 'Cast'
}

export interface PropertyValue {
    value: string | { [k: string]: string }[] | string[];
    propertyType?: PropertyType;
    locked: boolean; // indicates this field should not be modified by scraper.
}

export interface ItemProperties {
    [propertyKey: string]: PropertyValue;
}

export function isItemProperties(value: unknown): value is ItemProperties {
    const isRecord = (entry: unknown): entry is Record<string, unknown> =>
        !!entry && typeof entry === 'object' && !Array.isArray(entry);
    if (!isRecord(value)) {
        return false;
    }
    return Object.values(value).every(property => {
        if (!isRecord(property) || typeof property['locked'] !== 'boolean') {
            return false;
        }
        const propertyType = property['propertyType'];
        if (propertyType !== undefined && !Object.values(PropertyType).some(type => type === propertyType)) {
            return false;
        }
        const data = property['value'];
        return typeof data === 'string' || Array.isArray(data) && (
            data.every(item => typeof item === 'string') ||
            data.every(item => isRecord(item) && Object.values(item).every(entry => typeof entry === 'string'))
        );
    });
}
