export function copyTextToClipboard(text: string): Promise<void> {
    // async clipboard api only available in secure context (https)
    if (navigator.clipboard) {
        return navigator.clipboard.writeText(text);
    }
    const span = document.createElement('span');
    span.textContent = text;
    span.style.whiteSpace = 'pre';
    span.style.userSelect = 'auto';

    document.body.appendChild(span);

    copyElementValueToClipboard(span);
    window.document.body.removeChild(span);
    return Promise.resolve(undefined);
}

export function copyElementValueToClipboard(element: HTMLElement): void {
    const selection = window.getSelection();
    const range = window.document.createRange();
    selection.removeAllRanges();
    range.selectNode(element);
    selection.addRange(range);

    try {
        window.document.execCommand('copy');
    } finally {
        selection.removeAllRanges();
    }
}
