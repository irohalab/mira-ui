import { FormBuilder } from '@angular/forms';
import { DARK_THEME, DarkThemeService, UIToast } from '@irohalab/deneb-ui';
import { of } from 'rxjs';
import { BangumiAdminEntity } from '../../../entity/admin/BangumiAdminEntity';
import { AdminService } from '../../admin.service';
import { BangumiOverviewComponent } from './bangumi-overview.component';

describe('BangumiOverviewComponent', () => {
  let component: BangumiOverviewComponent;
  let adminService: jasmine.SpyObj<AdminService>;
  let toastShow: jasmine.Spy;
  let bangumi: BangumiAdminEntity;

  beforeEach(() => {
    bangumi = {
      id: 'bangumi-1',
      itemId: 'item-1',
      bgmId: 1,
      name: 'Original name',
      nameCn: '中文名',
      summary: 'Summary',
      airDate: '2026-08-29',
      airWeekday: 6,
      status: 1,
      epsNoOffset: 0,
      alertTimeout: 2,
      maintainedByUid: 'admin-1',
      lockedFields: {coverImage: true},
      episodes: [],
      coverImage: null
    } as unknown as BangumiAdminEntity;
    adminService = jasmine.createSpyObj<AdminService>('AdminService', [
      'updateBangumi',
      'syncBangumi',
      'getBangumi'
    ]);
    toastShow = jasmine.createSpy('show');
    component = new BangumiOverviewComponent(
      adminService,
      new FormBuilder(),
      {themeChange: of(DARK_THEME)} as DarkThemeService,
      {makeText: () => ({show: toastShow})} as any as UIToast
    );
    component.bangumi = bangumi;
    component.ngOnInit();
  });

  afterEach(() => component.ngOnDestroy());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stages field locks until the form is saved', () => {
    const refreshedBangumi = {...bangumi, lockedFields: {coverImage: true, name: true}} as BangumiAdminEntity;
    adminService.updateBangumi.and.returnValue(of(null));
    adminService.getBangumi.and.returnValue(of(refreshedBangumi));

    component.toggleFieldLock('name');

    expect(component.bangumiForm.dirty).toBeTrue();
    expect(adminService.updateBangumi).not.toHaveBeenCalled();

    component.save();

    const payload = adminService.updateBangumi.calls.mostRecent().args[0];
    expect(payload.lockedFields['name']).toBeTrue();
    expect(payload.lockedFields['coverImage']).toBeTrue();
    expect(adminService.getBangumi).toHaveBeenCalledOnceWith(bangumi.id);
    expect(component.bangumi).toBe(refreshedBangumi);
  });

  it('resets edited values and lock state without saving', () => {
    component.bangumiForm.get('name').setValue('Changed');
    component.toggleFieldLock('name');

    component.reset();

    expect(component.bangumiForm.get('name').value).toBe(bangumi.name);
    expect(component.isFieldLocked('name')).toBeFalse();
    expect(component.bangumiForm.pristine).toBeTrue();
    expect(adminService.updateBangumi).not.toHaveBeenCalled();
  });

  it('saves a date-only air date and derives its weekday for display', () => {
    const refreshedBangumi = {...bangumi, airDate: '2026-08-30', airWeekday: 0} as BangumiAdminEntity;
    adminService.updateBangumi.and.returnValue(of(null));
    adminService.getBangumi.and.returnValue(of(refreshedBangumi));

    const selectedDate = new Date(2026, 7, 30);
    component.bangumiForm.get('airDate').setValue(selectedDate);
    component.bangumiForm.get('airDate').markAsDirty();

    expect(component.airWeekdayLabel).toBe('星期日');
    component.save();

    const payload = adminService.updateBangumi.calls.mostRecent().args[0];
    expect(payload.airDate).toBe(selectedDate.toISOString());
    expect(adminService.getBangumi).toHaveBeenCalledOnceWith(bangumi.id);
  });

  it('does not expose or retain locks for management settings', () => {
    component.bangumi = {
      ...bangumi,
      lockedFields: {name: true, status: true, alertTimeout: true}
    } as BangumiAdminEntity;
    const refreshedBangumi = {...component.bangumi, lockedFields: {name: true}} as BangumiAdminEntity;
    adminService.updateBangumi.and.returnValue(of(null));
    adminService.getBangumi.and.returnValue(of(refreshedBangumi));

    expect(component.bangumiForm.get('lockedFields.status')).toBeNull();
    component.bangumiForm.get('alertTimeout').setValue(3);
    component.bangumiForm.get('alertTimeout').markAsDirty();
    component.save();

    const payload = adminService.updateBangumi.calls.mostRecent().args[0];
    expect(payload.lockedFields).toEqual({name: true});
  });

  it('refreshes the Bangumi from the backend after upstream sync', () => {
    const refreshedBangumi = {...bangumi, name: 'Upstream name'} as BangumiAdminEntity;
    const bangumiChange = jasmine.createSpy('bangumiChange');
    component.bangumiChange.subscribe(bangumiChange);
    adminService.syncBangumi.and.returnValue(of(undefined));
    adminService.getBangumi.and.returnValue(of(refreshedBangumi));

    component.syncBangumi();

    expect(adminService.syncBangumi).toHaveBeenCalledOnceWith(bangumi.id);
    expect(adminService.getBangumi).toHaveBeenCalledOnceWith(bangumi.id);
    expect(component.bangumi).toBe(refreshedBangumi);
    expect(bangumiChange).toHaveBeenCalledOnceWith(refreshedBangumi);
    expect(toastShow).toHaveBeenCalledWith('已从上游同步');
  });
});
