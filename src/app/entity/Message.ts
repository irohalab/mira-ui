import { ThreadType } from './ThreadType';
import { Account } from './Account';
import { MessageContentType } from './MessageContentType';

export class Message {
    id!: string;
    threadId?: string;
    threadTitle?: string;
    threadType!: ThreadType;
    content!: string;
    contentType!: MessageContentType;
    read!: boolean;
    renderedContent!: string;
    createdTime!: string;
    updatedTime!: string;
    recipient!: Account;
    sender!: Account;

    // only used for UI interaction
    expand!: boolean;
}
