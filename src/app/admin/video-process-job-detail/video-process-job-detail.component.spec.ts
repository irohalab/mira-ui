import { ElementRef } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { DARK_THEME, DarkThemeService, UIDialog, UIDialogRef, UIToast } from '@irohalab/deneb-ui';
import { of } from 'rxjs';
import { VideoProcessJob } from '../../entity/VideoProcessJob';
import { VideoProcessJobStatus } from '../../entity/VideoProcessJobStatus';
import { AdminService } from '../admin.service';
import { VideoProcessManagerService } from '../video-process-manager/video-process-manager.service';
import { VideoProcessJobDetailComponent } from './video-process-job-detail.component';

describe('VideoProcessJobDetailComponent', () => {
    let managerService: jasmine.SpyObj<VideoProcessManagerService>;
    let adminService: jasmine.SpyObj<AdminService>;
    let router: jasmine.SpyObj<Router>;
    let title: jasmine.SpyObj<Title>;
    let job: VideoProcessJob;

    beforeEach(() => {
        job = {
            id: 'job-1',
            status: VideoProcessJobStatus.Finished,
            jobMessage: {bangumiId: 'bangumi-1', videoId: 'video-1'},
            stateHistory: []
        } as VideoProcessJob;
        managerService = jasmine.createSpyObj<VideoProcessManagerService>('VideoProcessManagerService', [
            'getJob',
            'getVertices',
            'cancelJob',
            'pauseJob',
            'resumeJob'
        ]);
        managerService.getJob.and.returnValue(of(job));
        managerService.getVertices.and.returnValue(of([]));
        adminService = jasmine.createSpyObj<AdminService>('AdminService', ['getBangumi', 'listResourceGroups']);
        adminService.getBangumi.and.returnValue(of({id: 'bangumi-1', episodes: []} as any));
        adminService.listResourceGroups.and.returnValue(of([]));
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    });

    it('loads the job from ActivatedRoute in normal page mode', () => {
        const component = createComponent({params: of({id: 'route-job'})} as unknown as ActivatedRoute);

        component.ngOnInit();

        expect(managerService.getJob).toHaveBeenCalledWith('route-job');
        expect(title.setTitle).toHaveBeenCalled();
        expect(component.isDialogMode).toBeFalse();
        component.ngOnDestroy();
    });

    it('loads the job from the replayed input and closes locally in dialog mode', () => {
        const dialogRef = jasmine.createSpyObj<UIDialogRef<VideoProcessJobDetailComponent>>('UIDialogRef', ['close']);
        const component = createComponent({params: of({id: 'bangumi-route-id'})} as unknown as ActivatedRoute, dialogRef);
        component.jobId = 'input-job';

        component.ngOnInit();
        component.closeDialog();

        expect(managerService.getJob).toHaveBeenCalledWith('input-job');
        expect(managerService.getJob).not.toHaveBeenCalledWith('bangumi-route-id');
        expect(title.setTitle).not.toHaveBeenCalled();
        expect(dialogRef.close).toHaveBeenCalledOnceWith(null);
        expect(component.isDialogMode).toBeTrue();
        component.ngOnDestroy();
    });

    it('keeps process actions available in dialog mode', () => {
        const dialogRef = jasmine.createSpyObj<UIDialogRef<VideoProcessJobDetailComponent>>('UIDialogRef', ['close']);
        const component = createComponent({params: of({})} as unknown as ActivatedRoute, dialogRef);
        component.job = job;
        managerService.cancelJob.and.returnValue(of(null));

        component.cancelJob();

        expect(managerService.cancelJob).toHaveBeenCalledOnceWith(job.id);
        component.ngOnDestroy();
    });

    function createComponent(route: ActivatedRoute,
                             dialogRef?: UIDialogRef<VideoProcessJobDetailComponent>): VideoProcessJobDetailComponent {
        const component = new VideoProcessJobDetailComponent(
            managerService,
            adminService,
            route,
            router,
            jasmine.createSpyObj<UIDialog>('UIDialog', ['open']),
            {themeChange: of(DARK_THEME)} as DarkThemeService,
            {makeText: () => ({show: jasmine.createSpy('show')})} as any as UIToast,
            title,
            dialogRef
        );
        component.jobLogContainerRef = new ElementRef(document.createElement('div'));
        return component;
    }
});