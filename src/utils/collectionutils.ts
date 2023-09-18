import { RewardsGridNeed } from "../model/crew";
import { MapFilterOptions, CollectionMap, CollectionGroup, CollectionFilterProps } from "../model/collectionfilter";
import { PlayerCollection, PlayerCrew } from "../model/player";
import { getCollectionRewards } from "./itemutils";

export const checkRewardFilter = (collection: PlayerCollection, filters: string[]) => {
    let result = false;

    for (let rewardFilter of filters) {
        let q = true;

        if (rewardFilter && rewardFilter != '*any') {
            let re: RegExp;
            if (rewardFilter == '*buffs') {
                if (collection.milestone?.buffs?.length == 0) q = false;
            }
            else if (rewardFilter.slice(0, 1) == '=') {
                re = new RegExp(rewardFilter.slice(1));
                if (!collection.milestone.rewards?.find(reward => reward.symbol && re.test(reward.symbol))) q = false;
            }
            else if (!collection.milestone.rewards?.find(reward => reward.symbol == rewardFilter)) {
                q = false;
            }
        }	
        result ||= q;
    }

    return result;
}

export function compareRewards(mapFilter: MapFilterOptions, colGroup1: PlayerCollection[], colGroup2: PlayerCollection[], short?: boolean): number {
    if (!mapFilter?.rewardFilter) return 0;

    let ayes = 0;
    let byes = 0;
    
    let areward = getCollectionRewards(colGroup1);
    let breward = getCollectionRewards(colGroup2);

    for (let col1 of colGroup1) {
        if (!col1) continue;
        if (short) {
            ayes += checkRewardFilter(col1, mapFilter.rewardFilter) ? 1 : 0;
        }
        else {
            
            ayes += areward?.filter(r => mapFilter.rewardFilter?.some(rf => r.symbol === rf))?.length ?? 0;
        }
    }

    for (let col2 of colGroup2) {
        if (!col2) continue;
        if (short) {
            byes += checkRewardFilter(col2, mapFilter.rewardFilter) ? 1 : 0;
        }
        else {
            
            byes += breward?.filter(r => mapFilter.rewardFilter?.some(rf => r.symbol === rf))?.length ?? 0;
        }
    }

    return byes - ayes;
}




export const citeSymbols = ['', '', 'honorable_citation_quality2', 'honorable_citation_quality3', 'honorable_citation_quality4', 'honorable_citation_quality5'];


export const makeCiteNeeds = (item: CollectionMap | CollectionGroup | PlayerCrew, combo?: string) => {
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
            gridneed.push({
                symbol: citeSymbols[idx],
                quantity: star
            });
        }	
    });
    return gridneed;
}


export function starCost(crew: PlayerCrew[], limit?: number, sale?: boolean) {
	const costs = [0, 0, 500, 4500, 18000, sale ? 40000 : 50000];

	limit ??= crew.length;
	let tc = 0;

	for (let c = 0; c < limit; c++) {
		let cm = crew[c];		 
		if (!cm) continue;
		let rdiff = (cm.max_rarity ?? 2 * cm.rarity) - cm.rarity;
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
		let rdiff = (cm.max_rarity ?? 2 * cm.rarity) - cm.rarity;
		costs[cm.max_rarity] += rdiff;
	}

	return costs;
}
   
export const checkCommonFilter = (filters: CollectionFilterProps, crew: PlayerCrew, exclude?: string[]) => {    
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

