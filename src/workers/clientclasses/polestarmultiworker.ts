import { IDefaultGlobal } from "../../context/globalcontext";
import { PlayerCrew } from "../../model/player";
import { IMultiWorkerConfig, IMultiWorkerStatus, IMutualPolestarInternalWorkerConfig, IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem, IPolestarCrew } from "../../model/worker";
import { makeCompact } from "../../utils/crewutils";
import { getComboCount, getComboCountBig } from "../../utils/misc";
import { MultiWorkerBase } from "./multiworkerbase";

export class PolestarMultiWorker extends MultiWorkerBase<IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem> {
    protected createWorker(): Worker {
        return new Worker(new URL('../polestar-worker.js', import.meta.url))
    }

    private context: IDefaultGlobal;

    constructor(globalContext: IDefaultGlobal, callback: (progress: IMultiWorkerStatus<IMutualPolestarWorkerItem>) => void) {
        super('../../workers/polestar-worker.js', callback);
        this.context = globalContext;
    }

    protected getRunConfig(options: IMultiWorkerConfig<IMutualPolestarWorkerConfig, IMutualPolestarWorkerItem>): IMutualPolestarWorkerConfig {
        const allCrew = this.context.core.crew;
        const ownedCrew = this.context.player.playerData?.player.character.crew;
        const { polestars, comboSize, batch, allowUnowned, no100 } = options.config;

        if (!ownedCrew) throw new Error("No player data");

		let eligibleCrew = ownedCrew.filter(f =>
            f.rarity < f.max_rarity && f.in_portal
            && f.rarity === f.highest_owned_rarity
            && (!no100 || !f.unique_polestar_combos?.length)).map(c => makeCompact(c, ['ship_battle', 'base_skills', 'skills', 'equipment']) as IPolestarCrew);

        eligibleCrew = eligibleCrew.filter((f, idx) => eligibleCrew.findIndex(f2 => f2.symbol === f.symbol) === idx);

		let exclude = allCrew.filter(f => !eligibleCrew.some(c => c.symbol === f.symbol)).map(m => m.symbol);
		let include = allCrew.filter(f => !exclude.some(c => c === f.symbol)).map(m => m.symbol);
        let unowned = exclude.filter(f => {
            let acf = allCrew.find(acf => acf.symbol === f);
            if (no100 && acf?.unique_polestar_combos?.length) return false;
            return !ownedCrew.some(oc => oc.symbol === f) && acf?.in_portal;
        });

        const copycrew = this.context.core.crew.map(crew => makeCompact(crew as PlayerCrew, ['ship_battle', 'base_skills', 'skills', 'equipment']) as IPolestarCrew)
        let c = copycrew.length;
        for (let i = 0; i < c; i++) {
            let crew = copycrew[i];
            if (unowned.includes(crew.symbol)) {
                crew.disposition = 'unowned';
            }
            else if (include.includes(crew.symbol)) {
                crew.disposition = 'include';
                let fcrew = eligibleCrew.find(f => f.symbol === crew.symbol);
                if (fcrew) {
                    crew = { ...crew, ...fcrew };
                }
            }
            else {
                crew.disposition = 'exclude';
            }
            copycrew[i] = crew;
        }

		const rarityBucket = {} as { [key: string]: string[] };
		const skillBucket = {} as { [key: string]: string[] };
		const traitBucket = {} as { [key: string]: string[] };

		copycrew.forEach((crew) => {
			crew.traits?.forEach((trait) => {
				if (polestars.some(p => (p.owned || options.config.considerUnowned) && p.symbol === `${trait}_keystone`)) {
					traitBucket[trait] ??= [];
					traitBucket[trait].push(crew.symbol);
				}
			});

            if (polestars.some(p => (p.owned || options.config.considerUnowned) && p.symbol === `rarity_${crew.max_rarity}_keystone`)) {
                rarityBucket[crew.max_rarity] ??= [];
                rarityBucket[crew.max_rarity].push(crew.symbol);
            }

            crew.skill_order.forEach((skill) => {
                if (polestars.some(p => (p.owned || options.config.considerUnowned) && p.symbol === `${skill}_keystone`)) {
                    skillBucket[`${skill}`] ??= [];
                    skillBucket[`${skill}`].push(crew.symbol);
                }
            });
		});

		const allTraits = Object.keys(skillBucket).concat(Object.keys(rarityBucket)).concat(Object.keys(traitBucket));

        let wcn = BigInt(allTraits.length);
        let bsn = BigInt(options.config.comboSize);
        let total = getComboCountBig(wcn, bsn);
        if (options.config.max_iterations && options.config.max_iterations < total) {
            total = options.config.max_iterations;
        }

        return {
            include,
            exclude,
            allTraits,
            polestars,
            comboSize,
            batch,
            crew: copycrew,
            max_iterations: total,
            allowUnowned,
            unowned
        } as any
    }

}