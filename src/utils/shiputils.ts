import { simplejson2csv, ExportField } from './misc';

export function exportShipFields(): ExportField[] {
	return [
		{
			label: 'Name',
			value: (row: any) => row.name
		},
		{
			label: 'Owned',
			value: (row: any) => row.owned
		},
		{
			label: 'Rarity',
			value: (row: any) => row.rarity
		},
		{
			label: 'Level',
			value: (row: any) => `${row.level} / ${row.max_level}`
		},
		{
			label: 'Antimatter',
			value: (row: any) => row.antimatter
		},
		{
			label: 'Accuracy',
			value: (row: any) => row.accuracy
		},
		{
			label: 'Attack',
			value: (row: any) => row.attack
		},
		{
			label: 'Attacks per second',
			value: (row: any) => row.attacks_per_second
		},
		{
			label: 'Crit bonus',
			value: (row: any) => row.crit_bonus
		},
		{
			label: 'Crit chance',
			value: (row: any) => row.crit_chance
		},
		{
			label: 'Evasion',
			value: (row: any) => row.evasion
		},
		{
			label: 'Hull',
			value: (row: any) => row.hull
		},
		{
			label: 'Shields',
			value: (row: any) => row.shields
		},
		{
			label: 'Shield regen',
			value: (row: any) => row.shield_regen
		},
		{
			label: 'Traits',
			value: (row: any) => row.traits_named.join(' ')
		}
	];
}

export function exportShips(ships): string {
	return simplejson2csv(ships, exportShipFields());
}

export function mergeShips(ship_schematics: any, ships: any): any {
	let newShips: any[] = [];
	ship_schematics.forEach((schematic: any) => {
		let owned = ships.find((ship: any) => ship.symbol == schematic.ship.symbol);

		let traits_named = schematic.ship.traits_named;

		if (owned) {
			schematic.ship.accuracy = owned.accuracy;
			schematic.ship.antimatter = owned.antimatter;
			schematic.ship.attack = owned.attack;
			schematic.ship.attacks_per_second = owned.attacks_per_second;
			schematic.ship.crit_bonus = owned.crit_bonus;
			schematic.ship.crit_chance = owned.crit_chance;
			schematic.ship.evasion = owned.evasion;
			schematic.ship.hull = owned.hull;
			schematic.ship.level = owned.level;
			schematic.ship.rarity = owned.rarity;
			schematic.ship.shield_regen = owned.shield_regen;
			schematic.ship.shields = owned.shields;
			schematic.ship.owned = true;
		} else {
			schematic.ship.level = 0;
			schematic.ship.owned = false;
		}

		schematic.ship.traits_named = traits_named;

		newShips.push(schematic.ship);
	});

	return newShips;
}
