import { FormBuilder } from '@angular/forms';
import { DARK_THEME, DarkThemeService, UIDialog, UIToast } from '@irohalab/deneb-ui';
import { of, throwError } from 'rxjs';
import { DownloadJob } from '../../../entity/DownloadJob';
import { VideoFileAdminEntity } from '../../../entity/admin/VideoFileAdminEntity';
import { ResourceGroup } from '../../../entity/ResourceGroup';
import { VideoProcessJob } from '../../../entity/VideoProcessJob';
import { DownloadManagerService } from '../../download-manager/download-manager.service';
import { VideoProcessManagerService } from '../../video-process-manager/video-process-manager.service';
import { AdminService } from '../../admin.service';
import { FeedService } from '../feed.service';
import { ResourceGroupComponent } from './resource-group.component';

describe('ResourceGroupComponent', () => {
  let component: ResourceGroupComponent;
  let adminService: jasmine.SpyObj<AdminService>;
  let dialog: jasmine.SpyObj<UIDialog>;
  let dialogComponentInstance: any;
  let dialogClosedResult: any;
  let toastShow: jasmine.Spy;
  let resourceGroup: ResourceGroup;
  let episodeStatus: any;
  let videoFile: VideoFileAdminEntity;

  beforeEach(() => {
    videoFile = {
      id: 'video-1',
      status: VideoFileAdminEntity.STATUS_DOWNLOADED,
      bangumi: {id: 'bangumi-1'},
      episode: {id: 'episode-1'},
      resourceGroup: {id: 'resource-group-1'}
    };
    resourceGroup = {
      id: 'resource-group-1',
      displayName: 'Primary source',
      videoFiles: [videoFile]
    } as ResourceGroup;
    episodeStatus = {
      episode: {id: 'episode-1', bangumi: {id: 'bangumi-1'}},
      videoFiles: [{
        id: videoFile.id,
        status: videoFile.status,
        downloadJob: {id: 'download-1'} as DownloadJob,
        videoProcessJob: {id: 'process-1'} as VideoProcessJob
      }]
    };

    adminService = jasmine.createSpyObj<AdminService>('AdminService', ['getEpisodeVideoFiles']);
    adminService.getEpisodeVideoFiles.and.returnValue(of([videoFile]));
    dialog = jasmine.createSpyObj<UIDialog>('UIDialog', ['open']);
    dialogComponentInstance = {};
    dialogClosedResult = null;
    dialog.open.and.returnValue({
      componentInstance: dialogComponentInstance,
      afterClosed: () => of(dialogClosedResult)
    } as any);
    toastShow = jasmine.createSpy('show');

    component = new ResourceGroupComponent(
      adminService,
      jasmine.createSpyObj<FeedService>('FeedService', ['getUniversalMeta']),
      dialog,
      new FormBuilder(),
      jasmine.createSpyObj<VideoProcessManagerService>('VideoProcessManagerService', ['listJobs']),
      jasmine.createSpyObj<DownloadManagerService>('DownloadManagerService', ['list_jobs']),
      {themeChange: of(DARK_THEME)} as DarkThemeService,
      {makeText: () => ({show: toastShow})} as any as UIToast
    );
    component.bangumi = {id: 'bangumi-1'} as any;
    component.episodeVideoFileStatus = {[resourceGroup.id]: [episodeStatus]};
  });

  afterEach(() => component.ngOnDestroy());

  it('opens the single-file panel with the current linked jobs', () => {
    component.viewEpisode(resourceGroup, episodeStatus);

    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), {stickyDialog: true, backdrop: true});
    expect(dialogComponentInstance.episode).toBe(episodeStatus.episode);
    expect(dialogComponentInstance.resourceGroup).toBe(resourceGroup);
    expect(dialogComponentInstance.downloadJob).toBe(episodeStatus.videoFiles[0].downloadJob);
    expect(dialogComponentInstance.videoProcessJob).toBe(episodeStatus.videoFiles[0].videoProcessJob);
    expect(component.pauseRefreshRG).toBeFalse();
  });

  it('removes a deleted VideoFile from both resource-group representations after close', () => {
    adminService.getEpisodeVideoFiles.and.returnValue(of([]));

    component.viewEpisode(resourceGroup, episodeStatus);

    expect(resourceGroup.videoFiles).toEqual([]);
    expect(episodeStatus.videoFiles).toEqual([]);
    expect(component.pauseRefreshRG).toBeFalse();
  });

  it('always resumes resource-group refresh when the scoped reload fails', () => {
    adminService.getEpisodeVideoFiles.and.returnValue(throwError(() => new Error('reload failed')));

    component.viewEpisode(resourceGroup, episodeStatus);

    expect(component.pauseRefreshRG).toBeFalse();
    expect(toastShow).toHaveBeenCalledWith('reload failed');
  });
});
