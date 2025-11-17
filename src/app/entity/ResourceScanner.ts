export interface ResourceScanner {
    id: string;
    feed: string;
    criteria: string;
    /* not field for data, only used for editor */
    enableRegex: boolean;
    /* to find episode number from the result, if omitted, system default will be used */
    matchRegex?: string;
    /* offset of the episode.sort - resource episode number*/
    offset?: number;
}
