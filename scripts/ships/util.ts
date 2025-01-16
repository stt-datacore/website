

export function makeBuckets<T>(items: T[], size: number) {
    const itembuckets = [[]] as T[][];
    let cb = 0;
    let n = 0;
    for (let item of items) {
        itembuckets[cb].push(item);
        n++;
        if (n >= size) {
            n = 0;
            cb++;
            itembuckets.push([]);
        }
    }

    return itembuckets;
}