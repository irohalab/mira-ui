import {
    AfterViewInit,
    Component,
    ElementRef, HostBinding,
    Input, OnChanges,
    OnDestroy,
    OnInit, SimpleChanges,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, Subscription, merge } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import { ChromeExtensionService, IAuthInfo } from '../../../browser-extension/chrome-extension.service';
import { PersistStorage } from '../../../user-service';
import { DARK_THEME, DarkThemeService, UIResponsiveService } from '@irohalab/deneb-ui';

export interface PostUser {
    uid: string;
    username: string;
    url: string;
    avatar?: string;
    name: string;
    signature?: string;
}

export interface ReplyParameter {
    topic_id: string;
    post_id: string;
    sub_reply_id: string;
    sub_reply_uid: string;
    post_uid: string;
    sub_post_type: string;
}

export interface Quote {
    author: string;
    content: any;
}

export interface Post {
    id: string;
    date: number;
    author: PostUser;
    content: any;
    quote: Quote;
    subPosts: Post[];
    replyParameter?: ReplyParameter;
    is_self?: boolean;

    formOpen: boolean // ui property, not related to data
    isEditing: boolean // ui property
    [idx: string]: any;
}

export const COMMENT_SORT_ORDER = 'comment_sort_order';

@Component({
    selector: 'bangumi-comment',
    templateUrl: './comment.html',
    styleUrls: ['./comment.less'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class CommentComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
    private _subscription = new Subscription();
    private _isVisible = new BehaviorSubject<boolean>(false);

    @Input()
    bgmEpsId: number;

    posts: Post[];

    sort: string;

    // for bgm to valid post data
    lastview: string;
    formhash: string;

    newCommentForm: FormGroup;

    authInfo: IAuthInfo;

    rootFormOpen = false;

    isLoading = true;

    @HostBinding('class.dark-theme')
    isDarkTheme: boolean;

    get isVisible(): Observable<boolean> {
        return this._isVisible.asObservable();
    }

    @ViewChild('headDivider', {static: false}) headDividerRef: ElementRef;

    constructor(private _chromeExtensionService: ChromeExtensionService,
                private _persistStorage: PersistStorage,
                private _darkThemeService: DarkThemeService,
                private _responsiveService: UIResponsiveService) {
        this.sort = this._persistStorage.getItem(COMMENT_SORT_ORDER, null);
        if (!this.sort) {
            this.sort = 'desc';
            this._persistStorage.setItem(COMMENT_SORT_ORDER, this.sort);
        }
    }

    onOrderChange(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.sort === 'desc') {
            this.sort = 'asc';
        } else {
            this.sort = 'desc';
        }
        this._persistStorage.setItem(COMMENT_SORT_ORDER, this.sort);
        this.sortCommentList();
    }

    addComment(post: Post) {
        post.formOpen = true;
    }

    editComment(post: Post) {
        post.isEditing = true;
    }

    openRootForm() {
        this.rootFormOpen = true;
    }

    deleteComment(post: Post) {
        this._subscription.add(
            this._chromeExtensionService.invokeBangumiWebMethod('deleteComment', [post.id, this.formhash, this.bgmEpsId])
                .subscribe(() => {
                    for (let i = 0; i < this.posts.length; i++) {
                        if (post === this.posts[i]){
                            this.posts.splice(i, 1);
                            return;
                        }
                        if (this.posts[i].subPosts && this.posts[i].subPosts.length > 0) {
                            for (let j = 0; j < this.posts[i].subPosts.length; j++) {
                                if (post === this.posts[i].subPosts[j]) {
                                    this.posts[i].subPosts.splice(j, 1);
                                    return;
                                }
                            }
                        }
                    }
                })
        );
    }

    onCommentSent(result: any) {
        if (result === null) {
            this.rootFormOpen = false;
            // sometimes, bangumi return nothing. in this situation, we just refresh comment list.
            this.freshCommentList();
            return;
        }
        if (result.type === 'main') {
            this.rootFormOpen = false;
            if (this.sort === 'desc') {
                this.posts.unshift(result.posts[0]);
            } else {
                this.posts.push(result.posts[0]);
            }
        } else {
            let p = this.posts.find((post) => post.id === result.id);
            if (!p.subPosts) {
                p.subPosts = [];
            }
            p.subPosts = p.subPosts.concat(result.posts.filter((post: Post) => {
                for (let i = 0; i < p.subPosts.length; i++) {
                    if (p.subPosts[i].id === post.id) {
                        // filter out duplicated post
                        return false;
                    }
                }
                return true;
            })).sort((p1, p2) => {
                return this.sort === 'desc' ? p2.date - p1.date: p1.date - p2.date;
            });
        }
        if (result.replyPost) {
            result.replyPost.formOpen = false;
        }
        // this.updatePostProperty(result.id, 'formOpen', false);
    }

    onCommentUpdate() {
        this.freshCommentList();
    }

    onCommentEditCancel(postId: string): void {
        this.updatePostProperty(postId, 'isEditing', false);
    }

    onCommentCancel(postId: string): void {
        console.log(postId);
        if (postId) {
            this.updatePostProperty(postId, 'formOpen', false);
        } else {
            this.rootFormOpen = false;
        }
    }

    private freshCommentList() {
        this.isLoading = true;
        this._subscription.add(
            this._chromeExtensionService.invokeBangumiWebMethod('getCommentForEpisode', [this.bgmEpsId])
                .subscribe((result: any) => {
                    this.posts = result.posts;
                    this.sortCommentList();
                    this.isLoading = false;
                    if (result.newComment) {
                        this.lastview = result.newComment.lastview;
                        this.formhash = result.newComment.formhash;
                    }
                }, () => {
                    this.isLoading = false;
                })
        );
    }

    private sortCommentList() {
        this.posts = this.posts.sort((p1, p2) => {
            return this.sort === 'desc' ? p2.date - p1.date: p1.date - p2.date;
        });

        this.posts.forEach((post) => {
            if (Array.isArray(post.subPosts) && post.subPosts.length > 0) {
                post.subPosts = post.subPosts.sort((p1, p2) => {
                    return this.sort === 'desc' ? p2.date - p1.date: p1.date - p2.date;
                });
            }
        });
    }

    private updatePostProperty(postId: string, property: string, value: any) {
        for(let i = 0; i < this.posts.length; i++) {
            let post = this.posts[i];
            if (post.id === postId) {
                post[property] = value;
                return;
            }
            if (post.subPosts && post.subPosts.length > 0) {
                for (let j = 0; j < post.subPosts.length; j++) {
                    let subPost = post.subPosts[j];
                    if (subPost.id === postId) {
                        subPost[property] = value;
                        return;
                    }
                }
            }
        }
    }

    ngOnInit(): void {
        this._subscription.add(
            this._darkThemeService.themeChange
                .subscribe(theme => {this.isDarkTheme = theme === DARK_THEME;})
        );
        this._subscription.add(
            this.isVisible.pipe(
                filter(visible => visible),
                filter(() => {
                    return !!this.bgmEpsId;
                }),
                mergeMap(() => {
                    return this._chromeExtensionService.authInfo;
                }),)
                .subscribe((authInfo) => {
                    this.authInfo = authInfo as IAuthInfo;
                    console.log('bgmId', this.bgmEpsId);
                    this.freshCommentList();
                })
        );
    }

    ngAfterViewInit(): void {
        this._responsiveService.observe({
            target: this.headDividerRef.nativeElement,
            callback: (rect) => {
                this._isVisible.next(true);
            },
            unobserveOnVisible: true
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('bgmEpsId' in changes
            && changes['bgmEpsId'].currentValue
            && changes['bgmEpsId'].previousValue
            && !this.isLoading) {
            this.freshCommentList();
        }
    }

    ngOnDestroy(): void {
        this._subscription.unsubscribe();
    }
}
