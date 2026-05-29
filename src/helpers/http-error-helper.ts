import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
        return error.message;
    } else {
        const serverResponse = error.error as {message: string};
        if (serverResponse) {
            return serverResponse.message;
        } else {
            return error.message ?? 'Unknown error';
        }
    }
}
