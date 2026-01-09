import { BaseSkillFields, CrewMember } from "../model/crew";
import { PlayerCrew, Setup } from "../model/player";
import { BattleMode, BattleStation, PvpDivision, ReferenceShip, ShipAction, ShipInUse, ShipLevel, ShipLevels, ShipLevelStats } from "../model/ship";
import { Schematics, Ship } from "../model/ship";
import { simplejson2csv, ExportField } from './misc';
import { StatsSorter } from "./statssorter";
import { shipStatSortConfig  } from "../utils/crewutils";
import CONFIG from "../components/CONFIG";
import { PlayerContextData } from "../context/playercontext";
import { ShipWorkerItem, ShipWorkerTransportItem } from "../model/worker";
import { ShipTraitNames } from "../model/traits";
import { BuffStatTable } from "./voyageutils";
import boss_data from '../../static/structured/boss_data.json';

const BossData = (() => {
	let res = [] as Ship[];
	let bd = boss_data as any as Ship[];
	let groups = {} as {[key:string]: Ship[]};
	for (let boss of bd) {
		groups[boss.symbol] ??= [];
		groups[boss.symbol].push(boss);
	}
	let bg = Object.values(groups);
	let id = 1;
	for (let group of bg) {
		group.sort((a, b) => a.hull - b.hull);
		let c = group.length;
		let ldiff = 6 - group.length;
		for (let i = 0; i < c; i++) {
			group[i].id = id++;
			group[i].rarity = i + 1 + ldiff;
			if (group[i].actions?.length) {
				if (group[i].actions![0].ability?.condition === 64) {
					group[i].actions![0].cooldown = 4;
				}
			}
		}
		res = res.concat(group);
	}
	return res;
})();

export const OFFENSE_ABILITIES = [0, 1, 4, 5, 7, 8, 10, 12];
export const DEFENSE_ABILITIES = [2, 3, 6, 9, 10, 11];

export const OFFENSE_ACTIONS = [0, 2];
export const DEFENSE_ACTIONS = [1];

export const MaxOffense = 0.528;
export const MaxDefense = 0.528;

// export const UNMBos: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":5200000000,"evasion":0,"attack":700000,"accuracy":120000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 6, antimatter: 0, level: 10};
// export const NMBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":3700000000,"evasion":0,"attack":570000,"accuracy":105000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 5, antimatter: 0, level: 10};
// export const BrutalBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":1150000000,"evasion":0,"attack":225000,"accuracy":80000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 4, antimatter: 0, level: 10}
// export const HardBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":220000000,"evasion":0,"attack":206000,"accuracy":70000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 3, antimatter: 0, level: 10};
// export const NormalBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":160000000,"evasion":0,"attack":92000,"accuracy":35000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 2, antimatter: 0, level: 10};
// export const EasyBoss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":20000000,"evasion":0,"attack":45000,"accuracy":15000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 1, antimatter: 0, level: 10};
export const AllBosses = BossData; // [EasyBoss, NormalBoss, HardBoss, BrutalBoss, NMBoss, UNMBos];

export function getShipDivision(rarity: number) {
    return rarity === 5 ? 3 : rarity >= 3 && rarity <= 4 ? 2 : 1;
}

export function getCrewDivisions(rarity: number) {
    if (rarity === 5) return [3];
    if (rarity === 4) return [2, 3];
    else return [1, 2, 3];
}

export const getBosses = (ship?: Ship, crew?: CrewMember) => {
    const bosses = [] as Ship[];
    AllBosses.forEach((boss, idx) => {
        let rarity = boss.rarity;
        if (ship) {
            if (rarity === 6 && ship.rarity !== 5) return;
            if (rarity === 5 && ship.rarity < 4) return;
            if (rarity === 4 && (ship.rarity < 3 || ship.rarity > 4)) return;
            if (rarity === 3 && (ship.rarity < 2 || ship.rarity > 4)) return;
            if (rarity === 2 && ship.rarity > 3) return;
            if (rarity === 1 && ship.rarity > 2) return;
        }
        if (crew) {
            if (rarity === 1 && ![1, 2].includes(crew.max_rarity)) return;
            if (rarity === 2 && ![1, 2, 3].includes(crew.max_rarity)) return;
            if (rarity === 3 && ![1, 2, 3, 4].includes(crew.max_rarity)) return;
            if (rarity === 4 && ![1, 2, 3, 4].includes(crew.max_rarity)) return;
            if (rarity === 5 && ![1, 2, 3, 4, 5].includes(crew.max_rarity)) return;
            if (rarity === 6 && ![1, 2, 3, 4, 5].includes(crew.max_rarity)) return;
        }
        bosses.push(boss);
    });
    return bosses;
}

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
			return structuredClone(shipOut) as Ship[];
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
		return structuredClone(shipOut) as Ship[];
	}
	else {
		return shipOut;
	}
}

export function exportShips(ships: Ship[]): string {
	return simplejson2csv(ships, exportShipFields());
}

export function levelToLevelStats(level: ShipLevel): ShipLevelStats {
  let obj = structuredClone(level) as ShipLevel & ShipLevelStats;
  obj.dps = obj.attack * obj.attacks_per_second;
  obj.next_schematics = obj.schematic_gain_cost_next_level;
  obj.accuracy_power = obj.accuracy;
  obj.attack_power = obj.attack;
  obj.evasion_power = obj.evasion;
  delete obj.schematic_gain_cost;
  delete (obj as any).schematic_gain_cost_next_level;
  delete (obj as any).level;
  return obj as ShipLevelStats;
}

export function allLevelsToLevelStats(levels: ShipLevel[]): ShipLevels {
	const result = {} as ShipLevels;

	for (let level of levels) {
		let l = level.level;
		let obj = structuredClone(level) as ShipLevel & ShipLevelStats;
		obj.dps = obj.attack * obj.attacks_per_second;
		obj.next_schematics = obj.schematic_gain_cost_next_level;
		obj.accuracy_power = obj.accuracy;
		obj.attack_power = obj.attack;
		obj.evasion_power = obj.evasion;
		delete obj.schematic_gain_cost;
		delete (obj as any).schematic_gain_cost_next_level;
		delete (obj as any).level;
		result[l+1] = obj;
	}

	return result;
  }


export function highestLevel(ship: Ship) {
	if (!ship.levels || !Object.keys(ship.levels).length) return 0;
	let levels = Object.keys(ship.levels).map(m => Number(m)).sort((a, b) => b - a);
	let highest = levels[0];
	return highest;
}

export function mergeRefShips(ref_ships: ReferenceShip[], ships: Ship[], SHIP_TRAIT_NAMES: ShipTraitNames, max_buffs = false, player_direct = false, playerBuffs?: BuffStatTable): Ship[] {
	let newShips: Ship[] = [];
	let power = 1 + (max_buffs ? 0.16 : 0);
	ref_ships = structuredClone(ref_ships);
	let unowned_id = -1;
	ref_ships.map((refship) => {
		let ship = {...refship, id: refship.archetype_id, levels: undefined } as Ship;

		let owned = ships.find((ship) => refship.symbol == ship.symbol);

		let traits_named = ship.traits?.map(t => SHIP_TRAIT_NAMES[t])?.filter(f => !!f);
		if (!traits_named?.length) traits_named = undefined;

		if (owned) {
			ship = { ...ship, ... owned, level: player_direct ? owned.level : owned.level + 1 };

			if (owned.actions) {
				ship.actions = structuredClone(owned.actions) as ShipAction[];
			}
			ship.immortal = owned.level >= ship.max_level! ? -1 : 0;
			ship.owned = true;
			ship.buffed = true;

		} else {
			ship.owned = false;
			ship.level = 0;
			ship.id = unowned_id--;

			if (playerBuffs) {
				buffShip(ship, playerBuffs);
				ship.buffed = true;
			}
			else {
				ship.antimatter *= power;
				ship.accuracy *= power;
				ship.attack *= power;
				ship.evasion *= power;
				ship.hull *= power;
				ship.shields *= power;
				ship.buffed = power != 1;
			}
		}

		ship.max_level = refship.max_level + 1;
		ship.dps = Math.ceil(ship.attacks_per_second * ship.attack);
		ship.traits_named = traits_named;
		newShips.push(ship);
		return ship;
	});

	newShips.sort((a, b) => {
		if (a.owned && !b.owned) return -1;
		else if (!a.owned && b.owned) return 1;
		let r = b.level - a.level;

		if (r) return r;

		r = b.rarity - a.rarity;
		if (r) return r;
		return a.name?.localeCompare(b.name ?? "") ?? 0;
	});

	return newShips;
}

export function buffShip(ship: Ship, buffs: BuffStatTable) {
	if (ship.buffed) return;
	Object.keys(buffs).forEach((buff) => {
		if (!buff.startsWith("ship_")) return;
		buff = buff.replace("ship_", "");
		if (ship[buff] && typeof ship[buff] === 'number') {
			ship[buff] = Math.round(ship[buff] * (1 + buffs[`ship_${buff}`].percent_increase));
		}
	});
	ship.buffed = true;
}

export function mergeShips(ship_schematics: Schematics[], ships: Ship[], max_buffs = false): Ship[] {
	let newShips: Ship[] = [];
	let power = 1 + (max_buffs ? 0.16 : 0);
	ship_schematics = structuredClone(ship_schematics);
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
				schematic.ship.actions = structuredClone(owned.actions) as ShipAction[];
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

			ship = structuredClone(ship) as Ship;
			ship.dps = Math.ceil(ship.attacks_per_second * ship.attack);

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
			ship = structuredClone(ship) as Ship;
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

export function setupShip(ship: Ship, crewStations: (CrewMember | PlayerCrew | undefined)[], pushAction = true, ignoreSeats = false, readBattleStations = false, ignorePassives = false, precopied = false): Ship | undefined {
	if (ship.predefined) return ship;
	if (readBattleStations && !crewStations?.length && ship.battle_stations?.some(bs => bs.crew)) {
		crewStations = ship.battle_stations.map(bs => bs.crew);
	}

	if (!ship?.battle_stations?.length || (!ignoreSeats && !crewStations?.length) || (!ignoreSeats && crewStations.length !== ship.battle_stations.length)) {
		if (ship.battle_stations === undefined) return ship;
		else return undefined;
	}

	let new_bs = ship.battle_stations.map(m => ({...m, crew: undefined } as BattleStation));
	let old_bs = ship.battle_stations;

	let newship = precopied ? {...ship, battle_stations: new_bs } : structuredClone({...ship, battle_stations: new_bs }) as Ship;

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

// export function refShip(input: ReferenceShip): Ship {
// 	return {...input, levels: undefined };
// }

export function refShips(input: ReferenceShip[]): Ship[] {
	return input.map(input => ({...input, levels: undefined }));
}
