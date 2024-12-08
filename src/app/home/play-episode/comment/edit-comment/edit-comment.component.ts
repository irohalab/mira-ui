import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ChromeExtensionService } from '../../../../browser-extension/chrome-extension.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DARK_THEME, DarkThemeService, UIToast, UIToastComponent, UIToastRef } from '@irohalab/deneb-ui';
import { Subscription } from 'rxjs';

@Component({
    selector: 'bangumi-edit-comment',
    templateUrl: './edit-comment.html',
    styleUrls: ['./edit-comment.less'],
    standalone: false
})
export class EditCommentComponent implements OnInit, OnDestroy {
    private _subscription = new Subscription();
    private _toastRef: UIToastRef<UIToastComponent>;
    private _formhash: string;

    @Input()
    postId: string;

    @Input()
    bgmEpsId: number;

    @Input()
    avatar: string;

    @Output()
    commentUpdate = new EventEmitter<any>();

    @Output()
    cancel = new EventEmitter<string>();

    isLoading = true;
    editCommentForm: FormGroup;
    isDarkTheme: boolean;

    constructor(private _chromeExtensionService: ChromeExtensionService,
                private _darkThemeService: DarkThemeService,
                private _fb: FormBuilder,
                toast: UIToast) {
        this._toastRef = toast.makeText();
    }

    preventSubmit(event: Event) {
        event.stopPropagation();
        event.preventDefault();
    }

    updateComment() {
        if (this.editCommentForm.invalid) {
            return;
        }
        let content = this.editCommentForm.value.content;
        this._subscription.add(
            this._chromeExtensionService.invokeBangumiWebMethod('editComment', [this.postId, content, this._formhash, this.bgmEpsId])
                .subscribe(() => {
                    this.commentUpdate.emit(this.postId);
                })
        );
    }

    cancelEdit() {
        this.cancel.emit(this.postId);
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME;})
        );
        this.editCommentForm = this._fb.group({
            content: ['', Validators.required]
        });
        this._subscription.add(
            this._chromeExtensionService.invokeBangumiWebMethod('getEditComment', [this.postId, this.bgmEpsId])
                .subscribe((result: any) => {
                    this.editCommentForm.patchValue({content: result.content});
                    this._formhash = result.formhash;
                    this.isLoading = false;
                }, () => {
                    this.isLoading = false;
                    this._toastRef.show('无法编辑评论');
                    this.cancel.emit(this.postId);
                })
        );
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
