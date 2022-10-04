/**
 * some code get from query-string
 */

export function queryString(obj: any): string {
    let formatter = function (key: string, value: string): string {
        return value === null ? encodeURIComponent(key) : [
            encodeURIComponent(key),
            '=',
            encodeURIComponent(value)
        ].join('');
    };

    return obj ? Object.keys(obj).sort().map(function (key) {
        let val = obj[key];

        if (val === undefined) {
            return '';
        }

        if (val === null) {
            return encodeURIComponent(key);
        }

        if (Array.isArray(val)) {
            let result: string[] = [];

            val.slice().forEach(function (val2) {
                if (val2 === undefined) {
                    return;
                }

                result.push(formatter(key, val2));
            });

            return result.join('&');
        }

        return encodeURIComponent(key) + '=' + encodeURIComponent(val);
    }).filter(function (x) {
        return x.length > 0;
    }).join('&') : '';
}
