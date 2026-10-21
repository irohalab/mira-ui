import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DARK_THEME, DarkThemeService, UIDialog, UIPopover, UIToast } from '@irohalab/deneb-ui';
import { of } from 'rxjs';
import { AdminService } from '../../admin.service';
import { BangumiAdminEntity } from '../../../entity/admin/BangumiAdminEntity';
import { EpisodeAdminEntity } from '../../../entity/admin/EpisodeAdminEntity';
import { EpisodeColumnsPopoverComponent } from './episode-columns-popover/episode-columns-popover.component';
import { EpisodeListComponent } from './episode-list.component';

describe('EpisodeListComponent', () => {
  let component: EpisodeListComponent;
  let fixture: ComponentFixture<EpisodeListComponent>;
  let storedColumns: string | null;
  let getItemSpy: jasmine.Spy;
  let setItemSpy: jasmine.Spy;
  let adminService: jasmine.SpyObj<AdminService>;
  const storageKey = 'mira.admin.episode-list.columns';
  const defaultKeys: EpisodeListComponent['visibleColumnKeys'] = ['episodeNo', 'thumbnail', 'title', 'airdate', 'duration'];

  beforeEach(async () => {
    storedColumns = null;
    getItemSpy = spyOn(Storage.prototype, 'getItem').and.callFake(key => key === storageKey ? storedColumns : null);
    setItemSpy = spyOn(Storage.prototype, 'setItem');
    adminService = jasmine.createSpyObj<AdminService>('AdminService', ['listEpisode']);
    adminService.listEpisode.and.returnValue(of([]));
    const toastService = jasmine.createSpyObj<UIToast>('UIToast', ['makeText']);
    toastService.makeText.and.returnValue(jasmine.createSpyObj('UIToastRef', ['show']));

    await TestBed.configureTestingModule({
      imports: [EpisodeListComponent],
      providers: [
        {provide: AdminService, useValue: adminService},
        {provide: UIDialog, useValue: jasmine.createSpyObj('UIDialog', ['open'])},
        {provide: DarkThemeService, useValue: {themeChange: of(DARK_THEME)}},
        {provide: UIToast, useValue: toastService}
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EpisodeListComponent);
    component = fixture.componentInstance;
    component.bangumi = {id: 'test-bangumi'} as BangumiAdminEntity;
  });

  it('keeps the original columns visible by default', () => {
    fixture.detectChanges();

    expect(component.visibleColumns.map(column => column.key)).toEqual(defaultKeys);
  });

  it('toggles debug columns and saves the selection', () => {
    fixture.detectChanges();

    component.toggleColumn('id');

    expect(component.isColumnVisible('id')).toBeTrue();
    expect(setItemSpy).toHaveBeenCalledWith(storageKey, JSON.stringify([...defaultKeys, 'id']));

    component.toggleColumn('id');

    expect(component.isColumnVisible('id')).toBeFalse();
    expect(component.visibleColumnKeys).toEqual(defaultKeys);
  });

  it('restores supported columns in table order and ignores obsolete keys', () => {
    storedColumns = JSON.stringify(['status', 'bangumiId', 'id', 'id', 'videoFiles', 'deleteMark', 'type']);

    fixture.detectChanges();

    expect(component.visibleColumns.map(column => column.key)).toEqual(['id', 'type']);
  });

  for (const savedValue of ['invalid JSON', '{}', '[]', '["videoFiles"]', '["status", "deleteMark"]']) {
    it(`uses defaults for invalid or unsupported preferences: ${savedValue}`, () => {
      storedColumns = savedValue;

      fixture.detectChanges();

      expect(component.visibleColumnKeys).toEqual(defaultKeys);
    });
  }

  it('does not let the last data column be hidden', () => {
    storedColumns = JSON.stringify(['id']);
    fixture.detectChanges();

    component.toggleColumn('id');

    expect(component.visibleColumnKeys).toEqual(['id']);
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('restores and persists the default columns', () => {
    storedColumns = JSON.stringify(['id', 'type']);
    fixture.detectChanges();

    component.resetColumns();

    expect(component.visibleColumnKeys).toEqual(defaultKeys);
    expect(setItemSpy).toHaveBeenCalledWith(storageKey, JSON.stringify(defaultKeys));
  });

  it('still works when browser storage cannot be read or written', () => {
    getItemSpy.and.throwError('Storage is unavailable');
    setItemSpy.and.throwError('Storage is unavailable');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(() => component.toggleColumn('type')).not.toThrow();
    expect(component.isColumnVisible('type')).toBeTrue();
  });

  it('does not offer show-level, video file, or legacy fields', () => {
    const keys = component.columns.map(column => column.key);

    for (const excluded of ['bangumi', 'bangumiId', 'bgmEpsId', 'videoFiles', 'thumbnailColor', 'status', 'deleteMark']) {
      expect(keys).not.toContain(excluded as typeof keys[number]);
    }
  });

  function renderEpisode(overrides: Partial<EpisodeAdminEntity> = {}): HTMLElement {
    adminService.listEpisode.and.returnValue(of([Object.assign(new EpisodeAdminEntity(), {
      id: 'episode-123',
      subItemId: 'source-456',
      episodeNo: 0,
      type: 0,
      sort: 0,
      status: 0,
      name: 'Episode title',
      nameCn: 'Translated title',
      airdate: '2026-10-20',
      duration: '24:00',
      properties: {source: {value: 'Provider entry', locked: false}},
      createTime: '2026-10-19T08:00:00.000Z',
      updateTime: '2026-10-20T09:00:00.000Z'
    }, overrides)]));
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  async function openColumnPicker(element: HTMLElement): Promise<HTMLElement> {
    element.querySelector<HTMLButtonElement>('.column-picker').click();
    await fixture.whenStable();
    return document.querySelector<HTMLElement>('app-episode-columns-popover');
  }

  it('keeps headers and row cells aligned when a checkbox changes', async () => {
    const element = renderEpisode();
    const picker = await openColumnPicker(element);
    const checkbox = picker.querySelector<HTMLInputElement>('#episode-column-id');

    checkbox.click();
    fixture.detectChanges();

    expect(element.querySelector('th[data-column="id"]')).not.toBeNull();
    expect(element.querySelector('td[data-column="id"]').textContent.trim()).toBe('episode-123');
    expect(element.querySelectorAll('thead th').length).toBe(element.querySelectorAll('tbody td').length);
    expect(element.querySelectorAll('.episode-actions .anchor-button').length).toBe(3);

    checkbox.click();
    fixture.detectChanges();

    expect(element.querySelector('th[data-column="id"]')).toBeNull();
    expect(element.querySelector('td[data-column="id"]')).toBeNull();
  });

  it('places sort immediately after episodeNo when enabled', async () => {
    const element = renderEpisode();
    const picker = await openColumnPicker(element);

    picker.querySelector<HTMLInputElement>('#episode-column-sort').click();
    await fixture.whenStable();

    expect(Array.from(element.querySelectorAll('thead th[data-column]'), header => header.getAttribute('data-column')))
      .toEqual(['episodeNo', 'sort', 'thumbnail', 'title', 'airdate', 'duration']);
    expect(Array.from(element.querySelectorAll('tbody td[data-column]'), cell => cell.getAttribute('data-column')))
      .toEqual(['episodeNo', 'sort', 'thumbnail', 'title', 'airdate', 'duration']);
  });

  it('renders the special episode type as its raw value', () => {
    storedColumns = JSON.stringify(['type']);
    const element = renderEpisode({type: 1});

    expect(element.querySelector('td[data-column="type"]').textContent.trim()).toBe('1');
  });

  for (const [status, rowClass] of [[1, 'downloading'], [2, 'downloaded']] as const) {
    it(`preserves the ${rowClass} row highlighting without a status column`, () => {
      const element = renderEpisode({status});

      expect(element.querySelector('tbody tr').classList.contains(rowClass)).toBeTrue();
      expect(element.querySelector('[data-column="status"]')).toBeNull();
    });
  }

  it('renders debug values without replacing valid zeroes or losing raw timestamps', () => {
    storedColumns = JSON.stringify(['episodeNo', 'id', 'subItemId', 'type', 'sort', 'properties',
      'createTime', 'updateTime']);
    const element = renderEpisode();
    const cell = (key: string) => element.querySelector(`td[data-column="${key}"]`).textContent.trim();

    expect(cell('episodeNo')).toBe('0');
    expect(cell('id')).toBe('episode-123');
    expect(cell('subItemId')).toBe('source-456');
    expect(cell('type')).toBe('0');
    expect(cell('sort')).toBe('0');
    expect(JSON.parse(cell('properties'))).toEqual({source: {value: 'Provider entry', locked: false}});
    expect(cell('createTime')).toBe('2026-10-19T08:00:00.000Z');
    expect(cell('updateTime')).toBe('2026-10-20T09:00:00.000Z');
  });

  it('leaves actions available and disables the last selected checkbox', async () => {
    storedColumns = JSON.stringify(['id']);
    const element = renderEpisode();
    const picker = await openColumnPicker(element);

    expect(picker.querySelector<HTMLInputElement>('#episode-column-id').disabled).toBeTrue();
    expect(element.querySelectorAll('thead th').length).toBe(2);
    expect(element.querySelector('.episode-actions')).not.toBeNull();
  });

  it('resets the visible table through the picker button', async () => {
    storedColumns = JSON.stringify(['id', 'type']);
    const element = renderEpisode();
    const picker = await openColumnPicker(element);

    picker.querySelector<HTMLButtonElement>('.column-options-heading button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.visibleColumnKeys).toEqual(defaultKeys);
    expect(element.querySelector('th[data-column="id"]')).toBeNull();
    expect(element.querySelectorAll('thead th').length).toBe(defaultKeys.length + 1);
    expect(picker.querySelector<HTMLInputElement>('#episode-column-id').checked).toBeFalse();
    expect(picker.querySelector<HTMLInputElement>('#episode-column-episodeNo').checked).toBeTrue();
  });

  it('uses the visible column count for the empty state', () => {
    storedColumns = JSON.stringify(['id', 'type']);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tbody td').colSpan).toBe(3);
  });

  it('keeps the column controls readable in dark mode', async () => {
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const picker = await openColumnPicker(element);

    expect(element.querySelector('.column-picker').classList.contains('inverted')).toBeTrue();
    expect(picker.querySelector('.column-options-heading button').classList.contains('inverted')).toBeTrue();
    expect(getComputedStyle(picker.querySelector('.column-checkboxes label')).color).toBe('rgb(255, 255, 255)');
  });

  it('uses field names for table headers and column picker labels', async () => {
    storedColumns = JSON.stringify(component.columns.map(column => column.key));
    const element = renderEpisode();
    const picker = await openColumnPicker(element);
    const labels = ['episodeNo', 'sort', 'thumbnailImage', 'name / nameCn', 'airdate', 'duration', 'id',
      'subItemId', 'type', 'properties', 'createTime', 'updateTime'];

    expect(Array.from(element.querySelectorAll('thead th[data-column]'), header => header.textContent.trim())).toEqual(labels);
    expect(Array.from(picker.querySelectorAll('.column-checkboxes label'), label => label.textContent.trim())).toEqual(labels);
  });

  it('opens a detached Deneb popup anchored to the columns button', async () => {
    const popoverSpy = spyOn(TestBed.inject(UIPopover), 'createPopover').and.callThrough();
    const element = renderEpisode();
    const picker = await openColumnPicker(element);
    const button = element.querySelector<HTMLButtonElement>('.column-picker');

    expect(popoverSpy).toHaveBeenCalledOnceWith(button, EpisodeColumnsPopoverComponent, 'bottom-end');
    expect(picker.parentElement).toBe(document.body);
    expect(element.querySelector('.column-options')).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles the same popup closed on a second button click', async () => {
    const popoverSpy = spyOn(TestBed.inject(UIPopover), 'createPopover').and.callThrough();
    const element = renderEpisode();
    await openColumnPicker(element);

    element.querySelector<HTMLButtonElement>('.column-picker').click();
    await fixture.whenStable();

    expect(popoverSpy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('app-episode-columns-popover')).toBeNull();
    expect(element.querySelector('.column-picker').getAttribute('aria-expanded')).toBe('false');
  });

  it('unsubscribes popup events after an outside click closes it', async () => {
    const popoverSpy = spyOn(TestBed.inject(UIPopover), 'createPopover').and.callThrough();
    const element = renderEpisode();
    await openColumnPicker(element);
    const picker = popoverSpy.calls.mostRecent().returnValue.componentInstance as EpisodeColumnsPopoverComponent;

    document.body.click();
    await fixture.whenStable();
    picker.columnToggle.emit('id');

    expect(component.isColumnVisible('id')).toBeFalse();
    expect(component.isColumnPickerOpen).toBeFalse();
    expect(document.querySelector('app-episode-columns-popover')).toBeNull();
  });

  it('closes the popup when the episode list is destroyed', async () => {
    const element = renderEpisode();
    await openColumnPicker(element);

    fixture.destroy();

    expect(document.querySelector('app-episode-columns-popover')).toBeNull();
  });
});
