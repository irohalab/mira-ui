import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { DARK_THEME, DarkThemeService, UIDialog, UIDialogRef, UIToast } from '@irohalab/deneb-ui';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { DownloadJob } from '../../../../entity/DownloadJob';
import { DownloadJobStatus } from '../../../../entity/DownloadJobStatus';
import { VideoFileAdminEntity } from '../../../../entity/admin/VideoFileAdminEntity';
import { ResourceGroup } from '../../../../entity/ResourceGroup';
import { VideoProcessJob } from '../../../../entity/VideoProcessJob';
import { VideoProcessJobStatus } from '../../../../entity/VideoProcessJobStatus';
import { VideoProcessRule } from '../../../../entity/VideoProcessRule';
import { DownloadManagerService } from '../../../download-manager/download-manager.service';
import { VideoProcessManagerService } from '../../../video-process-manager/video-process-manager.service';
import { AdminService } from '../../../admin.service';
import { VideoProcessRuleService } from '../../video-processs-rule/video-process-rule.service';
import { VideoFileDetailPanelComponent } from './video-file-detail-panel.component';
import { EpisodeAdminEntity } from '../../../../entity/admin/EpisodeAdminEntity';
import { BangumiAdminEntity } from '../../../../entity/admin/BangumiAdminEntity';
import { User } from '../../../../entity/user';
import { UserService } from '../../../../user-service/user.service';

describe('VideoFileDetailPanelComponent', () => {
    let component: VideoFileDetailPanelComponent;
    let adminService: jasmine.SpyObj<AdminService>;
    let dialog: jasmine.SpyObj<UIDialog>;
    let dialogRef: jasmine.SpyObj<UIDialogRef<VideoFileDetailPanelComponent>>;
    let ruleService: jasmine.SpyObj<VideoProcessRuleService>;
    let downloadManagerService: jasmine.SpyObj<DownloadManagerService>;
    let videoProcessManagerService: jasmine.SpyObj<VideoProcessManagerService>;
    let router: jasmine.SpyObj<Router>;
    let toastShow: jasmine.Spy;
    let videoFile: VideoFileAdminEntity;
    let user: BehaviorSubject<User>;

    const episode = Object.assign(new EpisodeAdminEntity(), {
        id: '20000000-0000-4000-8000-000000000002',
        episodeNo: 3,
        bangumi: {id: '10000000-0000-4000-8000-000000000001'}
    });

    const resourceGroup = {
        id: '30000000-0000-4000-8000-000000000003',
        displayName: 'Primary source',
        videoFiles: []
    } as ResourceGroup;

    beforeEach(() => {
        videoFile = {
            id: 'video-1',
            bangumi: {id: episode.bangumi.id},
            episode: {id: episode.id},
            resourceGroup: {id: resourceGroup.id},
            fileName: 'episode-03.mkv',
            filePath: '/video/episode-03.mkv',
            torrentId: 'torrent-1',
            downloadUrl: 'magnet:?xt=1',
            status: VideoFileAdminEntity.STATUS_DOWNLOADED,
            resolutionW: 1920,
            resolutionH: 1080,
            duration: 1440,
            label: '1080p',
            taskId: 'task-1',
            kfTileSize: 10,
            kfFrameWidth: 160,
            kfFrameHeight: 90,
            kfImagePathList: ['s3://frames/a.jpg', 's3://frames/b.jpg'],
            blobStorageUrlV0: 's3://video/episode-03.mkv'
        };

        adminService = jasmine.createSpyObj<AdminService>('AdminService', [
            'getEpisodeVideoFiles',
            'addVideoFile',
            'updateVideoFile',
            'deleteVideoFile',
            'getBangumi',
            'listEpisode',
            'listResourceGroups'
        ]);
        dialog = jasmine.createSpyObj<UIDialog>('UIDialog', ['open']);
        dialog.open.and.returnValue({
            componentInstance: {},
            afterClosed: () => of(undefined)
        } as any);
        dialogRef = jasmine.createSpyObj<UIDialogRef<VideoFileDetailPanelComponent>>('UIDialogRef', ['close']);
        ruleService = jasmine.createSpyObj<VideoProcessRuleService>('VideoProcessRuleService', [
            'listRulesByBangumi',
            'deleteRule',
            'createJobFromVideoFile'
        ]);
        downloadManagerService = jasmine.createSpyObj<DownloadManagerService>('DownloadManagerService', [
            'list_jobs',
            'getJob'
        ]);
        videoProcessManagerService = jasmine.createSpyObj<VideoProcessManagerService>('VideoProcessManagerService', [
            'listJobs',
            'getJob'
        ]);
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        toastShow = jasmine.createSpy('show');

        adminService.getEpisodeVideoFiles.and.returnValue(of([videoFile]));
        ruleService.listRulesByBangumi.and.returnValue(of([]));
        downloadManagerService.list_jobs.and.returnValue(of([]));
        videoProcessManagerService.listJobs.and.returnValue(of([]));
        adminService.getBangumi.and.returnValue(of(Object.assign(new BangumiAdminEntity(), {id: episode.bangumi.id, name: 'Source'})));
        adminService.listEpisode.and.returnValue(of([episode]));
        adminService.listResourceGroups.and.returnValue(of([resourceGroup]));
        user = new BehaviorSubject(new User('test-user', 'Test', User.SUPER_ADMIN_ROLE, '', false));

        component = new VideoFileDetailPanelComponent(
            dialogRef,
            adminService,
            new FormBuilder(),
            dialog,
            ruleService,
            downloadManagerService,
            videoProcessManagerService,
            {themeChange: of(DARK_THEME)} as DarkThemeService,
            router,
            {makeText: () => ({show: toastShow})} as any as UIToast,
            jasmine.createSpyObj<UserService>('UserService', [], {userInfo: user.asObservable()})
        );
        component.episode = episode;
        component.resourceGroup = resourceGroup;
    });

    afterEach(() => component.ngOnDestroy());

    it('locks system-managed controls while keeping presentation fields editable', () => {
        component.ngOnInit();

        expect(component.videoFileForm.get('status').disabled).toBeTrue();
        expect(component.videoFileForm.get('kfImagePathList').disabled).toBeTrue();
        expect(component.videoFileForm.get('filePath').disabled).toBeTrue();
        expect(component.videoFileForm.get('fileName').enabled).toBeTrue();
        expect(component.videoFileForm.get('label').enabled).toBeTrue();
        expect(component.videoFileForm.get('downloadUrl').enabled).toBeTrue();

        component.setSystemFieldsUnlocked(true);

        expect(component.videoFileForm.get('status').enabled).toBeTrue();
        expect(component.videoFileForm.get('kfImagePathList').enabled).toBeTrue();
    });

    it('normalizes keyframe paths to a string array in the update payload', () => {
        const updatedVideoFile = {...videoFile, kfImagePathList: ['s3://frames/c.jpg', 's3://frames/d.jpg']};
        adminService.getEpisodeVideoFiles.and.returnValues(of([videoFile]), of([updatedVideoFile]));
        adminService.updateVideoFile.and.returnValue(of(null));
        component.ngOnInit();
        component.setSystemFieldsUnlocked(true);
        component.videoFileForm.get('kfImagePathList').setValue('  s3://frames/c.jpg  \n\n s3://frames/d.jpg\r\n');

        component.save();

        const payload = adminService.updateVideoFile.calls.mostRecent().args[0];
        expect(payload.kfImagePathList).toEqual(['s3://frames/c.jpg', 's3://frames/d.jpg']);
        expect(payload.filePath).toBe(videoFile.filePath);
        expect(component.videoFile.kfImagePathList).toEqual(updatedVideoFile.kfImagePathList);
        expect(component.videoFileForm.pristine).toBeTrue();
    });

    it('does not allow a rule until a new VideoFile has been persisted', () => {
        adminService.getEpisodeVideoFiles.and.returnValues(of([]), of([videoFile]));
        adminService.addVideoFile.and.returnValue(of(videoFile.id));
        component.ngOnInit();

        component.addRule();
        expect(dialog.open).not.toHaveBeenCalled();

        component.save();

        expect(adminService.addVideoFile).toHaveBeenCalled();
        expect(component.isPersisted).toBeTrue();
        component.addRule();
        expect(dialog.open).toHaveBeenCalled();
    });

    it('blocks rule mutation when the API returns duplicate rules for the VideoFile', () => {
        const firstRule = {id: 'rule-1', bangumiId: 'bangumi-1', videoFileId: videoFile.id} as VideoProcessRule;
        const secondRule = {id: 'rule-2', bangumiId: 'bangumi-1', videoFileId: videoFile.id} as VideoProcessRule;
        ruleService.listRulesByBangumi.and.returnValue(of([firstRule, secondRule]));

        component.ngOnInit();
        component.addRule();

        expect(component.ruleInvariantError).toContain('found 2');
        expect(component.videoProcessRule).toBeUndefined();
        expect(dialog.open).not.toHaveBeenCalled();
    });

    it('accepts either the attached rule or a Bangumi-wide rule for reprocessing', () => {
        const fallbackRule = {id: 'rule-fallback', bangumiId: 'bangumi-1', videoFileId: null} as VideoProcessRule;
        ruleService.listRulesByBangumi.and.returnValue(of([fallbackRule]));

        component.ngOnInit();

        expect(component.videoProcessRule).toBeUndefined();
        expect(component.hasBangumiWideRule).toBeTrue();
        expect(component.hasApplicableRule).toBeTrue();
    });

    it('resolves one linked job of each type using the existing video ID predicates', () => {
        const downloadJob = {
            id: 'download-1',
            status: DownloadJobStatus.Complete,
            fileMapping: [{videoId: videoFile.id}]
        } as DownloadJob;
        const processJob = {
            id: 'process-1',
            status: VideoProcessJobStatus.Finished,
            jobMessage: {videoId: videoFile.id}
        } as VideoProcessJob;
        downloadManagerService.list_jobs.and.returnValue(of([downloadJob]));
        videoProcessManagerService.listJobs.and.returnValue(of([processJob]));

        component.ngOnInit();

        expect(component.downloadJob).toBe(downloadJob);
        expect(component.videoProcessJob).toBe(processJob);
    });

    it('deletes the one attached rule after deleting its VideoFile', () => {
        const attachedRule = {id: 'rule-1', bangumiId: 'bangumi-1', videoFileId: videoFile.id} as VideoProcessRule;
        ruleService.listRulesByBangumi.and.returnValue(of([attachedRule]));
        adminService.deleteVideoFile.and.returnValue(of(null));
        ruleService.deleteRule.and.returnValue(of(null));
        component.ngOnInit();

        component.deleteVideoFile();

        expect(adminService.deleteVideoFile).toHaveBeenCalledOnceWith(videoFile.id);
        expect(ruleService.deleteRule).toHaveBeenCalledOnceWith(attachedRule.id);
        expect(dialogRef.close).toHaveBeenCalledWith({action: 'deleted', videoFileId: videoFile.id});
    });

    it('cleans every matching rule when deleting a VideoFile in an invalid duplicate-rule state', () => {
        const firstRule = {id: 'rule-1', bangumiId: 'bangumi-1', videoFileId: videoFile.id} as VideoProcessRule;
        const secondRule = {id: 'rule-2', bangumiId: 'bangumi-1', videoFileId: videoFile.id} as VideoProcessRule;
        ruleService.listRulesByBangumi.and.returnValue(of([firstRule, secondRule]));
        adminService.deleteVideoFile.and.returnValue(of(null));
        ruleService.deleteRule.and.returnValue(of(null));
        component.ngOnInit();

        component.deleteVideoFile();

        expect(ruleService.deleteRule).toHaveBeenCalledTimes(2);
        expect(ruleService.deleteRule).toHaveBeenCalledWith(firstRule.id);
        expect(ruleService.deleteRule).toHaveBeenCalledWith(secondRule.id);
        expect(dialogRef.close).toHaveBeenCalledWith({action: 'deleted', videoFileId: videoFile.id});
    });

    it('shows an invariant error instead of selecting one of multiple scoped VideoFiles', () => {
        adminService.getEpisodeVideoFiles.and.returnValue(of([videoFile, {...videoFile, id: 'video-2'}]));

        component.ngOnInit();

        expect(component.loadError).toContain('found 2');
        expect(component.videoFileForm).toBeUndefined();
    });

    it('opens the explicitly selected VideoFile when a resource group contains multiple files', () => {
        adminService.getEpisodeVideoFiles.and.returnValue(of([{...videoFile, id: 'other-video'}, videoFile]));
        component.videoFileId = videoFile.id;

        component.ngOnInit();

        expect(component.videoFile).toEqual(videoFile);
        expect(component.loadError).toBeUndefined();
    });

    it('can explicitly create a new file without selecting an existing file in the same group', () => {
        component.createNew = true;

        component.ngOnInit();

        expect(adminService.getEpisodeVideoFiles).not.toHaveBeenCalled();
        expect(component.isPersisted).toBeFalse();
        expect(component.videoFileForm).toBeDefined();
    });

    it('transfers all three parent references and reloads by destination before closing', () => {
        const targetBangumi = Object.assign(new BangumiAdminEntity(), {id: '40000000-0000-4000-8000-000000000004', name: 'Destination'});
        const targetEpisode = Object.assign(new EpisodeAdminEntity(), {id: '50000000-0000-4000-8000-000000000005', bangumi: {id: targetBangumi.id}});
        const targetGroup = Object.assign(new ResourceGroup(), {id: '60000000-0000-4000-8000-000000000006', bangumi: {id: targetBangumi.id}});
        const transferredFile = {...videoFile, bangumi: {id: targetBangumi.id}, episode: {id: targetEpisode.id}, resourceGroup: {id: targetGroup.id}};
        adminService.getEpisodeVideoFiles.and.returnValues(of([videoFile]), of([{...transferredFile, id: 'other-video'}, transferredFile]));
        adminService.updateVideoFile.and.returnValue(of(null));
        component.ngOnInit();
        component.setOwnershipEditing(true);
        adminService.getBangumi.and.returnValue(of(targetBangumi));
        adminService.listEpisode.and.returnValue(of([targetEpisode]));
        adminService.listResourceGroups.and.returnValue(of([targetGroup]));
        component.videoFileForm.patchValue({bangumiId: targetBangumi.id});
        component.onDestinationBangumiChange();
        expect(component.videoFileForm.get('episodeId').value).toBe('');
        expect(component.destinationReady).toBeFalse();
        component.loadOwnershipDestination();
        component.videoFileForm.patchValue({episodeId: targetEpisode.id, resourceGroupId: targetGroup.id});

        component.save();

        expect(adminService.updateVideoFile.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
            id: videoFile.id, bangumiId: targetBangumi.id, episodeId: targetEpisode.id, resourceGroupId: targetGroup.id,
            filePath: videoFile.filePath, blobStorageUrlV0: videoFile.blobStorageUrlV0
        }));
        expect(adminService.getEpisodeVideoFiles).toHaveBeenCalledWith(targetEpisode.id, targetGroup.id);
        expect(dialogRef.close).toHaveBeenCalledWith({action: 'saved', videoFileId: videoFile.id, transferred: true});
        expect(ruleService.deleteRule).not.toHaveBeenCalled();
    });

    it('restores original ownership when the transfer controls are locked again', () => {
        component.ngOnInit();
        component.setOwnershipEditing(true);
        component.videoFileForm.patchValue({bangumiId: '40000000-0000-4000-8000-000000000004'});

        component.setOwnershipEditing(false);

        expect(component.ownershipChanged).toBeFalse();
        expect(component.videoFileForm.get('bangumiId').disabled).toBeTrue();
        expect(component.videoFileForm.get('episodeId').value).toBe(episode.id);
    });

    it('does not unlock ownership controls for Admin', () => {
        user.next(new User('test-user', 'Test', User.ADMIN_ROLE, '', false));
        component.ngOnInit();

        component.setOwnershipEditing(true);

        expect(component.ownershipEditing).toBeFalse();
        expect(component.videoFileForm.get('bangumiId').disabled).toBeTrue();
        expect(adminService.getBangumi).not.toHaveBeenCalled();
    });

    it('surfaces destination failures and keeps transfers unavailable', () => {
        component.ngOnInit();
        adminService.getBangumi.and.returnValue(throwError(() => new Error('Destination unavailable')));

        component.setOwnershipEditing(true);

        expect(component.destinationError).toContain('Destination unavailable');
        expect(component.destinationReady).toBeFalse();
        expect(component.destinationLoading).toBeFalse();
        component.save();
        expect(adminService.updateVideoFile).not.toHaveBeenCalled();
    });
});