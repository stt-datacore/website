import CONFIG from '../components/CONFIG';
import { EquipmentCommon, EquipmentItem } from '../model/equipment';
import { PlayerEquipmentItem } from '../model/player';
import { simplejson2csv, ExportField } from './misc';

export function mergeItems(player_items: PlayerEquipmentItem[], items: EquipmentItem[]) {
	let data = [] as EquipmentCommon[];
	player_items.forEach(item => {
		let itemEntry = items.find(i => i.symbol === item.symbol);
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


export function exportItemFieldsAlt(): ExportField[] {
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
			label: 'Flavor',
			value: (row: EquipmentItem) => row.flavor ?? ""
		},
		{
			label: 'Symbol',
			value: (row: EquipmentItem) => row.symbol
		},
		{
			label: 'Faction Only',
			value: (row: EquipmentItem) => row.factionOnly === undefined ? '' : (row.factionOnly ? 'Yes' : 'No')
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

export function exportItemsAlt(items: EquipmentCommon[]): string {
	return simplejson2csv(items, exportItemFieldsAlt());
}





