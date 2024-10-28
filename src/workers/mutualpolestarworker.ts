import { MutualPolestarResults } from "../components/retrieval/mutualmultiworker";
import { IMutualPolestarInternalWorkerConfig, IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem, IPolestarCrew, PolestarComboSize } from "../model/worker";

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
type ProgressType = { percent?: number, progress?: bigint, count?: bigint, accepted?: bigint, format?: string, options?: any, result?: IMutualPolestarWorkerItem };

const MutualPolestarWorker = {
    calc: (options: IMutualPolestarInternalWorkerConfig, reportProgress: (data: ProgressType) => boolean = () => true) => {
        return new Promise<MutualPolestarResults>(async (resolve, reject) => {
            const { status_data_only, crew, verbose, unowned, exclude, include, comboSize, allTraits, max_iterations } = options;
            const allowUnowned = options.allowUnowned ?? 0;

            let wcn = BigInt(allTraits.length);
            let bsn = BigInt(comboSize);
            let total_combos = factorial(wcn) / (factorial(wcn - bsn) * factorial(bsn));
            let count = max_iterations || total_combos; //crew_combos.length;

            const starttime = new Date();
            let start_index = (options.start_index ?? 0n);
            let i = 0n;
            let progress = -1n;
            const combos = [] as IMutualPolestarWorkerItem[];

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

                let rarity = 0;
                let fcrew = crew;
                let skills = combo.filter(f => f.endsWith("_skill"));
                let rarities = combo.filter(f => ['1', '2', '3', '4', '5'].includes(f));
                let traits = combo.filter(f => !skills.includes(f) && !rarities.includes(f));

                if (rarities.length > 1) return false;
                if (skills.length > 3) return false;
                // fcrew = fcrew.filter((f) => {
                //     if (rarity && f.max_rarity !== rarity) return false;
                //     if (skills.length && !skills.every(sk => f.skill_order.includes(sk))) return false;
                //     if (traits.length && !traits.every(tr => f.traits?.includes(tr))) return false;
                //     return true;
                // })

                if (rarities.length) {
                    rarity = Number(rarities[0]);
                    fcrew = fcrew.filter(f => f.max_rarity === rarity);
                    if (!fcrew.length) return false;
                }

                if (skills.length) {
                    fcrew = fcrew.filter(f => skills.every(sk => f.skill_order.includes(sk)));
                    if (!fcrew.length) return false;
                }

                if (traits.length) {
                    fcrew = fcrew.filter(f => traits.every(tr => f.traits?.includes(tr)));
                    if (!fcrew.length) return false;
                }

                if (!fcrew.length) return false;

                let owned = [] as string[];
                let unowned = [] as string[];

                for (let c of fcrew) {
                    if (c.disposition === 'exclude') {
                        return false;
                    }
                    else if (c.disposition === 'unowned') {
                        if (unowned.length >= allowUnowned) return false;
                        unowned.push(c.symbol);
                    }
                    else if (c.disposition === 'include') {
                        owned.push(c.symbol);
                    }
                    else {
                        return false;
                    }
                }

                if (owned.length + unowned.length > 1) {
                    let result = {
                        combo,
                        crew: unowned.concat(owned)
                    };
                    combos.push(result);
                    reportProgress({ result });
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