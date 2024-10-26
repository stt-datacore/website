import { MutualPolestarResults } from "../components/retrieval/mutualmultiworker";
import { IMutualPolestarInternalWorkerConfig, IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem, PolestarComboSize } from "../model/worker";

function factorial(number: bigint) {
    let result = 1n;

    for (let i = 1n; i <= number; i++) {
        result *= i;
    }
    return result;
}

export function getPermutations<T, U>(array: T[], size: number, count?: bigint, count_only?: boolean, start_idx?: bigint, check?: (set: T[]) => U[] | false) {
    var current_iter = 0n;
    const mmin = start_idx ?? 0n;
    const mmax = (count ?? 0n) + mmin;
    function p(t: T[], i: number) {
        if (t.length === size) {
            if (current_iter >= mmin && (!mmax || current_iter < mmax)) {
                if (!check) {
                    result.push(t as any);
                }
                else {
                    let response = check(t);
                    if (response) {
                        if (!count_only) {
                            result.push(response);
                        }
                    }
                }
            }
            current_iter++;
            return;
        }
        if (i + 1 > array.length) {
            return;
        }

        if (mmax !== 0n && current_iter >= mmax) return;
        p([ ...t, array[i] ], i + 1);
        p(t, i + 1);
    }

    var result = [] as U[][];

    p([], 0);
    return result;
}

const MutualPolestarWorker = {
    calc: (options: IMutualPolestarInternalWorkerConfig, reportProgress: (data: { percent?: number, progress?: bigint, count?: bigint, accepted?: bigint, format?: string, options?: any, result?: IMutualPolestarWorkerItem }) => boolean = () => true) => {
        return new Promise<MutualPolestarResults>(async (resolve, reject) => {
            const { status_data_only, verbose, unowned, exclude, include, comboSize, allTraits, max_iterations, traitBucket } = options;
            const allowUnowned = options.allowUnowned ?? 0;

            let wcn = BigInt(allTraits.length);
            let bsn = BigInt(comboSize);
            let total_combos = factorial(wcn) / (factorial(wcn - bsn) * factorial(bsn));
            let count = max_iterations || total_combos; //crew_combos.length;

            const starttime = new Date();
            let start_index = (options.start_index ?? 0n);
            let i = 0n;
            let progress = -1n;
            const mex = {} as { [key: string]: boolean };
            const minc = {} as { [key: string]: boolean };
            const nono = {} as { [key: string]: boolean };
            const combos = [] as IMutualPolestarWorkerItem[];

            include.forEach((c) => minc[c] = true);
            exclude.forEach((c) => mex[c] = true);
            unowned?.forEach((c) => nono[c] = true);

            getPermutations(allTraits, comboSize, count, true, start_index, (combo) => {
                i++;
                if (!(i % 100n)) {
                    let p = ((i * 100n) / count);

                    if (p !== progress) {
                        progress = p;

                        if (status_data_only) {
                            reportProgress({
                                    percent: Number(p.toString()),
                                    progress: i,
                                    count: count,
                                    accepted: BigInt(combos.length)
                                });
                        }
                        else {
                            if (!verbose) {
                                reportProgress({ format: 'ship.calc.calculating_pct_ellipses', options: { percent: `${p}` } });
                            }
                            else {
                                reportProgress({ format: 'ship.calc.calculating_pct_ellipses_verbose',
                                    options: {
                                        percent: `${p}`,
                                        progress: `${i.toLocaleString()}`,
                                        count: `${count.toLocaleString()}`,
                                        accepted: `${combos.length.toLocaleString()}`
                                    }
                                });
                            }
                        }
                    }
                }

                if (include.length < 2) return false;

                let traitcrew = combo.map(cb => traitBucket[cb]);
                let crewcounts = {} as any;

                traitcrew.map((tca) => tca.map(tc => {
                    crewcounts[tc] ??= 0;
                    crewcounts[tc]++;
                }));

                let owned = [] as string[];
                let immortal = [] as string[];
                let unowned = [] as string[];

                Object.keys(crewcounts).forEach((f) => {
                    if (minc[f] && crewcounts[f] === comboSize) {
                        owned.push(f);
                    }
                    else if (nono[f] && crewcounts[f] === comboSize) {
                        unowned.push(f);
                    }
                    else if (mex[f] && crewcounts[f] === comboSize) {
                        immortal.push(f);
                    }
                });

                if (owned.length > 0 && immortal.length === 0 && unowned.length <= allowUnowned) {
                    if (owned.length > 1 || unowned.length) {
                        combos.push({
                            combo,
                            crew: owned.concat(unowned)
                        });
                        reportProgress({ result: combos[combos.length - 1] });
                    }
                }
                return combo;
            });

            const endtime = new Date();
            const run_time = Math.round((endtime.getTime() - starttime.getTime()) / 1000);

            resolve({
                items: combos,
                total_iterations: i,
                run_time
            });

        });
    }
}

export default MutualPolestarWorker;