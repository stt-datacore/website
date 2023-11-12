import CONFIG from '../components/CONFIG';
import { Skill } from '../model/crew';
import { EquipmentCommon, EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { ISymbol, SymbolName } from '../model/game-elements';
import { Mission } from '../model/missions';
import { AtlasIcon, BuffBase, PlayerCollection, PlayerEquipmentItem, Reward } from '../model/player';
import { getIconPath } from './assets';
import { simplejson2csv, ExportField, getImageName } from './misc';

export function mergeItems(player_items: PlayerEquipmentItem[], items: EquipmentItem[]) {
	let data = [] as EquipmentCommon[];
	player_items.forEach(item => {
		let itemEntry = items.find(i => i.symbol === item.symbol && !i.isReward);
		if (itemEntry) {
			data.push({
				... itemEntry,
				name: itemEntry.name,
				type: itemEntry.type,
				rarity: itemEntry.rarity,
				flavor: itemEntry.flavor,
				bonuses: itemEntry.bonuses,
				imageUrl: itemEntry.imageUrl,
				symbol: item.symbol,
				quantity: item.quantity
			});
		} else {
			data.push({
				...item,
				name: item.name ?? "",
				type: item.type ?? 0,
				rarity: item.rarity,
				flavor: item.flavor ?? "",
				bonuses: undefined,
				imageUrl: item.imageUrl ?? "",
				symbol: item.symbol,
				quantity: item.quantity
			});
		}
	});
	return data;
}

export function exportItemFields(): ExportField[] {
	return [
		{
			label: 'Name',
			value: (row: EquipmentItem) => row.name
		},
		{
			label: 'Rarity',
			value: (row: EquipmentItem) => row.rarity
		},
		{
			label: 'Quantity',
			value: (row: EquipmentItem) => row.quantity
		},
		{
			label: 'Type',
			value: (row: EquipmentItem) => row.type
		},
		{
			label: 'Flavor',
			value: (row: EquipmentItem) => row.flavor
		},
		{
			label: 'Symbol',
			value: (row: EquipmentItem) => row.symbol
		},
		{
			label: 'Bonuses',
			value: (row: EquipmentItem) => (row.bonuses ? JSON.stringify(row.bonuses) : '')
		},
		{
			label: 'Image',
			value: (row: EquipmentItem) => row.imageUrl
		}
	];
}

export function exportItems(items: EquipmentCommon[]): string {
	return simplejson2csv(items, exportItemFields());
}

// Alternative, simplified export, below.
// Inspired by Bernard

export function exportItemFieldsAlt(): ExportField[] {
	return [
		{
			label: 'Name',
			value: (row: EquipmentItem) => row.name
		},
		{
			label: 'Quantity',
			value: (row: EquipmentItem) => row.quantity ?? ""
		},
		{
			label: 'Needed',
			value: (row: EquipmentItem) => row.needed ?? ""
		},
		{
			label: 'Type',
			value: (row: EquipmentItem) => CONFIG.REWARDS_ITEM_TYPE[row.type]
		},
		{
			label: 'Rarity',
			value: (row: EquipmentItem) => CONFIG.RARITIES[row.rarity].name
		},
		{
			label: 'Faction Only',
			value: (row: EquipmentItem) => row.factionOnly === undefined ? '' : (row.factionOnly ? 'Yes' : 'No')
		}
	];
}

export function exportItemsAlt(items: EquipmentCommon[]): string {
	return simplejson2csv(items, exportItemFieldsAlt());
}

export function populateItemCadetSources(items: EquipmentItem[], episodes: Mission[]) {
	for(const item of items) {					
		for (let ep of episodes) {
			let quests = ep.quests.filter(q => q.quest_type === 'ConflictQuest' && q.mastery_levels?.some(ml => ml.rewards?.some(r => r.potential_rewards?.some(px => px.symbol === item.symbol))));
			if (quests?.length) {
				for (let quest of quests) {
					if (quest.mastery_levels?.length) {
						let x = 0;
						for (let ml of quest.mastery_levels) {
							if (ml.rewards?.some(r => r.potential_rewards?.some(pr => pr.symbol === item.symbol))) {
								let mx = ml.rewards.map(r => r.potential_rewards?.length).reduce((prev, curr) => Math.max(prev ?? 0, curr ?? 0)) ?? 0;
								mx = (1/mx) * 1.80;
								let qitem = {
									type: 4,
									mastery: x,											
									name: quest.name,
									energy_quotient: 1,
									chance_grade: 5 * mx,						
									mission_symbol: quest.symbol,
									cost: 1,
									avg_cost: 1/mx,
									cadet_mission: ep.episode_title,
									cadet_symbol: ep.symbol
								} as EquipmentItemSource;
								if (!item.item_sources.find(f => f.mission_symbol === quest.symbol)) {
									item.item_sources.push(qitem);
								}									
							}
							x++;
						}
					}
				}
			}					
		}
	}
}




export interface ItemBonusInfo {
    bonusText: string[];
    bonuses: { [key: string]: Skill };
}

export function combineItemBonuses(a: { [key: string]: Skill }, b: { [key: string]: Skill }) {
	let result = { ...a, ...b };
	let keys = Object.keys(result);
	for (let key of keys) {
		result[key] = { core: 0, range_min: 0, range_max: 0, skill: key };

		if (key in a) {
			result[key].core += a[key].core;
			result[key].range_max += a[key].range_min;
			result[key].range_max += a[key].range_min;
		}
		if (key in b) {
			result[key].core += b[key].core;
			result[key].range_max += b[key].range_min;
			result[key].range_max += b[key].range_min;
		}
	}
	return result;
}

export function combineBonuses(bonuses: { [key: string]: Skill }[]) {
	if (bonuses.length === 1) return bonuses[0];
	let c = bonuses.length;
	let result = {} as { [key: string]: Skill };

	for (let i = 0; i < c; i++) {
		result = combineItemBonuses(result, bonuses[i]);
	}

	return result;
}

export function getItemBonuses(item: EquipmentItem): ItemBonusInfo {
    let bonusText = [] as string[];
    let bonuses = {} as { [key: string]: Skill };
    
    if (item.bonuses) {
        for (let [key, value] of Object.entries(item.bonuses)) {
            let bonus = CONFIG.STATS_CONFIG[Number.parseInt(key)];
            if (bonus) {
                bonusText.push(`+${value} ${bonus.symbol}`);	
                bonuses[bonus.skill] ??= { core: 0, range_min: 0, range_max: 0 } as Skill;
                bonuses[bonus.skill][bonus.stat] = value;				
                bonuses[bonus.skill].skill = bonus.skill;
            } else {
                // TODO: what kind of bonus is this?
            }
        }
    }

    return {
        bonusText,
        bonuses
    };
}



export function binaryLocate<T extends ISymbol>(symbol: string, items: T[]) : T | undefined {
	let lo = 0, hi = items.length - 1;

	while (true)
	{
		if (lo > hi) break;

		let p = Math.floor((hi + lo) / 2);
		let elem = items[p];

		let c = symbol.localeCompare(items[p].symbol);

		if (c == 0)
		{
			return elem;
		}
		else if (c < 0)
		{
			hi = p - 1;
		}
		else
		{
			lo = p + 1;
		}
	}

	return undefined;
}

export function checkReward(items: (EquipmentCommon | EquipmentItem)[], reward: Reward, needed?: boolean) {
	if (!items.find(f => (f as EquipmentItem).isReward && f.symbol === reward.symbol && f.quantity === reward.quantity)) {
		let seeditem = items.find(f => f.symbol === reward.symbol) ?? {} as EquipmentItem;

		items.push({
			... seeditem,
			...reward,
			name: reward.name ?? "",
			symbol: reward.symbol ?? "",
			flavor: reward.flavor ?? "",
			bonuses: {},
			quantity: !!needed ? 0 : reward.quantity,
			needed: !needed ? 0 : reward.quantity,
			imageUrl: getIconPath(reward.icon ?? {} as AtlasIcon, true),
			item_sources: [],
			archetype_id: reward.id,
			isReward: !needed
		});
	}
}


export function getCollectionRewards(playerCollections: PlayerCollection[]) {
	return playerCollections.map((col) => {
		return (col?.milestone.buffs?.map(b => b as BuffBase) ?? [] as Reward[]).concat(col?.milestone.rewards ?? [] as Reward[]) as Reward[];
	}).flat();
}

export function formatDuration(time: number) {
	if (time <= 48) {
		return `${time} Hours`;
	}
	else{
		return `${Math.floor(time / 24)} Days`;
	}
};

