import { MutualPolestarResults } from "../components/retrieval/mutualmultiworker";
import { IMutualPolestarInternalWorkerConfig, IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem } from "../model/worker";

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
            const { exclude, include, polestars, comboSize, allTraits, max_iterations, max_results, traitBucket } = options;
            let wcn = BigInt(allTraits.length);
            let bsn = BigInt(comboSize);
            let total_combos = factorial(wcn) / (factorial(wcn - bsn) * factorial(bsn));
            const starttime = new Date();
            let count = max_iterations || total_combos; //crew_combos.length;
            let start_index = (options.start_index ?? 0n);
            let i = 0n;
            let progress = -1n;
            const mex = {} as { [key: string]: boolean };
            const minc = {} as { [key: string]: boolean };
            const combos = [] as IMutualPolestarWorkerItem[];
            include.forEach((c) => minc[c] = true);
            exclude.forEach((c) => mex[c] = true);

            getPermutations(allTraits, comboSize, count, true, start_index, (combo) => {
                i++;
				if (include.length < 2) return false;

				let traitcrew = combo.map(cb => traitBucket[cb]);
				let crewcounts = {} as any;

				traitcrew.map((tca) => tca.map(tc => {
					crewcounts[tc] ??= 0;
					crewcounts[tc]++;
				}))

				let crew = [] as string[];
				let crewB = [] as string[]

				Object.keys(crewcounts).forEach((f) => {
					if (minc[f] && crewcounts[f] === i) {
						crew.push(f);
					}
					else if (mex[f] && crewcounts[f] === i) {
						crewB.push(f);
					}
				})

				if (crew.length > 1 && crewB.length === 0) {
					combos.push({
						combo,
						crew
					});

					console.log(combos[combos.length - 1]);
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