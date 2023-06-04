import { BaseSkills, CrewMember, Skill } from "../model/crew";
import { PlayerCrew } from "../model/player";
import { Action } from "../model/ship";
import { Schematics, Ship } from "../model/ship";
import { simplejson2csv, ExportField } from './misc';

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

export function exportShips(ships: Ship[]): string {
	return simplejson2csv(ships, exportShipFields());
}

export function mergeShips(ship_schematics: Schematics[], ships: Ship[]): Ship[] {
	let newShips: Ship[] = [];
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
			schematic.ship.battle_stations = [ ... owned.battle_stations ?? []];
			if (owned.actions) {
				schematic.ship.actions = JSON.parse(JSON.stringify(owned.actions)) as Action[];
			}
			schematic.ship.owned = true;
		} else {
			schematic.ship.level = 0;
			schematic.ship.owned = false;
		}
		
		if (!schematic.ship.max_level) schematic.ship.max_level = 1;
		else schematic.ship.max_level += 1;

		schematic.ship.traits_named = traits_named;

		newShips.push(schematic.ship);
	});

	return newShips;
}

export function findPotentialCrew(ship: Ship, allCrew: CrewMember[] | PlayerCrew[]) {
	// first, get only the crew with the specified traits.
	console.log(ship);	
	
	let bscrew = allCrew.filter((crew: PlayerCrew | CrewMember) => {
		if ("rarity" in crew) {
			if (crew.rarity > ship.rarity) return false;
		}
		else {
			if (crew.max_rarity > ship.rarity) return false;
		}

		return ship.battle_stations?.some(bs => bs.skill in crew.base_skills)
	});
	
	// now get ship grants
	let grants = ship.actions?.filter(action => action.status !== undefined);	
	if (grants) console.log(grants);
	// now match triggers with grants.
	if (bscrew && grants && grants.length) {
		bscrew = bscrew.filter(crew => grants?.some(grant => grant.status === crew.action.ability?.condition));
	}

	// now sort by bonuses
	bscrew?.sort((a, b) => {

		if (a.action.ability && !b.action.ability) return -1;
		else if (!a.action.ability && b.action.ability) return 1;

		if (a.action.ability && b.action.ability) {
			let r = a.action.ability.type - b.action.ability.type;
			if (!r) {
				r = a.action.ability.amount - b.action.ability.amount;
				if (!r) {
					r = a.action.ability.condition - b.action.ability.condition;
				}
			}
			if (r) return -r;
		}
		
		if (a.action?.bonus_amount && b.action?.bonus_amount) {
			let r = a.action.bonus_amount - b.action.bonus_amount;
			if (r) return -r;
		}

		if (a.action?.bonus_type && !b.action?.bonus_type) return -1;
		else if (b.action?.bonus_type && !a.action?.bonus_type) return 1;
		else if (b.action?.bonus_type && a.action?.bonus_type) {
			let r = a.action?.bonus_type - b.action?.bonus_type;
			if (r) return -r;
		}
		
		if (a.ship_battle && b.ship_battle) {
			let a_acc = a.ship_battle?.accuracy ?? 0;
			let a_critb = a.ship_battle?.crit_bonus ?? 0;
			let a_critc = a.ship_battle?.crit_chance ?? 0;
			let a_evade = a.ship_battle?.evasion ?? 0;

			let b_acc = b.ship_battle?.accuracy ?? 0;
			let b_critb = b.ship_battle?.crit_bonus ?? 0;
			let b_critc = b.ship_battle?.crit_chance ?? 0;
			let b_evade = b.ship_battle?.evasion ?? 0;

			let r = a_acc - b_acc;
			if (!r) {
				r = a_critb - b_critb;
				if (!r) {
					r = a_critc - b_critc;
					if (!r) {
						r = a_evade - b_evade;
					}
				}
			}
			return -r;
		}
		let skilln_a: number[] = [];
		let skilln_b: number[] = [];

		for (let key in Object.keys(a.base_skills)) {
			if (a.base_skills[key]) skilln_a.push(a.base_skills[key].core);
		}

		for (let key in Object.keys(b.base_skills)) {
			if (b.base_skills[key]) skilln_b.push(b.base_skills[key].core);
		}

		skilln_a.sort((a, b) => b - a);
		skilln_b.sort((a, b) => b - a);

		let rsk = skilln_a[0] - skilln_b[0];
		if (rsk) return -rsk;

		if (skilln_a.length > 1 && skilln_b.length > 1) {
			rsk = skilln_a[1] - skilln_b[1];
			if (rsk) return -rsk;
		}
		
		if (skilln_a.length > 2 && skilln_b.length > 2) {
			rsk = skilln_a[2] - skilln_b[2];
			if (rsk) return -rsk;
		}

		return 0;
	})
	
	return bscrew;
}


