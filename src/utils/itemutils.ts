import CONFIG from '../components/CONFIG';
import { CrewMember, Skill } from '../model/crew';
import { EquipmentCommon, EquipmentItem, EquipmentItemSource } from '../model/equipment';
import { ISymbol } from '../model/game-elements';
import { Mission } from '../model/missions';
import { AtlasIcon, BuffBase, PlayerCollection, PlayerCrew, PlayerEquipmentItem, Reward, TranslateMethod } from '../model/player';
import { getIconPath } from './assets';
import { simplejson2csv, ExportField } from './misc';


export interface ItemBonusInfo {
    bonusText: string[];
    bonuses: { [key: string]: Skill };
}

export interface ItemWithBonus {
	item: EquipmentItem;
	bonusInfo: ItemBonusInfo;
}

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


export function combineItemBonuses(a: { [key: string]: Skill }, b: { [key: string]: Skill }) {
	let result = { ...a };
	let keys = Object.keys(b);
	for (let key of keys) {
		result[key] ??= { core: 0, range_min: 0, range_max: 0, skill: key };

		if (key in b) {
			result[key].core += b[key].core;
			result[key].range_min += b[key].range_min;
			result[key].range_max += b[key].range_max;
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

export function getPossibleQuipment<T extends CrewMember>(crew: T, quipment: EquipmentItem[]): EquipmentItem[] {
	return quipment.filter((item) => isQuipmentMatch(crew, item));
}

export function isQuipmentMatch<T extends CrewMember>(crew: T, item: EquipmentItem): boolean {
	if (item.kwipment) {
		if (!item.max_rarity_requirement) return false;
		const bonus = getItemBonuses(item);

		let mrq = item.max_rarity_requirement;
		let rr = mrq >= crew.max_rarity;

		if (!!item.traits_requirement?.length) {
			if (item.traits_requirement_operator === "and") {
				rr &&= item.traits_requirement?.every(t => crew.traits.includes(t) || crew.traits_hidden.includes(t));
			}
			else {
				rr &&= item.traits_requirement?.some(t => crew.traits.includes(t) || crew.traits_hidden.includes(t));
			}
		}

		rr &&= Object.keys(bonus.bonuses).some(skill => skill in crew.base_skills);
		return rr;
	}

	return false;
}

export function addItemBonus<T extends PlayerCrew>(crew: T, source: EquipmentItem | ItemBonusInfo, skill?: string) {
	let bonuses = "bonusText" in source ? source : getItemBonuses(source);
	Object.keys(bonuses.bonuses).forEach((sk) => {
		if (!!skill && sk != skill) return;
		crew[sk].core += bonuses.bonuses[sk].core;
		crew[sk].max += bonuses.bonuses[sk].range_max;
		crew[sk].min += bonuses.bonuses[sk].range_min;
	});
}

export function subtractItemBonus<T extends PlayerCrew>(crew: T, source: EquipmentItem | ItemBonusInfo, skill?: string) {
	let bonuses = "bonusText" in source ? source : getItemBonuses(source);
	Object.keys(bonuses.bonuses).forEach((sk) => {
		if (!!skill && sk != skill) return;
		crew[sk].core -= bonuses.bonuses[sk].core;
		crew[sk].max -= bonuses.bonuses[sk].range_max;
		crew[sk].min -= bonuses.bonuses[sk].range_min;
	});
}

export function getQuipmentCrew<T extends CrewMember>(item: EquipmentItem, crew: T[]): T[] {
	if (item.kwipment) {
		const bonus = getItemBonuses(item);
		return crew.filter(f => {			
			let mrq = item.max_rarity_requirement ?? f.max_rarity;
			let rr = mrq >= f.max_rarity;

			if (!!item.traits_requirement?.length) {
				if (item.traits_requirement_operator === "and") {
					rr &&= item.traits_requirement?.every(t => f.traits.includes(t) || f.traits_hidden.includes(t));
				}
				else {
					rr &&= item.traits_requirement?.some(t => f.traits.includes(t) || f.traits_hidden.includes(t));
				}
			}

			rr &&= Object.keys(bonus.bonuses).some(skill => skill in f.base_skills);

			return rr;
		});
	}

	return [];
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

export function formatDuration(time: number, t?: TranslateMethod) {
	if (t) {
		if (time <= 48) {
			return t('duration.n_hours', { hours: `${time}` });
		}
		else{
			return t('duration.n_days', { days: `${time / 24}` });
		}
	}
	else {
		if (time <= 48) {
			return `${time} Hours`;
		}
		else{
			return `${Math.floor(time / 24)} Days`;
		}
	}
};

export function getItemWithBonus(item: EquipmentItem) {
	return {
		item,
		bonusInfo: getItemBonuses(item)
	} as ItemWithBonus;
}


export function sortItemsWithBonus(quipment: ItemWithBonus[], byItemCost?: boolean, skill?: string, sortFactor?: number) {
	const sf = sortFactor === -1 ? -1 : 1;

	return quipment.sort((a, b) => {
		let r = 0;

		if (byItemCost) {
			let ac = a.item.demands?.map(d => d.count * (d.equipment?.rarity ?? 1)).reduce((p, n) => p + n, 0) ?? 0;
			let bc = b.item.demands?.map(d => d.count * (d.equipment?.rarity ?? 1)).reduce((p, n) => p + n, 0) ?? 0;
			r = ac - bc;                                
			if (r) return r;
		}

		let an = 0;
		let bn = 0;
		
		if (skill && skill in a.bonusInfo.bonuses && skill in b.bonusInfo.bonuses) {
			let ask = a.bonusInfo.bonuses[skill];
			let bsk = a.bonusInfo.bonuses[skill];

			an = ask.core + ask.range_max + ask.range_min;
			bn = bsk.core + bsk.range_max + bsk.range_min;
		}
		else {
			an = Object.values(a.bonusInfo.bonuses).map((sk: Skill) => sk.core + sk.range_max + sk.range_min).reduce((p, n) => p + n, 0);
			bn = Object.values(b.bonusInfo.bonuses).map((sk: Skill) => sk.core + sk.range_max + sk.range_min).reduce((p, n) => p + n, 0);
		}

		r = an - bn;

		if (!r) {
			let ac = Object.keys(a.bonusInfo.bonuses) ?? [];
			let bc = Object.keys(b.bonusInfo.bonuses) ?? [];
			r = bc.length - ac.length;
		}
		return r * sf;

	});
}