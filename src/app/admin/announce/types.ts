
export interface ValidateMessageDict {
    sortOrder: {required: string};
    content?: {required: string};
    imageUrl?: {required: string};
    startTime: {required: string};
    endTime: {required: string};
    dateRange?: {[key: string]: string}
}

export interface ErrorMessageDict {
    sortOrder: string[];
    content?: string[];
    imageUrl: string[];
    startTime: string[];
    endTime: string[];
}
