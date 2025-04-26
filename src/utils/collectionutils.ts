import { RewardsGridNeed } from "../model/crew";
import { CollectionFilterOptions, CollectionInfo, CollectionCombo, CollectionsToolSettings, ComboCostMap } from "../model/collectionfilter";
import { BuffBase, Milestone, MilestoneBuff, PlayerCollection, PlayerCrew, Reward } from "../model/player";
import { getCollectionRewards, getMilestoneRewards } from "./itemutils";
import { Collection } from "../model/game-elements";



export function getFilteredMilestoneRewards(milestone: Milestone, filters: string[]) {
    let result = [] as BuffBase[];
    for (let rewardFilter of filters) {
        let q = true;
        if (rewardFilter && rewardFilter != '*any') {
            let re: RegExp;
            if (rewardFilter == '*buffs') {
                if (milestone?.buffs?.length == 0) q = false;
                for (let b of milestone?.buffs ?? []) {
                    result.push(b);
                }
            }
            else if (rewardFilter.slice(0, 1) == '=') {
                re = new RegExp(rewardFilter.slice(1));
                result = result.concat(milestone.rewards?.filter(reward => reward.symbol && re.test(reward.symbol)) ?? []);
            }
            else {
                result = result.concat(milestone.rewards?.filter(reward => reward.symbol == rewardFilter) ?? []);
            }
        }
    }
    for (let reward of result) {
        reward.data = {
            collection: null,
            goal: milestone.goal
        }
    }
    return result;
}


export function checkMilestoneRewardFilter(milestone: Milestone, filters: string[]) {
    let result = false;

    for (let rewardFilter of filters) {
        let q = true;

        if (rewardFilter && rewardFilter != '*any') {
            let re: RegExp;
            if (rewardFilter == '*buffs') {
                if (milestone?.buffs?.length == 0) q = false;
            }
            else if (rewardFilter.slice(0, 1) == '=') {
                re = new RegExp(rewardFilter.slice(1));
                if (!milestone.rewards?.find(reward => reward.symbol && re.test(reward.symbol))) q = false;
            }
            else if (!milestone.rewards?.find(reward => reward.symbol == rewardFilter)) {
                q = false;
            }
        }
        result ||= q;
    }

    return result;
}

export function checkRewardFilter(collection: PlayerCollection, filters: string[]) {
    return checkMilestoneRewardFilter(collection.milestone, filters);
}

export function compareRewards(mapFilter: CollectionFilterOptions, colGroup1: PlayerCollection[], colGroup2: PlayerCollection[], short?: boolean): number {
    if (!mapFilter?.rewardFilter) return 0;

    let ayes = 0;
    let byes = 0;

    if (short) {
        for (let col1 of colGroup1) {
            if (!col1) continue;
            ayes += checkRewardFilter(col1, mapFilter.rewardFilter) ? 1 : 0;
        }

        for (let col2 of colGroup2) {
            if (!col2) continue;
            byes += checkRewardFilter(col2, mapFilter.rewardFilter) ? 1 : 0;
        }
    }
    else {
        let afilter = getCollectionRewards(colGroup1)?.filter(r => mapFilter.rewardFilter?.includes(r.symbol ?? ''));
        let bfilter = getCollectionRewards(colGroup2)?.filter(r => mapFilter.rewardFilter?.includes(r.symbol ?? ''));

        ayes = afilter?.length ?? 0;
        byes = bfilter?.length ?? 0;
    }

    let r = byes - ayes;
    return r;
}

export function rewardsFilterPassFail(mapFilter: CollectionFilterOptions, colGroup: PlayerCollection[], short?: boolean, milestones?: boolean): boolean {
    if (!mapFilter?.rewardFilter?.length) return true;
    let ayes = 0;

    if (milestones) {
        if (short) {
            for (let col1 of colGroup) {
                if (!col1) continue;
                let milestones = milestonesFromCurrent(col1);
                for (let milestone of milestones) {
                    ayes += checkMilestoneRewardFilter(milestone, mapFilter.rewardFilter) ? 1 : 0;
                }
            }
        }
        else {
            let afilter = getMilestoneRewards(colGroup.map(col => milestonesFromCurrent(col)).flat())?.filter(r => mapFilter.rewardFilter?.includes(r.symbol ?? ''));
            ayes = afilter?.length ?? 0;
        }
    }
    else {
        if (short) {
            for (let col1 of colGroup) {
                if (!col1) continue;
                ayes += checkRewardFilter(col1, mapFilter.rewardFilter) ? 1 : 0;
            }
        }
        else {
            let afilter = getCollectionRewards(colGroup)?.filter(r => mapFilter.rewardFilter?.includes(r.symbol ?? ''));
            ayes = afilter?.length ?? 0;
        }
    }

    let r = ayes;
    return !!r;
}

export function rewardsFilterGetRewards(mapFilter: CollectionFilterOptions, colGroup: PlayerCollection[], short?: boolean, milestones?: boolean): BuffBase[] {
    if (!mapFilter?.rewardFilter?.length) return [];
    let result = [] as BuffBase[];

    if (milestones) {
        if (short) {
            for (let col1 of colGroup) {
                if (!col1) continue;
                let milestones = milestonesFromCurrent(col1);
                for (let milestone of milestones) {
                    result = result.concat(getFilteredMilestoneRewards(milestone, mapFilter.rewardFilter).map(r => {
                        r = JSON.parse(JSON.stringify(r));
                        r.data!.collection = col1.type_id!
                        return r;
                    }));
                }
            }
        }
        else {
            for (let col1 of colGroup) {
                result = result.concat(getMilestoneRewards(milestonesFromCurrent(col1))
                    .map(r => {
                        r = JSON.parse(JSON.stringify(r));
                        r.data!.collection = col1.type_id!
                        return r;
                    }))
                    .filter(r => mapFilter.rewardFilter?.includes(r.symbol ?? ''));
            }
        }
    }
    else {
        if (short) {
            for (let col1 of colGroup) {
                if (!col1) continue;
                result = result.concat(getFilteredMilestoneRewards(col1.milestone, mapFilter.rewardFilter)
                .map(r => {
                    r = JSON.parse(JSON.stringify(r));
                    r.data!.collection = col1.type_id!
                    return r;
                }));
            }
        }
        else {
            for (let col1 of colGroup) {
                let afilter = getCollectionRewards([col1])
                    .filter(r => mapFilter.rewardFilter?.includes(r.symbol ?? ''))
                    .map(r => {
                        r = JSON.parse(JSON.stringify(r));
                        r.data!.collection = col1.type_id!
                        return r;
                    });
                result = result.concat(afilter);
            }
        }
    }

    return result;
}

export const citeSymbols = ['', '', 'honorable_citation_quality2', 'honorable_citation_quality3', 'honorable_citation_quality4', 'honorable_citation_quality5'];

export interface CiteInventory {
    quantity: number,
    cost: number,
    rarity: number;
}

export const makeCiteNeeds = (item: CollectionInfo | CollectionCombo | PlayerCrew, combo?: string, inventory?: CiteInventory[]) => {
    const gridneed = [] as RewardsGridNeed[];

    if ("rarity" in item) {

        gridneed.push({
            symbol: citeSymbols[item.max_rarity],
            quantity: item.max_rarity - item.rarity
        })
        return gridneed;
    }

    if (!item.neededStars?.length) return gridneed;

    item.neededStars.forEach((star, idx) => {
        if (idx >= 2 && idx <= 5 && star) {
            let newobj = {
                symbol: citeSymbols[idx],
                quantity: star
            } as RewardsGridNeed;
            if (inventory) {
                newobj.owned = inventory[idx].quantity;
            }
            gridneed.push(newobj);
        }
    });
    return gridneed;
}

export const getOwnedCites = (items: BuffBase[], sale?: boolean) => {
    const ownedCites = [
        { quantity: 0, cost: 0, rarity: 0 },
        { quantity: 0, cost: 0, rarity: 1 },
        { quantity: 0, cost: 500, rarity: 2 },
        { quantity: 0, cost: 4500, rarity: 3 },
        { quantity: 0, cost: 18000, rarity: 4 },
        { quantity: 0, cost: !!sale ? 40000 : 50000, rarity: 5 }
    ] as CiteInventory[];

    items.forEach((item) => {
        if (item.symbol?.startsWith('honorable_citation_quality')) {
            let rare = Number.parseInt(item.symbol.slice(-1))
            ownedCites[rare].quantity += item.quantity ?? 0;
        }
    });
    //ownedCites.forEach((cite) => cite.cost *= cite.quantity);
    return ownedCites;
}


export function starCost(crew: PlayerCrew[], limit?: number, sale?: boolean) {
	const costs = [0, 0, 500, 4500, 18000, sale ? 40000 : 50000];

	limit ??= crew.length;
	let tc = 0;

	for (let c = 0; c < limit; c++) {
		let cm = crew[c];
		if (!cm) continue;
		let rdiff = cm.max_rarity - cm.rarity;
		if (!rdiff) continue;
		tc += rdiff * costs[cm.max_rarity];
	}

	return tc;
}

export function neededStars(crew: PlayerCrew[], limit?: number) {
	const costs = [0, 0, 0, 0, 0, 0];

	limit ??= crew.length;
	let tc = 0;

	for (let c = 0; c < limit; c++) {
		let cm = crew[c];
		if (!cm) continue;
		let rdiff = cm.max_rarity - cm.rarity;
		costs[cm.max_rarity] += rdiff;
	}

	return costs;
}

export const checkCommonFilter = (filters: CollectionsToolSettings, crew: PlayerCrew, exclude?: string[]) => {
    const { ownedFilter, fuseFilter, rarityFilter } = filters;

    if (!exclude?.includes('unowned') && ownedFilter === 'unowned' && (crew.highest_owned_rarity ?? 0) > 0) return false;
    if (!exclude?.includes('owned') && ownedFilter.slice(0, 5) === 'owned' && crew.highest_owned_rarity === 0) return false;
    if (!exclude?.includes('owned-threshold') && ownedFilter === 'owned-threshold' && (crew.max_rarity - (crew.highest_owned_rarity ?? crew.rarity ?? 0)) > 2) return false;
    if (!exclude?.includes('owned-impact') && ownedFilter === 'owned-impact' && (crew.max_rarity - (crew.highest_owned_rarity ?? crew.rarity ?? 0)) !== 1) return false;
    if (!exclude?.includes('owned-ff') && ownedFilter === 'owned-ff' && crew.max_rarity !== (crew.highest_owned_rarity ?? crew.rarity)) return false;
    if (!exclude?.includes('rarity') && rarityFilter.length > 0 && !rarityFilter.includes(crew.max_rarity)) return false;
    if (!exclude?.includes('portal') && fuseFilter.slice(0, 6) === 'portal' && !crew.in_portal) return false;
    if (!exclude?.includes('portal-unique') && fuseFilter === 'portal-unique' && !crew.unique_polestar_combos?.length) return false;
    if (!exclude?.includes('portal-nonunique') && fuseFilter === 'portal-nonunique' && crew.unique_polestar_combos?.length !== 0) return false;
    if (!exclude?.includes('nonportal') && fuseFilter === 'nonportal' && crew.in_portal) return false;
    return true;
}

export const findOptCombo = (col: CollectionCombo, combo: string) => {
    return col.combos?.find(cbo => cbo.names.join(" / ") === combo);
}

export const getOptCols = (col: CollectionCombo, combo?: string) => {
    if (!combo) {
        return col.maps;
    }
    else {
        let fc = findOptCombo(col, combo);
        if (fc) return fc.names.map(s => col.maps.find(cm => cm.collection.name === s.replace("* ", ''))).filter(f => f) as CollectionInfo[];
        return [];
    }
}

export const getOptCrew = (col: CollectionCombo, costMode: 'normal' | 'sale', searches?: string[], combo?: string) => {
    let crewmap: PlayerCrew[];
    let cols = getOptCols(col, combo);
    if (!combo) {
        crewmap = col.combinedUnique;
    }
    else {
        crewmap = col.combinedUnique;
        crewmap = findOptCombo(col, combo)?.crew.map(ncrew => crewmap.find(cr => cr.symbol === ncrew) as PlayerCrew) as PlayerCrew[];

        let max = cols.map(c => c.collection.needed ?? 0).reduce((p, n) => p + n, 0);
        max = col.collection.needed ?? 0;

        if (crewmap.length < max) {
            let leftover = col.combinedUnique.filter(fc => !crewmap.some(cm => cm.symbol === fc.symbol));
            crewmap = crewmap.concat(leftover.slice(0, max - crewmap.length));
        }
    }

    let needs = [ col.collection.needed ?? 0, ... cols.map(c => c.collection.needed ?? 0) ];
    let chks = [ 0, ... cols.map(c => 0) ];
    let allneed = undefined as number | undefined;

    crewmap.sort((a, b) => {
        let x = 0;
        let y = 0;

        if (searches?.length) {
            let ares = searches.includes(a.name);
            let bres = searches.includes(b.name);
            if (ares !== bres) {
                if (ares) return -1;
                return 1;
            }
        }
        if (a.favorite != b.favorite) {
            if (a.favorite) return -1;
            else return 1;
        }
        // if (col.collection.crew?.find(f => f === a.symbol)) x++;
        // if (col.collection.crew?.find(f => f === b.symbol)) y++;

        // for (let i = 0; i < cols.length; i++) {
        //     if (cols[i].crew.find(fc => fc.symbol === a.symbol)) {
        //         x++;
        //     }
        //     if (cols[i].crew.find(fc => fc.symbol === b.symbol)) {
        //         y++;
        //     }
        // }
        let r = 0; // y - x;
        if (!r) {
            r = starCost([a], undefined, costMode === 'sale') - starCost([b], undefined, costMode === 'sale');
        }
        if (!r) {
            r = b.level - a.level;
            if (!r) {
                r = a.max_rarity - b.max_rarity;
            }
        }
        return r;
    });

    let p = 0;

    for (let item of crewmap) {
        if (col.collection.crew?.find(f => item.symbol === f)) {
            chks[0]++;
        }
        for (let i = 0; i < cols.length; i++) {
            if (cols[i].crew.find(fc => fc.symbol === item.symbol)) {
                chks[i+1]++;
            }
        }

        let ct = 0;
        for (let i = 0; i < needs.length; i++) {
            if (chks[i] >= needs[i]) ct++;
        }
        if (ct >= needs.length && !allneed) {
            allneed = p + 1;
        }
        p++;
    }

    return crewmap.slice(0, allneed);

}

export const findColGroupsCrew = (costMap: ComboCostMap[], col: CollectionCombo, combo?: string) => {
    return costMap.find(f => f.collection === col.collection.name && (!combo || f.combo.names.join(" / ") === combo))?.crew ?? [];
}

export function currentMilestoneIndex(col: PlayerCollection) {
    return col.milestones?.findIndex(mi1 => mi1.goal === col.milestone.goal) || -1;
}

export function milestonesFromCurrent(col: PlayerCollection) {
    let idx = currentMilestoneIndex(col);
    if (!col.milestones?.length || idx == -1) return [];
    const c = col.milestones?.length ?? 0;
    const result = [] as Milestone[];
    for (let i = idx; i < c; i++) {
        result.push(col.milestones[i]);
    }
    return result;
}

export function getAllStatBuffs(col: Collection) {
    if (!col.milestones) {
        return [];
    }

    let buffs = JSON.parse(JSON.stringify(col.milestones)).map(c => c.buffs).flat() as MilestoneBuff[];

    buffs.sort((a, b) => a.symbol!.localeCompare(b.symbol!));

    let output = [] as MilestoneBuff[];
    let lastSymbol = '';

    for (let buff of buffs) {
        if (buff.symbol === lastSymbol) {
            output[output.length - 1].quantity!++;
        }
        else {
            buff.quantity ??= 1;
            output.push(buff);
        }
        lastSymbol = buff.symbol!;
    }

    output.sort((a, b) => {
        let r = b.quantity! - a.quantity!;
        if (!r) r = a.symbol!.localeCompare(b.symbol!);
        return r;
    })

    return output;
}

