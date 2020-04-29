import { simplejson2csv, ExportField } from './misc';

export function mergeItems(player_items: any, items: any): any {
	let data = [];
	player_items.forEach(item => {
		let itemEntry = items.find(i => i.symbol === item.symbol);
		if (itemEntry) {
			data.push({
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
				name: item.name,
				type: item.type,
				rarity: item.rarity,
				flavor: item.flavor,
				bonuses: undefined,
				imageUrl: item.imageUrl,
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
			value: (row: any) => row.name
		},
		{
			label: 'Rarity',
			value: (row: any) => row.rarity
		},
		{
			label: 'Quantity',
			value: (row: any) => row.quantity
		},
		{
			label: 'Type',
			value: (row: any) => row.type
		},
		{
			label: 'Flavor',
			value: (row: any) => row.flavor
		},
		{
			label: 'Symbol',
			value: (row: any) => row.symbol
		},
		{
			label: 'Bonuses',
			value: (row: any) => (row.bonuses ? JSON.stringify(row.bonuses) : '')
		},
		{
			label: 'Image',
			value: (row: any) => row.imageUrl
		}
	];
}

export function exportItems(items): string {
	return simplejson2csv(items, exportItemFields());
}
