import { BaseSkillFields, BaseSkills, CrewMember, Skill } from "../model/crew";
import { PlayerCrew } from "../model/player";
import { ShipAction } from "../model/ship";
import { Schematics, Ship } from "../model/ship";
import { simplejson2csv, ExportField } from './misc';
import { StatsSorter } from "./statssorter";
import { shipStatSortConfig  } from "../utils/crewutils";
import CONFIG from "../components/CONFIG";

export function exportShipFields(): ExportField[] {
	return [
		{
			label: 'Name',
			value: (row: Ship) => row.name
		},
		{
			label: 'Owned',
			value: (row: Ship) => row.owned
		},
		{
			label: 'Rarity',
			value: (row: Ship) => row.rarity
		},
		{
			label: 'Level',
			value: (row: Ship) => `${row.level} / ${row.max_level}`
		},
		{
			label: 'Antimatter',
			value: (row: Ship) => row.antimatter
		},
		{
			label: 'Accuracy',
			value: (row: Ship) => row.accuracy
		},
		{
			label: 'Attack',
			value: (row: Ship) => row.attack
		},
		{
			label: 'Attacks per second',
			value: (row: Ship) => row.attacks_per_second
		},
		{
			label: 'Crit bonus',
			value: (row: Ship) => row.crit_bonus
		},
		{
			label: 'Crit chance',
			value: (row: Ship) => row.crit_chance
		},
		{
			label: 'Evasion',
			value: (row: Ship) => row.evasion
		},
		{
			label: 'Hull',
			value: (row: Ship) => row.hull
		},
		{
			label: 'Shields',
			value: (row: Ship) => row.shields
		},
		{
			label: 'Shield regen',
			value: (row: Ship) => row.shield_regen
		},
		{
			label: 'Traits',
			value: (row: Ship) => row.traits_named?.join(' ')
		}
	];
}

export interface ShipPickerFilter {
	rarity?: number[];
	action?: number[];
	penalty?: number[];
	bonus?: number[];
	grant?: number[];
	trait?: string[];
}

export function filterBy(ships: Ship[], filter?: ShipPickerFilter, clone?: boolean): Ship[] {
	let shipOut = ships;
	
	if (!filter) {
		if (clone) {
			return JSON.parse(JSON.stringify(shipOut)) as Ship[];
		}
		else {
			return shipOut;
		}
	}

	if (filter.rarity && filter.rarity.length) {
		shipOut = shipOut.filter((ship) => filter.rarity?.includes(ship.rarity));
	}

	if (filter.action && filter.action.length) {
		shipOut = shipOut.filter((ship) => ship.actions?.some((action) => filter.action?.includes(action.bonus_type)));
	}

	if (filter.bonus && filter.bonus.length) {
		shipOut = shipOut.filter((ship) => ship.actions?.some((action) => filter.bonus?.includes(action.bonus_amount)));
	}

	if (filter.grant && filter.grant.length) {
		shipOut = shipOut.filter((ship) => ship.actions?.some((action) => action.status && filter.grant?.includes(action.status)));
	}

	if (filter.penalty && filter.penalty.length) {
		shipOut = shipOut.filter((ship) => ship.actions?.some((action) => action?.penalty && filter.action?.includes(action.penalty.type)));
	}

	if (filter.trait && filter.trait.length) {
		shipOut = shipOut.filter((ship) => ship.traits?.some(trait => filter.trait?.includes(trait)));
	}

	if (clone) {
		return JSON.parse(JSON.stringify(shipOut)) as Ship[];
	}
	else {
		return shipOut;
	}
}

export function exportShips(ships: Ship[]): string {
	return simplejson2csv(ships, exportShipFields());
}

export function highestLevel(ship: Ship) {
	if (!ship.levels || !Object.keys(ship.levels).length) return 0;
	let highest = Object.keys(ship.levels).map(m => Number(m)).sort().reverse()[0];
	return highest;
}

export function mergeShips(ship_schematics: Schematics[], ships: Ship[]): Ship[] {
	let newShips: Ship[] = [];
	ship_schematics = JSON.parse(JSON.stringify(ship_schematics));
	ship_schematics.forEach((schematic) => {
		let owned = ships.find((ship) => ship.symbol == schematic.ship.symbol);

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
			schematic.ship.level = owned.level + 1;
			schematic.ship.rarity = owned.rarity;
			schematic.ship.shield_regen = owned.shield_regen;
			schematic.ship.shields = owned.shields;
			
			if (owned.battle_stations?.length) {
				schematic.ship.battle_stations = [ ... owned.battle_stations ?? []];
			}
			
			if (owned.actions) {
				schematic.ship.actions = JSON.parse(JSON.stringify(owned.actions)) as ShipAction[];
			}
			schematic.ship.owned = true;
		} else {
			schematic.ship.owned = false;
			if (schematic.ship.levels) {
				let h = highestLevel(schematic.ship);
				if (h === schematic.ship.level + 1) {
					schematic.ship = { ... schematic.ship, ...schematic.ship.levels[`${h}`] };
					schematic.ship.level = h - 1;
				}
			}
			schematic.ship.level ??= 0;
		}
		
		if (!schematic.ship.max_level) schematic.ship.max_level = 1;
		else schematic.ship.max_level += 1;

		schematic.ship.traits_named = traits_named;

		newShips.push(schematic.ship);
	});

	newShips.sort((a, b) => {
		if (a.owned && !b.owned) return -1;
		else if (!a.owned && b.owned) return 1;
		let r = b.level - a.level;

		if (r) return r;

		r = b.rarity - a.rarity;
		if (r) return r;
		return a.name?.localeCompare(b.name ?? "") ?? 0;
	})

	return newShips;
}

/**
 * Get eligible crew for a ship
 * @param ship The ship
 * @param allCrew The crew roster to check against
 * @param onlyTriggers Optional. True to only return crew that are triggered by ship grants
 * @param seat Optional. Get only crew for the specified seat (skill). If the seat doesn't exist on the ship, an empty array is returned.
 * @returns An array of all crew.
 */
export function findPotentialCrew(ship: Ship, allCrew: (CrewMember | PlayerCrew)[], onlyTriggers: boolean = false, seats?: BaseSkillFields[] | string[] | undefined) {
	// first, get only the crew with the specified traits.
	console.log("Find Potential Crew For " + ship.name);
	if (seats?.length && !seats.some((seat) => ship.battle_stations?.some(bs => bs.skill === seat))) return [];

	let bscrew = allCrew.filter((crew: PlayerCrew | CrewMember) => {
		if (crew.max_rarity > ship.rarity) return false;
		if ("rarity" in crew) {
			if (crew.rarity > ship.rarity) return false;
		}

		if (seats?.length) {
			return (seats?.some((seat) => crew.base_skills && crew.base_skills[seat] !== undefined));			
		}
		else {
			return ship.battle_stations?.some(bs => bs.skill in crew.base_skills && crew.base_skills[bs.skill] !== undefined)
		}		
	});
	
	// now get ship grants
	let grants = ship.actions?.filter(action => action.status !== undefined);	
	if (grants) console.log(grants);
	if (!grants) grants = [];
	// now match triggers with grants.
	if (bscrew) {
		let bsave = bscrew;
		bscrew = bscrew.filter(crew => {
			if ((grants?.length ?? 0) == 0) {
				return (crew.action.ability?.condition ?? 0) === 0;
			}
			else if (onlyTriggers) {
				return grants?.some(grant => grant.status === crew.action.ability?.condition);
			}
			else {
				return ((crew.action.ability?.condition ?? 0) === 0) || grants?.some(grant => grant.status === crew.action.ability?.condition);
			}

		});
		//if (bscrew.length === 0) bscrew = bsave;
	}

	var sorter = new StatsSorter({ objectConfig: shipStatSortConfig });
	sorter.sortStats(bscrew, true);
	return bscrew;
}

export function printTriggers(ship: Ship): string {
	let s = "";
	for (let a of ship.actions ?? []) {
		if (a.status && a.status !== 16) {
			if (s != "") s += ", ";
			s += CONFIG.SHIP_BATTLE_GRANTS[a.status];
		}
	}
	return s;
}

export interface TierRank {
	type?: number;
	ability?: number;
	value: number;
	tier: number;
}

export function calculateBattleTiers(allCrew: (CrewMember | PlayerCrew)[]) {



}