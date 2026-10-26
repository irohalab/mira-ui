import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DARK_THEME, DarkThemeService, UIDialog, UIDialogRef, UIToast } from '@irohalab/deneb-ui';
import { of, Subject, throwError } from 'rxjs';
import { AdminService } from '../../admin.service';
import { EpisodeAdminEntity } from '../../../entity/admin/EpisodeAdminEntity';
import { VideoFileAdminEntity } from '../../../entity/admin/VideoFileAdminEntity';
import { ResourceGroup } from '../../../entity/ResourceGroup';
import { VideoFileDetailPanelComponent } from '../resource-group/video-file-detail-panel/video-file-detail-panel.component';
import { VideoFileModal } from './video-file-modal.component';

describe('VideoFileModal', () => {
    let component: VideoFileModal;
    let fixture: ComponentFixture<VideoFileModal>;
    let adminService: jasmine.SpyObj<AdminService>;
    let openEditor: jasmine.Spy;
    let editorInputs: Partial<VideoFileDetailPanelComponent>;
    let editorClosed: Subject<unknown>;
    let toastShow: jasmine.Spy;

    const episode = Object.assign(new EpisodeAdminEntity(), {
        id: 'episode-1', episodeNo: 1, bangumi: {id: 'bangumi-1'}
    });
    const group = Object.assign(new ResourceGroup(), {id: 'group-1', displayName: 'Source'});
    const file: VideoFileAdminEntity = {
        id: 'video-1', bangumi: episode.bangumi, episode: {id: episode.id},
        resourceGroup: {id: group.id}, status: 3, fileName: 'episode.mkv'
    };

    beforeEach(async () => {
        adminService = jasmine.createSpyObj<AdminService>('AdminService', ['getEpisodeVideoFiles', 'listResourceGroups']);
        adminService.getEpisodeVideoFiles.and.returnValue(of([file]));
        adminService.listResourceGroups.and.returnValue(of([group]));
        editorInputs = {};
        editorClosed = new Subject();
        openEditor = jasmine.createSpy('open').and.returnValue({
            componentInstance: editorInputs,
            afterClosed: () => editorClosed.asObservable()
        });
        const toast = jasmine.createSpyObj<UIToast>('UIToast', ['makeText']);
        const toastRef = jasmine.createSpyObj('UIToastRef', ['show']);
        toastShow = toastRef.show;
        toast.makeText.and.returnValue(toastRef);

        await TestBed.configureTestingModule({
            imports: [VideoFileModal],
            providers: [
                {provide: AdminService, useValue: adminService},
                {provide: UIDialog, useValue: {open: openEditor}},
                {provide: UIDialogRef, useValue: jasmine.createSpyObj('UIDialogRef', ['close'])},
                {provide: DarkThemeService, useValue: {themeChange: of(DARK_THEME)}},
                {provide: UIToast, useValue: toast}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(VideoFileModal);
        component = fixture.componentInstance;
        component.episode = episode;
        fixture.detectChanges();
    });

    it('opens the shared enhanced editor for the exact selected VideoFile', () => {
        const element: HTMLElement = fixture.nativeElement;
        element.querySelector<HTMLButtonElement>('section button').click();

        expect(openEditor).toHaveBeenCalledWith(VideoFileDetailPanelComponent, {stickyDialog: true, backdrop: true});
        expect(editorInputs.episode).toBe(episode);
        expect(editorInputs.resourceGroup).toBe(group);
        expect(editorInputs.videoFileId).toBe(file.id);
        expect(editorInputs.createNew).toBeFalse();
    });

    it('requires a resource group and explicitly creates a new file in the enhanced editor', () => {
        component.addVideoFile();
        expect(openEditor).not.toHaveBeenCalled();
        expect(toastShow).toHaveBeenCalled();

        component.selectedResourceGroupId = group.id;
        component.addVideoFile();

        expect(editorInputs.createNew).toBeTrue();
        expect(editorInputs.resourceGroup).toBe(group);
        expect(editorInputs.videoFileId).toBeUndefined();
    });

    it('reloads the source list after the editor closes so transferred files disappear', () => {
        component.editVideoFile(file);
        adminService.getEpisodeVideoFiles.and.returnValue(of([]));

        editorClosed.next({action: 'saved', videoFileId: file.id, transferred: true});
        fixture.detectChanges();

        expect(adminService.getEpisodeVideoFiles).toHaveBeenCalledTimes(2);
        expect(component.videoFiles).toEqual([]);
        expect(fixture.nativeElement.textContent).toContain('No VideoFiles');
    });

    it('displays load errors rather than presenting an empty list as a successful load', () => {
        adminService.getEpisodeVideoFiles.and.returnValue(throwError(() => new Error('Unable to load files')));

        component.load();
        fixture.detectChanges();

        expect(component.loadError).toBe('Unable to load files');
        expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to load files');
        expect(component.loading).toBeFalse();
    });
});
