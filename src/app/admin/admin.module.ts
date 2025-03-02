import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Admin } from './admin.component';
import { UniversalBuilderComponent } from './bangumi-detail/universal-builder/universal-builder.component';
import { SearchBangumi } from './search-bangumi';
import { ListBangumi } from './list-bangumi/list-bangumi.component';
import { BangumiDetail } from './bangumi-detail';
import { EpisodeDetail } from './bangumi-detail/episode-detail/episode-detail.component';
import { AdminService } from './admin.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { adminRoutes } from './admin.routes';
import { FeedService } from './bangumi-detail/feed.service';
import { AdminNavbar } from './admin-navbar/admin-navbar.component';
import { BangumiCard } from './bangumi-card/bangumi-card.component';
import { ResponsiveGenerateSrcService, SRC_GENERATOR_SERVICE, UIModule } from '@irohalab/deneb-ui';
import { BangumiTypeNamePipe } from './bangumi-pipes/type-name-pipe';
import { ResultDetail } from './search-bangumi/result-detail/result-detail.component';
import { BangumiBasic } from './bangumi-detail/bangumi-basic/bangumi-basic.component';
import { BangumiStatusNamePipe, VideoFileStatusNamePipe } from './bangumi-pipes/status-name-pipe';
import { LibykPipe } from './bangumi-pipes/libyk-pipe';
import { ParseJsonPipe } from './bangumi-pipes/parse-json.pipe';
import { ConfirmDialogModule } from '../confirm-dialog';
import { TaskManager } from './task-manager/task-manager.component';
import { UserManager } from './user-manager/user-manager.component';
import { TaskService } from './task-manager/task.service';
import { UserManagerSerivce } from './user-manager/user-manager.service';
import { UserPromoteModal } from './user-manager/user-promote-modal/user-promote-modal.component';
import { DenebCommonPipes } from '../pipes';
import { VideoFileModal } from './bangumi-detail/video-file-modal/video-file-modal.component';
import { AnnounceComponent } from './announce/announce.component';
import { EditAnnounceComponent } from './announce/edit-announce/edit-announce.component';
import { AnnounceService } from './announce/announce.service';
import { ListBangumiService } from './list-bangumi/list-bangumi.service';
import { UserServiceModule } from '../user-service';
import { DpDatePickerModule } from 'ng2-date-picker';
import { NyaaPipe } from './bangumi-pipes/nyaa-pipe';
import { EditBangumiRecommendComponent } from './announce/edit-bangumi-recommend/edit-bangumi-recommend.component';
import { VideoProcessRuleComponent } from './bangumi-detail/video-processs-rule/video-process-rule.component';
import { VideoProcessRuleService } from './bangumi-detail/video-processs-rule/video-process-rule.service';
import {
    VideoProcessRuleEditorComponent
} from './bangumi-detail/video-processs-rule/video-process-rule-editor/video-process-rule-editor.component';
import {
    VideoProcessRuleItemComponent
} from './bangumi-detail/video-processs-rule/video-process-rule-item/video-process-rule-item.component';
import { ActionTypePipe } from './bangumi-detail/video-processs-rule/action-type.pipe';
import { ProfileTypePipe } from './bangumi-detail/video-processs-rule/profile-type.pipe';
import { DownloadManagerComponent } from './download-manager/download-manager.component';
import { DownloadJobCardComponent } from './download-job-card/download-job-card.component';
import { DownloadManagerService } from './download-manager/download-manager.service';
import { FileMappingListComponent } from './download-job-card/file-mapping-list/file-mapping-list.component';
import { VideoProcessManagerComponent } from './video-process-manager/video-process-manager.component';
import { VideoProcessManagerService } from './video-process-manager/video-process-manager.service';
import { VideoProcessJobCardComponent } from './video-process-job-card/video-process-job-card.component';
import { NgxGraphModule } from '@swimlane/ngx-graph';
import { ActionEditorComponent } from './bangumi-detail/video-processs-rule/action-editor/action-editor.component';
import { VideoProcessJobDetailComponent } from './video-process-job-detail/video-process-job-detail.component';
import { VertexGraphComponent } from './video-process-job-detail/vertex-graph/vertex-graph.component';
import { StreamLogViewerComponent } from './video-process-job-detail/stream-log-viewer/stream-log-viewer.component';
import { VertexInfoPanelComponent } from './video-process-job-detail/vertex-info-panel/vertex-info-panel.component';
import { DownloadJobDetailComponent } from './download-manager/download-job-detail/download-job-detail.component';
import { DownloadEditorComponent } from './bangumi-detail/universal-builder/download-editor/download-editor.component';


@NgModule({
    declarations: [
        Admin,
        SearchBangumi,
        ResultDetail,
        ListBangumi,
        BangumiDetail,
        EpisodeDetail,
        AdminNavbar,
        BangumiCard,
        BangumiTypeNamePipe,
        BangumiStatusNamePipe,
        LibykPipe,
        NyaaPipe,
        ParseJsonPipe,
        BangumiBasic,
        VideoFileStatusNamePipe,
        TaskManager,
        UserManager,
        UserPromoteModal,
        VideoFileModal,
        AnnounceComponent,
        EditAnnounceComponent,
        EditBangumiRecommendComponent,
        UniversalBuilderComponent,
        VideoProcessRuleComponent,
        VideoProcessRuleEditorComponent,
        VideoProcessRuleItemComponent,
        ActionTypePipe,
        ProfileTypePipe,
        DownloadManagerComponent,
        DownloadJobCardComponent,
        FileMappingListComponent,
        VideoProcessManagerComponent,
        VideoProcessJobCardComponent,
        ActionEditorComponent,
        VideoProcessJobDetailComponent,
        VertexGraphComponent,
        StreamLogViewerComponent,
        VertexInfoPanelComponent,
        DownloadJobDetailComponent,
        DownloadEditorComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule.forChild(adminRoutes),
        UIModule,
        ConfirmDialogModule,
        DenebCommonPipes,
        UserServiceModule,
        DpDatePickerModule,
        NgxGraphModule
    ],
    providers: [
        AdminService,
        FeedService,
        TaskService,
        UserManagerSerivce,
        AnnounceService,
        ListBangumiService,
        VideoProcessRuleService,
        DownloadManagerService,
        VideoProcessManagerService,
        provideHttpClient(withInterceptorsFromDi()),
        {provide: SRC_GENERATOR_SERVICE, useClass: ResponsiveGenerateSrcService}
    ],
})
export class AdminModule {
}
