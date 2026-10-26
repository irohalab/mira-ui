import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { DARK_THEME, DarkThemeService, UIDialogRef, UIToast } from '@irohalab/deneb-ui';
import { of, throwError } from 'rxjs';
import { AdminService } from '../../admin.service';
import { EpisodeAdminEntity } from '../../../entity/admin/EpisodeAdminEntity';
import { User } from '../../../entity/user';
import { UserService } from '../../../user-service/user.service';
import { EpisodeDetail } from './episode-detail.component';

describe('EpisodeDetail', () => {
    let component: EpisodeDetail;
    let fixture: ComponentFixture<EpisodeDetail>;
    let adminService: jasmine.SpyObj<AdminService>;
    let dialogRef: jasmine.SpyObj<UIDialogRef<EpisodeDetail>>;
    let toastShow: jasmine.Spy;
    let role: string;

    const episode = Object.assign(new EpisodeAdminEntity(), {
        id: '10000000-0000-4000-8000-000000000001',
        bangumi: {id: '20000000-0000-4000-8000-000000000002'},
        subItemId: '30000000-0000-4000-8000-000000000003',
        type: 0, bgmEpsId: 42, episodeNo: 1, sort: 1, name: 'Local title', nameCn: 'Local translation',
        duration: '24:00', airdate: '2026-10-26', status: 2,
        createTime: '2026-01-01T00:00:00.000Z', updateTime: '2026-10-01T00:00:00.000Z',
        properties: {duration: {value: '24:00', locked: true}},
        thumbnailImage: {id: '40000000-0000-4000-8000-000000000004'}
    });

    beforeEach(async () => {
        role = User.SUPER_ADMIN_ROLE;
        adminService = jasmine.createSpyObj<AdminService>('AdminService', [
            'updateEpisodeStatus', 'updateEpisodeFields', 'getEpisodeUpstreamFields'
        ]);
        adminService.updateEpisodeFields.and.returnValue(of(undefined));
        adminService.updateEpisodeStatus.and.returnValue(of(null));
        dialogRef = jasmine.createSpyObj<UIDialogRef<EpisodeDetail>>('UIDialogRef', ['close']);
        const toast = jasmine.createSpyObj<UIToast>('UIToast', ['makeText']);
        const toastRef = jasmine.createSpyObj('UIToastRef', ['show']);
        toastShow = toastRef.show;
        toast.makeText.and.returnValue(toastRef);

        await TestBed.configureTestingModule({
            imports: [EpisodeDetail],
            providers: [
                {provide: AdminService, useValue: adminService},
                {provide: UIDialogRef, useValue: dialogRef},
                {provide: DarkThemeService, useValue: {themeChange: of(DARK_THEME)}},
                {provide: UIToast, useValue: toast},
                {provide: UserService, useValue: {get userInfo() {
                    return of(new User('user', 'Test', role, '', false));
                }}}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(EpisodeDetail);
        component = fixture.componentInstance;
        component.episode = structuredClone(episode);
    });

    it('labels editable fields and makes identity, image, and timestamps read-only', () => {
        fixture.detectChanges();
        const element: HTMLElement = fixture.nativeElement;
        const labels = Array.from(element.querySelectorAll('label')).map(label => label.textContent);
        for (const field of Object.keys(component.episodeForm.controls)) {
            expect(labels.some(label => label.includes(field))).withContext(field).toBeTrue();
        }
        for (const selector of ['#episode-id', '#episode-thumbnail-image-id', '#episode-create-time', '#episode-update-time']) {
            expect(element.querySelector<HTMLInputElement>(selector).readOnly).withContext(selector).toBeTrue();
        }
        expect(element.querySelector('#episode-delete-mark')).toBeNull();
        expect(element.querySelector('#episode-thumbnail-color')).toBeNull();
        for (const field of ['id', 'thumbnailImageId', 'createTime', 'updateTime', 'deleteMark', 'thumbnailColor']) {
            expect(field in component.episodeForm.controls).withContext(field).toBeFalse();
        }
        expect(component.episodeForm.valid).toBeTrue();
    });

    it('saves only editable fields and supports nullable airdate, zero, fractional sort, and JSON', () => {
        fixture.detectChanges();
        component.episodeForm.patchValue({episodeNo: 0, sort: 0.5, nameCn: null, duration: '', airdate: null});

        component.saveEpisode();

        const [id, payload] = adminService.updateEpisodeFields.calls.mostRecent().args;
        expect(id).toBe(episode.id);
        for (const field of ['id', 'thumbnailImageId', 'createTime', 'updateTime', 'deleteMark', 'thumbnailColor']) {
            expect(field in payload).withContext(field).toBeFalse();
        }
        expect(payload.bangumiId).toBe(episode.bangumi.id);
        expect(payload.episodeNo).toBe(0);
        expect(payload.sort).toBe(0.5);
        expect(payload.nameCn).toBeNull();
        expect(payload.duration).toBe('');
        expect(payload.airdate).toBeNull();
        expect(payload.properties).toEqual(episode.properties);
        expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('distinguishes empty text from an explicit null without changing unrelated fields', () => {
        component.episode.thumbnailColor = '';
        fixture.detectChanges();
        component.setTextFieldNull('nameCn');

        component.saveEpisode();

        const payload = adminService.updateEpisodeFields.calls.mostRecent().args[1];
        expect(payload.nameCn).toBeNull();
        expect('thumbnailColor' in payload).toBeFalse();
        expect(payload.name).toBe(episode.name);
    });

    it('fills only upstream-owned draft fields using the current subItemId without saving', () => {
        fixture.detectChanges();
        const sourceId = '50000000-0000-4000-8000-000000000005';
        component.episodeForm.controls.subItemId.setValue(sourceId);
        adminService.getEpisodeUpstreamFields.and.returnValue(of({
            fields: {
                name: 'Upstream title', nameCn: '', type: 1, episodeNo: 0, sort: 0.5,
                airdate: '2026-10-26T12:00:00+09:00',
                properties: {duration: {value: '25:00', locked: false}}
            },
            warnings: []
        }));

        component.fillFromUpstream();

        expect(adminService.getEpisodeUpstreamFields).toHaveBeenCalledWith(episode.id, sourceId);
        expect(component.episodeForm.controls.name.value).toBe('Upstream title');
        expect(component.episodeForm.controls.duration.value).toBe(episode.duration);
        expect(component.episodeForm.controls.airdate.value).toBe('2026-10-26');
        expect(component.episodeForm.controls.status.value).toBe(episode.status);
        expect(component.episode.createTime).toBe(episode.createTime);
        expect(component.episode.thumbnailImage.id).toBe(episode.thumbnailImage.id);
        expect(component.episode.name).toBe('Local title');
        expect(component.episodeForm.dirty).toBeTrue();
        expect(adminService.updateEpisodeFields).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('accepts nullable upstream names and airdate without making the draft invalid', () => {
        fixture.detectChanges();
        adminService.getEpisodeUpstreamFields.and.returnValue(of({
            fields: {name: null, nameCn: null, airdate: null, type: null}, warnings: []
        }));

        component.fillFromUpstream();

        expect(component.episodeForm.controls.name.value).toBeNull();
        expect(component.episodeForm.controls.nameCn.value).toBeNull();
        expect(component.episodeForm.controls.airdate.value).toBeNull();
        expect(component.episodeForm.controls.type.value).toBeNull();
        expect(component.episodeForm.valid).toBeTrue();
    });

    it('applies compatible fields, displays skipped-field warnings, and allows saving the partial import', () => {
        fixture.detectChanges();
        const originalProperties = component.episodeForm.controls.properties.value;
        adminService.getEpisodeUpstreamFields.and.returnValue(of({
            fields: {name: 'Imported title'},
            warnings: [
                {field: 'properties', message: 'The existing properties were kept.'},
                {field: 'type', message: 'The existing type was kept.'}
            ]
        }));

        component.fillFromUpstream();
        fixture.detectChanges();

        expect(component.episodeForm.controls.name.value).toBe('Imported title');
        expect(component.episodeForm.controls.properties.value).toBe(originalProperties);
        expect(component.episodeForm.controls.type.value).toBe(episode.type);
        expect(component.episodeForm.valid).toBeTrue();
        const warning: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
        expect(warning.textContent).toContain('properties');
        expect(warning.textContent).toContain('type');
        expect(toastShow).toHaveBeenCalledWith('Upstream fields filled. Some fields were skipped; review the warnings before saving.');

        component.saveEpisode();

        expect(adminService.updateEpisodeFields.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
            name: 'Imported title', properties: episode.properties, type: episode.type
        }));
        expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('clears old warnings when the next upstream fill has no skipped fields', () => {
        fixture.detectChanges();
        adminService.getEpisodeUpstreamFields.and.returnValues(
            of({fields: {name: 'First import'}, warnings: [{field: 'properties', message: 'Existing properties kept.'}]}),
            of({fields: {name: 'Second import'}, warnings: []})
        );

        component.fillFromUpstream();
        expect(component.upstreamWarnings.length).toBe(1);
        component.fillFromUpstream();
        fixture.detectChanges();

        expect(component.episodeForm.controls.name.value).toBe('Second import');
        expect(component.upstreamWarnings).toEqual([]);
        expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    });

    it('reports upstream errors without changing the draft', () => {
        fixture.detectChanges();
        const original = component.episodeForm.getRawValue();
        adminService.getEpisodeUpstreamFields.and.returnValue(throwError(() => new Error('Provider unavailable')));

        component.fillFromUpstream();

        expect(component.episodeForm.getRawValue()).toEqual(original);
        expect(component.busy).toBeFalse();
        expect(toastShow).toHaveBeenCalledWith('Provider unavailable');
    });

    it('does not submit malformed JSON, invalid dates, or invalid relation ids', () => {
        fixture.detectChanges();
        for (const invalid of [
            {properties: '{bad'}, {properties: '[]'}, {airdate: '2026-02-30'}, {bangumiId: 'bad-id'}
        ]) {
            const original = component.episodeForm.getRawValue();
            component.episodeForm.patchValue(invalid);
            component.saveEpisode();
            expect(adminService.updateEpisodeFields).not.toHaveBeenCalled();
            component.episodeForm.reset(original);
        }
    });

    it('shows structured validation messages from the episode APIs instead of generic HTTP errors', () => {
        fixture.detectChanges();
        adminService.getEpisodeUpstreamFields.and.returnValue(throwError(() => new HttpErrorResponse({
            status: 400, statusText: 'Bad Request', error: {message: 'Invalid episode id or subItemId.'}
        })));
        adminService.updateEpisodeFields.and.returnValue(throwError(() => new HttpErrorResponse({
            status: 400, statusText: 'Bad Request', error: {message: 'airdate must be a valid date or null.'}
        })));

        component.fillFromUpstream();
        expect(toastShow).toHaveBeenCalledWith('Invalid episode id or subItemId.');
        component.saveEpisode();
        expect(toastShow).toHaveBeenCalledWith('airdate must be a valid date or null.');
        expect(dialogRef.close).not.toHaveBeenCalled();
        expect(component.busy).toBeFalse();
    });

    it('preserves status-only editing for Admin and hides full editing and upstream fill', () => {
        role = User.ADMIN_ROLE;
        fixture.detectChanges();
        component.episodeForm.controls.status.setValue(1);
        component.episodeForm.controls.properties.setValue('invalid');

        component.fillFromUpstream();
        component.saveEpisode();

        expect(fixture.nativeElement.querySelector('#episode-sub-item-id')).toBeNull();
        expect(adminService.getEpisodeUpstreamFields).not.toHaveBeenCalled();
        expect(adminService.updateEpisodeFields).not.toHaveBeenCalled();
        expect(adminService.updateEpisodeStatus).toHaveBeenCalledWith(episode.id, 1);
    });
});
