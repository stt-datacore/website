import { BaseSkillFields, BaseSkills, CrewMember, Skill } from "../model/crew";
import { PlayerCrew, Setup } from "../model/player";
import { BattleMode, BattleStation, PvpDivision, ShipAction, ShipInUse } from "../model/ship";
import { Schematics, Ship } from "../model/ship";
import { simplejson2csv, ExportField } from './misc';
import { StatsSorter } from "./statssorter";
import { shipStatSortConfig  } from "../utils/crewutils";
import CONFIG from "../components/CONFIG";
import { PlayerContextData } from "../context/playercontext";
import { ShipWorkerItem, ShipWorkerTransportItem } from "../model/worker";
import { getBosses, getCrewDivisions, getShipDivision } from "../../scripts/ships/scoring";

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
	let levels = Object.keys(ship.levels).map(m => Number(m)).sort((a ,b) => b - a);
	let highest = levels[0];
	return highest;
}

export function mergeShips(ship_schematics: Schematics[], ships: Ship[], max_buffs = false): Ship[] {
	let newShips: Ship[] = [];
	let power = 1 + (max_buffs ? 0.16 : 0);
	ship_schematics = JSON.parse(JSON.stringify(ship_schematics));
	ship_schematics.forEach((schematic) => {
		let unowned_id = -1;
		let owned = ships.find((ship) => ship.symbol == schematic.ship.symbol);

		let traits_named = schematic.ship.traits_named;

		if (owned) {
			schematic.ship.id = owned.id;
			schematic.ship.name = owned.name;
			schematic.ship.flavor = owned.flavor;
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
			schematic.ship.immortal = owned.level >= schematic.ship.max_level! ? -1 : 0;
			schematic.ship.owned = true;
		} else {
			schematic.ship.owned = false;
			if (schematic.ship.levels) {
				let h = highestLevel(schematic.ship);
				if (schematic.ship.max_level && h === schematic.ship.max_level + 1 && schematic.ship.levels[`${h}`].hull) {
					schematic.ship = { ... schematic.ship, ...schematic.ship.levels[`${h}`] };
					schematic.ship.attack = schematic.ship.levels![`${h}`].attack_power * power;
					schematic.ship.accuracy = schematic.ship.levels![`${h}`].accuracy_power * power;
					schematic.ship.evasion = schematic.ship.levels![`${h}`].evasion_power * power;
					schematic.ship.hull *= power;
					schematic.ship.shields *= power;
				}
			}
			schematic.ship.id = unowned_id--;
			schematic.ship.level ??= 0;
		}

		if (!schematic.ship.max_level) schematic.ship.max_level = 1;
		else schematic.ship.max_level += 1;

		schematic.ship.traits_named = traits_named;
		if (schematic.ship.symbol === "constellation_ship" && !schematic.ship.battle_stations) {
			schematic.ship.battle_stations = [
				{
					skill: 'command_skill'
				},
				{
					skill: 'diplomacy_skill'
				}
			];
		}
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
export function findPotentialCrew(ship: Ship, allCrew: (CrewMember | PlayerCrew)[], onlyTriggers: boolean = false, seats?: BaseSkillFields[] | string[] | undefined, fbb?: number) {
	// first, get only the crew with the specified traits.
	console.log("Find Potential Crew For " + ship.name);
	if (seats?.length && !seats.some((seat) => ship.battle_stations?.some(bs => bs.skill === seat))) return [];

	let bscrew = allCrew.filter((crew: PlayerCrew | CrewMember) => {
		if (fbb) {
			let boss = getBosses(ship, crew).find(f => f.id === fbb);
			if (!boss) return false;
		}
		else {
			if (!getCrewDivisions(crew.max_rarity).includes(getShipDivision(ship.rarity))) return false;
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

export function getShipsInUse(playerContext: PlayerContextData): ShipInUse[] {
	const results = [] as ShipInUse[];
	if (!playerContext.playerData || !playerContext.ephemeral || !playerContext.playerShips) return [];

	function setupToSlots(setup: Setup, ship: Ship) {
		let slots = setup.slots.map(id => playerContext.playerData?.player.character.crew.find(cf => cf.id === id));
		if (slots?.length === ship.battle_stations?.length && slots?.every(e => !!e)) {
			ship.battle_stations?.forEach((station, idx) => {
				station.crew = slots[idx];
			});
			return true;
		}
		return false;
	}

	playerContext.playerData.player.character.pvp_divisions?.forEach((division) => {
		let id = division?.setup?.ship_id;
		if (!id) return;
		let ship = playerContext.playerShips?.find(f => f.id === id);
		if (ship) {
			let pvp_division: PvpDivision | undefined = undefined;
			let rarity = 0;
			switch (division.tier) {
				case 0:
					pvp_division = 'commander';
					rarity = 3;
					break;
				case 1:
					pvp_division = 'captain';
					rarity = 4;
					break;
				case 2:
					pvp_division = 'admiral';
					rarity = 5;
					break;
				default:
					break;
			}
			if (!pvp_division) return;
			ship = JSON.parse(JSON.stringify(ship)) as Ship;
			if (setupToSlots(division.setup, ship)) {
				results.push({
					ship,
					battle_mode: 'pvp',
					pvp_division,
					rarity
				});
			}
		}
	});

	playerContext.playerData.player.character.fbb_difficulties?.forEach((fbb) => {
		if (!fbb.setup) return;
		let id = fbb.setup?.ship_id;
		if (!id) return;
		let ship = playerContext.playerShips?.find(f => f.id === id);
		if (ship) {
			let battle_mode = `fbb_${fbb.id - 1}` as BattleMode;
			if (!battle_mode) return;
			ship = JSON.parse(JSON.stringify(ship)) as Ship;
			if (setupToSlots(fbb.setup, ship)) {
				results.push({
					ship,
					battle_mode,
					rarity: fbb.id - 1
				});
			}
		}
	});

	return results;
}

export function setupShip(ship: Ship, crewStations: (CrewMember | PlayerCrew | undefined)[], pushAction = true, ignoreSeats = false, readBattleStations = false, ignorePassives = false): Ship | false {
	if (readBattleStations && !crewStations?.length && ship.battle_stations?.some(bs => bs.crew)) {
		crewStations = ship.battle_stations.map(bs => bs.crew);
	}

	if (!ship?.battle_stations?.length || (!ignoreSeats && !crewStations?.length) || (!ignoreSeats && crewStations.length !== ship.battle_stations.length)) {
		if (ship.battle_stations === undefined) return ship;
		else return false;
	}

	let new_bs = ship.battle_stations.map(m => ({...m, crew: undefined } as BattleStation));
	let old_bs = ship.battle_stations;

	let newship = JSON.parse(JSON.stringify({...ship, battle_stations: new_bs })) as Ship;

	newship.battle_stations = new_bs.map((bs, idx) => {
		bs.crew = old_bs[idx].crew;
		return bs;
	});

	if (crewStations?.length) {
		for (let i = 0; i < crewStations.length && i < ship.battle_stations.length; i++) {
			newship.battle_stations[i].crew = crewStations[i];
		}
	}

	let x = 0;

	for (let action of newship.actions ?? []) {
		action.source = newship.name;
	}

	for (let crew of crewStations) {
		if (crew === undefined) continue;

		newship.crit_bonus ??= 0;
		newship.crit_chance ??= 0;
		newship.evasion ??= 0;
		newship.accuracy ??= 0;

		if (!ignorePassives) {
			if (crew.skill_order.includes(ship.battle_stations[x].skill) ||
				(ignoreSeats && crew.skill_order.some(sk => ship.battle_stations?.some(bs => bs.skill == sk))))
			{
				newship.crit_bonus += crew.ship_battle.crit_bonus ?? 0;
				newship.crit_chance += crew.ship_battle.crit_chance ?? 0;
				newship.evasion += crew.ship_battle.evasion ?? 0;
				newship.accuracy += crew.ship_battle.accuracy ?? 0;
			}
		}

		newship.actions ??= [];
		crew.action.source = crew.name;
		newship.battle_stations[x].crew = crew;

		if (crew.id !== undefined) crew.action.crew = crew.id;
		if (pushAction) newship.actions.push(crew.action);
		x++;
	}

	return newship;
}


export function compareShipResults(a: ShipWorkerTransportItem | ShipWorkerItem, b: ShipWorkerTransportItem | ShipWorkerItem, fbb_mode: boolean) {
	if (fbb_mode) {
		let r = 0;
		let aa: number;
		let ba: number;
		aa = a.fbb_metric;
		ba = b.fbb_metric;
		r = ba - aa;
		if (r) return r;
		aa = a.attack;
		ba = b.attack;
		r = ba - aa;
		if (r) return r;
		aa = a.battle_time;
		ba = b.battle_time;
		r = ba - aa;
		if (r) return r;
		aa = a.max_attack;
		ba = b.max_attack;
		r = ba - aa;
		if (r) return r;
		aa = a.min_attack;
		ba = b.min_attack;
		r = ba - aa;
		return r;
	}
	else {
		let r = 0;
		if (a.win !== b.win) {
			if (a.win) return -1;
			else if (b.win) return 1;
		}
		else if (a.win && b.win) {
			r = a.battle_time - b.battle_time;
			if (r) return r;
		}
		let aa: number;
		let ba: number;
		aa = a.arena_metric;
		ba = b.arena_metric;
		r = ba - aa;
		if (r) return r;
		aa = a.weighted_attack;
		ba = b.weighted_attack;
		r = ba - aa;
		if (r) return r;
		aa = a.attack;
		ba = b.attack;
		r = ba - aa;
		if (r) return r;
		aa = a.max_attack;
		ba = b.max_attack;
		r = ba - aa;
		if (r) return r;
		aa = a.min_attack;
		ba = b.min_attack;
		r = ba - aa;
		return r;
	}
}
