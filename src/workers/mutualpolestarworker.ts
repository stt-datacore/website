import { PolestarWorkerResults } from "../components/retrieval/polestarmultiworker";
import { IMutualPolestarInternalWorkerConfig, IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem, IPolestarCrew, PolestarComboSize } from "../model/worker";
import { getComboCountBig, getPermutations } from "../utils/misc";
import { calculateRetrievalCost } from "../utils/retrieval";

type ProgressType = { percent?: number, progress?: bigint, count?: bigint, accepted?: bigint, format?: string, options?: any, result?: IMutualPolestarWorkerItem };

const MutualPolestarWorker = {
    calc: (options: IMutualPolestarInternalWorkerConfig, reportProgress: (data: ProgressType) => boolean = () => true) => {
        return new Promise<PolestarWorkerResults>(async (resolve, reject) => {
            const { crew, comboSize, allPolestars, max_iterations } = options;
            const allowUnowned = options.allowUnowned ?? 0;

            let wcn = BigInt(allPolestars.length);
            let bsn = BigInt(comboSize);
            let total_combos = getComboCountBig(wcn, bsn);
            let count = max_iterations || total_combos; //crew_combos.length;

            const starttime = new Date();
            let start_index = (options.start_index ?? 0n);
            let i = 0n;
            let progress = -1n;
            const combos = [] as IMutualPolestarWorkerItem[];

            getPermutations(allPolestars, comboSize, count, true, start_index, (combo) => {
                i++;
                if (!(i % 100n)) {
                    let p = ((i * 100n) / count);

                    if (p !== progress) {
                        progress = p;

                        reportProgress({
                            percent: Number(p.toString()),
                            progress: i,
                            count: count,
                            accepted: BigInt(combos.length)
                        });
                    }
                }

                let rarity = 0;
                let fcrew = crew;
                const skills = combo.filter(f => f.endsWith("_skill"));
                const rarities = combo.filter(f => ['1', '2', '3', '4', '5'].includes(f));
                const traits = combo.filter(f => !skills.includes(f) && !rarities.includes(f));

                if (rarities.length > 1) return false;
                if (skills.length > 3) return false;

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

                const owned = [] as string[];
                const unowned = [] as string[];

                const c = fcrew.length;

                for (let i = 0; i < c; i++) {
                    let cr = fcrew[i];
                    if (cr.disposition === 'exclude') {
                        return false;
                    }
                    else if (cr.disposition === 'unowned') {
                        if (unowned.length >= allowUnowned) return false;
                        unowned.push(cr.symbol);
                    }
                    else if (cr.disposition === 'include') {
                        owned.push(cr.symbol);
                    }
                    else {
                        return false;
                    }
                }

                if (owned.length + unowned.length > 1) {
                    const result = {
                        combo,
                        crew: unowned.concat(owned),
                        cost: {} as any
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