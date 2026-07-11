import { Pipe, PipeTransform } from '@angular/core';
import { Message } from '../entity/Message';
import { MessageContentType } from '../entity/MessageContentType';

/**
 * Resolves the displayable content of a Message according to its contentType.
 *
 * mode = 'html' (default): returns an HTML string suitable for binding with [innerHTML].
 * mode = 'text': returns a plain-text preview with all HTML tags stripped, suitable
 *                for single-line snippets.
 */
@Pipe({ name: 'messageContent' })
export class MessageContentPipe implements PipeTransform {

    transform(message: Message | null | undefined, mode: 'html' | 'text' = 'html'): string {
        if (!message) {
            return '';
        }
        const html = this.resolveHtml(message);
        if (mode === 'text') {
            return this.toPlainText(html);
        }
        return html;
    }

    private resolveHtml(message: Message): string {
        switch (message.contentType) {
            case MessageContentType.Markdown:
                return message.renderedContent || message.content || '';
            case MessageContentType.Html:
                return message.content || '';
            case MessageContentType.Text:
            default:
                return this.escapeText(message.content || '');
        }
    }

    private escapeText(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private toPlainText(html: string): string {
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || '').replace(/\s+/g, ' ').trim();
    }
}
