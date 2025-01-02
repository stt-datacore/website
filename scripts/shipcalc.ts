import fs from 'fs';
import { CrewMember } from "../src/model/crew";
import { Ship, Schematics, BattleStations, BattleStation } from "../src/model/ship";
import { AttackInstant, ShipWorkerItem } from "../src/model/worker";
import { mergeShips } from "../src/utils/shiputils";
import { ChargeAction, iterateBattle } from "../src/workers/battleworkerutils";

function getShipDivision(rarity: number) {
    return rarity === 5 ? 3 : rarity >= 3 && rarity <= 4 ? 2 : 1;
}

function getCrewDivisions(rarity: number) {
    if (rarity === 5) return [3];
    if (rarity === 4) return [2, 3];
    else return [1, 2, 3];
}

const STATIC_PATH = `${__dirname}/../../static/structured/`;

interface SymbolScore {
    symbol: string,
    score: number,
    count: number,
    division: number
    damage: number,
    crew: string[]
}

type ShipCompat = {
    score: number,
    trigger: boolean,
    seat: boolean
};

interface Scoreable {
    group: number,
    average_index: number,
    count: number,
    final: number;
    max_damage: number,
    min_damage: number,
    max_compat: number,
    min_compat: number,
    average_compat: number
    average_damage: number,
    median_index: number,
    win_count: number,
    total_damage: number;
    duration: number;
    total_compat: number;
}

interface ScoreTotal extends Scoreable {
    max_ship: string,
    max_staff: string[],
    min_ship: string,
    min_staff: string[],
    original_indices: number[];
}

interface Score {
    fbb_data: ScoreTotal[];
    arena_data: ScoreTotal[];

    kind: 'crew' | 'ship';

    name: string;
    symbol: string;

    arena: number;
    arena_final: number;
    fbb: number;
    fbb_final: number;
    overall_final: number;
    overall: number;
}

interface BattleRun {
    crew: CrewMember;
    ship: Ship;
    boss?: Ship;
    division?: number;
    opponent?: Ship;
    damage: number;
    duration: number;
    seated: string[];
    compatibility: ShipCompat,
    limit: number,
    battle: 'arena' | 'fbb',
    type: 'defense' | 'offense',
    win: boolean
}

interface BattleRunCache {
    crew: string;
    ship: string;
    boss?: number;
    opponent?: string;
    division?: number;
    damage: number;
    duration: number;
    seated: string[];
    compatibility: ShipCompat,
    limit: number,
    battle: 'arena' | 'fbb',
    type: 'defense' | 'offense',
    win: boolean
}

function createScore(kind: 'crew' | 'ship', symbol: string) {
    return {
        kind,
        symbol,
        name: '',
        arena: 0,
        arena_final: 0,
        fbb: 0,
        fbb_final: 0,
        overall: 0,
        overall_final: 0,
        fbb_data: [],
        arena_data: []
    } as Score;
}

function getScore(score: Score, type: 'fbb' | 'arena', group: number) {
    if (type === 'fbb') {
        let s = score.fbb_data.find(f => f.group === group);
        if (s) return s;
    }
    else {
        let s = score.arena_data.find(f => f.group === group);
        if (s) return s;
    }
    return addScore(score, type, group);
}

function addScore(score: Score, type: 'fbb' | 'arena', group: number) {
    const newobj = {
        group,
        average_index: 0,
        count: 0,
        final: 0,
        max_ship: '',
        max_staff: [],
        max_damage: 0,
        median_index: 0,
        win_count: 0,
        total_damage: 0,
        total_compat: 0,
        duration: 0,
        min_ship: '',
        min_staff: [],
        min_damage: 0,
        average_damage: 0,
        original_indices: [],
        min_compat: 0,
        max_compat: 0,
        average_compat: 0
    } as ScoreTotal;

    if (type === 'fbb') {
        score.fbb_data.push(newobj);
    }
    else {
        score.arena_data.push(newobj);
    }

    return newobj
}

function highestLevel(ship: Ship) {
	if (!ship.levels || !Object.keys(ship.levels).length) return 0;
	let levels = Object.keys(ship.levels).map(m => Number(m)).sort((a ,b) => b - a);
	let highest = levels[0];
	return highest;
}

function processShips(): void {
	let ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
	let battle_stations = JSON.parse(fs.readFileSync(STATIC_PATH + 'battle_stations.json', 'utf-8')) as BattleStations[];
	let data = { ship_schematics, battle_stations };
	if (data.battle_stations.length && data.ship_schematics.length) {
		for (let sch of data.ship_schematics) {
			let battle = data.battle_stations.find(b => b.symbol === sch.ship.symbol);
			if (battle) {
				sch.ship.battle_stations = battle.battle_stations;
			}
		}
		fs.writeFileSync(STATIC_PATH + "ship_schematics.json", JSON.stringify(data.ship_schematics));
	}
}

const shipnum = (ship: Ship) => (ship.hull - (ship.attack * ship.attacks_per_second)) / (ship.hull + (ship.attack * ship.attacks_per_second));

function processCrewShipStats(rate = 10, arena_variance = 0, fbb_variance = 0) {

    const Triggers = {
        0: 'None',
		1: 'Position',
		2: 'Cloak',
		4: 'Boarding',
    }
    const printTrigger = (c: CrewMember) => {
        if (!c.action.ability?.condition && !c.action.limit) return '';
        else if (c.action.ability?.condition && c.action.limit) {
            return ` (${Triggers[c.action.ability.condition]}, ${c.action.limit})`;
        }
        else if (c.action.ability?.condition) {
            return ` (${Triggers[c.action.ability.condition]})`;
        }
        else if (c.action?.limit) {
            return ` (${c.action.limit})`;
        }
        return "";
    }

    const offense = 0.528;
    const defense = 0.528;

	const OFFENSE_ABILITIES = [0, 1, 4, 5, 7, 8, 10, 12];
	const DEFENSE_ABILITIES = [2, 3, 6, 9, 10, 11];

	const OFFENSE_ACTIONS = [0, 2];
	const DEFENSE_ACTIONS = [1];

	const unm_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":5200000000,"evasion":0,"attack":700000,"accuracy":120000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 6, antimatter: 0, level: 10};
	const nm_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":3700000000,"evasion":0,"attack":570000,"accuracy":105000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 5, antimatter: 0, level: 10};
	const brutal_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":1150000000,"evasion":0,"attack":225000,"accuracy":80000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 4, antimatter: 0, level: 10}
	const hard_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":220000000,"evasion":0,"attack":206000,"accuracy":70000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 3, antimatter: 0, level: 10};
	const normal_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":160000000,"evasion":0,"attack":92000,"accuracy":35000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 2, antimatter: 0, level: 10};
	const easy_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":20000000,"evasion":0,"attack":45000,"accuracy":15000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 1, antimatter: 0, level: 10};
	const all_bosses = [easy_boss, normal_boss, hard_boss, brutal_boss, nm_boss, unm_boss];

	const runStart = new Date();

	const ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
	const crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];

    const boompool = crew.filter(f => f.action.ability?.type === 1 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);
    const critpool = crew.filter(f => f.action.ability?.type === 5 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);
    const hrpool = crew.filter(f => f.action.ability?.type === 2 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount || a.action.cycle_time - b.action.cycle_time);

    let ships = mergeShips(ship_schematics.filter(sc => highestLevel(sc.ship) == (sc.ship.max_level ?? sc.ship.level) + 1 && (sc.ship.battle_stations?.length)), []);
    const origShips = JSON.parse(JSON.stringify(ships)) as Ship[];

	ships = ships
                .sort((a, b) => shipnum(b) - shipnum(a))
                //.slice(0, 7)

	const shipCompatibility = (ship: Ship, crew: CrewMember) => {
		let compat = 0;
        let trigger = false;
        let seat = false;
		if (ship.battle_stations?.some(bs => crew.skill_order.includes(bs.skill))) {
            seat = true;
			if (crew.action.ability?.condition) {
				compat += 0.25;
			}
			else {
				compat += 1;
			}
		}
		if (crew.action.ability?.condition) {
			if (ship.actions?.some(a => a.status == crew.action.ability?.condition)) {
				compat += 0.75;
                trigger = true;
			}
		}
		return { score: compat, trigger, seat } as ShipCompat;
	}

	const characterizeCrew = (crew: CrewMember) => {
		let ability = crew.action.ability?.type;
		let action = crew.action.bonus_type;
		const result = {
			offense: 0,
			defense: 0
		}
		if (ability) {
			if (OFFENSE_ABILITIES.includes(ability)) result.offense++;
			if (DEFENSE_ABILITIES.includes(ability)) result.defense++;
		}
		if (result.defense > result.offense) return -1;

		if (OFFENSE_ACTIONS.includes(action)) result.offense++;
		if (DEFENSE_ACTIONS.includes(action)) result.defense++;

		if (result.defense > result.offense) return -1;
		else return 1;
	}

	const getBosses = (ship?: Ship, crew?: CrewMember) => {
		const bosses = [] as Ship[];
		all_bosses.forEach((boss, idx) => {
			let rarity = boss.id - 1;
			if (ship) {
				if (rarity === 5 && ship.rarity !== 5) return;
				if (rarity === 4 && ship.rarity < 4) return;
				if (rarity === 3 && (ship.rarity < 3 || ship.rarity > 4)) return;
				if (rarity === 2 && (ship.rarity < 2 || ship.rarity > 4)) return;
				if (rarity === 1 && ship.rarity > 3) return;
				if (rarity === 0 && ship.rarity > 2) return;
			}
			if (crew) {
				if (boss.id === 1 && ![1, 2].includes(crew.max_rarity)) return;
                if (boss.id === 2 && ![1, 2, 3].includes(crew.max_rarity)) return;
                if (boss.id === 3 && ![1, 2, 3, 4].includes(crew.max_rarity)) return;
                if (boss.id === 4 && ![1, 2, 3, 4].includes(crew.max_rarity)) return;
                if (boss.id === 5 && ![1, 2, 3, 4, 5].includes(crew.max_rarity)) return;
                if (boss.id === 6 && ![1, 2, 3, 4, 5].includes(crew.max_rarity)) return;
			}
			bosses.push(boss);
		});

		return bosses;
	}

	const getStaffedShip = (ship: string | Ship, fbb: boolean, offs?: Score[], defs?: Score[], c?: CrewMember, no_sort = false) => {
        let data = typeof ship === 'string' ? origShips.find(f => f.symbol === ship) : origShips.find(f => f.symbol === ship.symbol);
        if (!data?.battle_stations?.length) return undefined;
        data = { ...data } as Ship;

        let division = getShipDivision(data.rarity);
        let boss = fbb ? getBosses(data).sort((a, b) => b.id - a.id)[0] : undefined;

        data.battle_stations = JSON.parse(JSON.stringify(data.battle_stations)) as BattleStation[];

        let cloak_min = 0;
        let cloak = data.actions?.find(act => act.status === 2);

        if (cloak && !fbb && cloak.initial_cooldown <= 4) {
            let others = data.actions!.filter(f => f.status !== 2).map(mp => mp.initial_cooldown).sort((a, b) => a - b);
            let ot = -1;
            if (others.length) ot = others[0];
            cloak_min = (cloak.initial_cooldown + cloak.duration);
            if (ot !== -1 && ot < cloak_min) cloak_min = ot;
        }

        let conds = data?.actions?.map(mp => mp.status).filter(f => f) as number[];
        let skills = data.battle_stations?.map(b => b.skill);
        let cs = crew.filter(cc =>
            (c && c.symbol === cc.symbol) ||
            ((!cloak_min || cc.action.initial_cooldown >= cloak_min) &&
            (
                (fbb && cc.max_rarity <= boss!.id) ||
                (!fbb && getCrewDivisions(cc.max_rarity).includes(division))
            ) &&
            (!cc.action.ability?.condition || conds.includes(cc.action.ability.condition)) &&
            cc.skill_order.some(sko => skills.includes(sko)))
        );

        let filtered: CrewMember[] = [];

        if (offs && defs) {
            let dmg = offs.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f && (!fbb || !f.action.limit)) as CrewMember[];
            let repair = defs.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f && (!fbb || !f.action.limit)) as CrewMember[];

            filtered = dmg.concat(repair);
        }
        else {
            filtered = [...cs];
        }

        if (!no_sort) {
            filtered.sort((a, b) => {
                if (c && c.symbol === a.symbol) return -1;
                if (c && c.symbol === b.symbol) return 1;
                let r = 0;
                if (a.action.ability?.type === b.action.ability?.type && a.action.ability?.type === 2 && a.action.ability?.amount === b.action.ability?.amount) {
                    r = ((a.action.cooldown + a.action.duration) - (b.action.cooldown + b.action.duration));
                }
                if (!r) r = a.action.bonus_type - b.action.bonus_type ||
                    b.action.bonus_amount - a.action.bonus_amount ||
                    a.action.initial_cooldown - b.action.initial_cooldown ||
                    (a.action.ability?.type ?? 99) - (b.action.ability?.type ?? 99) ||
                    (b.action.ability?.amount ?? 0) - (a.action.ability?.amount ?? 0);

                return r;

            });
        }

        let used = [] as string[];
        let ct = 0;
        let full = data.battle_stations.length;
        let filled = 0;
        let need_crit = 0;
        let need_boom = 0;
        let need_hr = 0;
        let crit = 0;
        let boom = 0;
        let hr = 0;

        let nopower = 99;
        let notype = 0;

        if (full === 1) {
            if (fbb) {
                need_hr = 1;
            }
            else {
                need_boom = 1;
            }
        }
        else if (full === 2) {
            if (fbb) {
                need_hr = 2;
            }
            else {
                need_boom = 1;
                need_crit = 1;
            }
        }
        else if (full === 3) {
            if (fbb) {
                need_hr = 2;
                need_boom = 1;
            }
            else {
                need_boom = 2;
                need_crit = 1;
            }
        }
        else if (full === 4) {
            if (fbb) {
                need_boom = 1;
                need_crit = 1;
                need_hr = 2;
            }
            else {
                need_boom = 3;
                need_crit = 1;
            }
        }

        if (c) {
            if (c.action.ability?.type === 2) {
                need_hr -= 1;
            }
            else if (c.action.ability?.type === 1) {
                need_boom -= 1;
            }
            else if (c.action.ability?.type === 5) {
                need_crit -= 1;
            }
            if (c.action.bonus_type === 0) {
                nopower = c.action.bonus_amount;
                notype = c.action.bonus_type;
            }
        }

        let ignore_skill = false;

        for (let pass = 0; pass < 4; pass++) {
            if (pass == 1 || pass == 3) {
                if (filled === full) break;
                ignore_skill = true;
            }
            else {
                if (filled === full) break;
                ignore_skill = false;
            }

            ct = 0;
            for (let bs of data.battle_stations) {
                if (bs.crew) continue;

                let d1 = filtered.find(f => {
                    if (f.action.ability?.condition && !pass) return false;
                    if (((!ignore_skill && !f.skill_order.includes(bs.skill)) || used.includes(f.symbol))) return false;
                    if (c && c.symbol === f.symbol) return true;
                    if (c && pass === 0) {
                        if (f.action.bonus_type === notype) {
                            if (f.action.bonus_amount > nopower) return  false;
                        }
                    }
                    if (f.action.ability?.type === 1 && (boom < need_boom || pass > 1)) {
                        boom++;
                        return true;
                    }
                    else if (f.action.ability?.type === 5 && (crit < need_crit || pass > 1)) {
                        crit++;
                        return true;
                    }
                    else if (f.action.ability?.type === 2 && (hr < need_hr || pass > 1)) {
                        hr++;
                        return true;
                    }
                    else if (pass === 3) {
                        return true;
                    }
                    return false;
                });
                if (d1) {
                    filled++;
                    bs.crew = d1;
                    used.push(d1.symbol);
                }

                ct++;
            }
        }

        return data;
    }

    const cacheFile = "./battle_run_cache.json";
    let cached = [] as BattleRunCache[];

    if (fs.existsSync(cacheFile)) {
        if (process.argv.includes("--fresh")) {
            console.log("Purging battle run cache...");
            fs.unlinkSync(cacheFile);
        }
        else {
            console.log("Loading battle run cache...");
            cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        }
    }

    function battleRunsToCache(runs: BattleRun[], save = true): BattleRunCache[] {
        const result = runs.map(run => ({
            ...run,
            crew: run.crew.symbol,
            ship: run.ship.symbol,
            boss: run.boss?.id,
            opponent: run.opponent?.symbol
        }));
        if (save) {
            fs.writeFileSync(cacheFile, JSON.stringify(result));
        }
        return result;
    }

    function cacheToBattleRuns(cached: BattleRunCache[]): BattleRun[] {
        return cached.map(run => ({
            ...run,
            crew: crew.find(c => c.symbol === run.crew)!,
            ship: ships.find(c => c.symbol === run.ship)!,
            boss: run.boss && (run.boss as any) !== 'undefined' ? all_bosses.find(c => c.id === run.boss) : undefined,
            opponent: run.opponent ? ships.find(c => c.symbol === run.opponent) : undefined
        }));
    }

    let allruns = [] as BattleRun[];
    const crewcategories = {} as {[key: string]: 'defense' | 'offense' }
    crew.forEach((c) => crewcategories[c.symbol] = characterizeCrew(c) < 0 ? 'defense' : 'offense');

    let runidx = 0;
    let current_id = 1;
	let ignore_skill = true;
	let battle_mode = 'arena';

	const processBattleRun = (attacks: AttackInstant[], crew_set: CrewMember[], opponent?: Ship) => {
        if (!attacks?.length) return null;
		// let lastIdx = attacks.findLastIndex(a => a.actions.some(act => (act as any).comes_from === 'crew'));
        // attacks = attacks.slice(0, lastIdx + 1);
        // if (!attacks?.length) return null;
        let win = attacks.some(a => a.win);
        let result_crew = [] as CrewMember[];
		const ship = attacks[0].ship;

		ship.battle_stations?.forEach((bs) => {
			for (let c of crew_set) {
				if (!result_crew.includes(c)) {
					if (c.skill_order.includes(bs.skill) || ignore_skill) {
						result_crew.push(c);
						break;
					}
				}
			}
		});

		const attack = attacks.reduce((p, n) => p + n.attack, 0);
		const min_attack = attacks.reduce((p, n) => p + n.min_attack, 0);
		const max_attack = attacks.reduce((p, n) => p + n.max_attack, 0);
		const battle_time = attacks.reduce((p, n) => p > n.second ? p : n.second, 0);

        let weighted_attack = 0;

        if (battle_mode === 'skirmish') {
			weighted_attack = attacks.reduce((p, n) => (p + (!n.second ? 0 : (n.attack / (n.second * 2)))), 0);
		}
		else {
			weighted_attack = attacks.reduce((p, n) => (p + (!n.second ? 0 : (n.attack / n.second))), 0);
		}

		let highest_attack = 0;
		let high_attack_second = 0;

		attacks.forEach((attack) => {
			if (attack.max_attack > highest_attack) {
				highest_attack = attack.max_attack;
				high_attack_second = attack.second;
			}
		});

		let arena_metric = (highest_attack / high_attack_second);
		let skirmish_metric = weighted_attack;
		let fbb_metric = attack;

		return {
			id: current_id++,
			rate,
			battle_mode,
			attack,
			min_attack,
			max_attack,
			battle_time,
			crew: result_crew,
			percentile: 0,
			ship: attacks[0].ship,
			weighted_attack,
			skirmish_metric,
			arena_metric,
			fbb_metric,
            opponent: opponent ?? attacks[0].ship,
            win
			//attacks: get_attacks ? attacks : undefined
		} as ShipWorkerItem & { opponent: Ship };
	}

    // const flat_arena = ships.map(ship => processBattleRun(iterateBattle(rate, false, ship, [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, arena_variance, true), [], ship)!);
    // const flat_fbb = ships.map(ship => getBosses(ship).map((boss) => processBattleRun(iterateBattle(rate, true, ship, [], boss, undefined, undefined, undefined, undefined, undefined, undefined, fbb_variance, true), [], boss)!)).flat();

    const runBattles = (ship: Ship, testcrew: CrewMember | CrewMember[], allruns: BattleRun[], runidx: number, no_arena = false, no_fbb = false, opponent?: Ship) => {
        if (!Array.isArray(testcrew)) testcrew = [testcrew];

        const c = testcrew[0];

        const crewtype = characterizeCrew(c) < 0 ? 'defense' : 'offense';
        const compat = shipCompatibility(ship, c);
        const ship_division = getShipDivision(ship.rarity);
        const crew_divisions = getCrewDivisions(c.max_rarity);

        const ignore_defeat_arena = false;
        const ignore_defeat_fbb = false; // crewtype === 'offense';

        let staff = testcrew; // testcrew.length > 1 ? testcrew : getStaffedShip(ship, false, undefined, undefined, c)?.battle_stations?.map(bs => bs.crew!) || testcrew;

        battle_mode = 'arena';
        let result: AttackInstant[] = [];
        // Test Arena
        if (!no_arena && crew_divisions.includes(ship_division)) {
            //let fa = flat_arena.find(fa => fa.ship.symbol === ship.symbol)!
            result = iterateBattle(rate, false, ship, staff, opponent, undefined, undefined, undefined, undefined, undefined, undefined, arena_variance, true, ignore_defeat_arena);
            if (result.length) {
                result[0].ship = ship;
                let attack = processBattleRun(result, staff, opponent);
                if (attack) {
                    let time = attack.battle_time;
                    let dmg = attack.attack; // - fa.attack;
                    allruns[runidx++] = {
                        crew: c,
                        ship: ship,
                        damage: dmg,
                        duration: time,
                        type: crewtype,
                        battle: 'arena',
                        seated: staff.map(i => i.symbol),
                        win: !!attack.win,
                        compatibility: compat,
                        limit: c.action?.limit ?? 0,
                        division: ship_division,
                        opponent
                    }
                }
            }
        }

        if (!no_fbb) {
            battle_mode = 'fbb';

            // Test FBB
            let bosses = getBosses(ship, c);
            if (bosses?.length) {
                bosses.sort((a, b) => b.id - a.id);
                //if (!every_boss) bosses = bosses.slice(0, 1);

                bosses.forEach((boss) => {
                    //let fb = flat_fbb.find(fa => fa.ship.symbol === ship.symbol && fa.opponent.id === boss.id)!
                    let newstaff = [...staff];
                    //let newstaff = testcrew.length > 1 ? [...testcrew] : getStaffedShip(ship, true, undefined, undefined, c)?.battle_stations?.map(bs => bs.crew!) || [...testcrew];

                    if (newstaff.length === 1) {
                        if (c.action.ability?.type === 2) {
                            // for (let i = 1; i < ship.battle_stations!.length && i < 2; i++) {
                                newstaff.push(c);
                            //}
                        }
                        else if (crewtype !== 'defense') {
                            let compathr = hrpool.filter(
                                ff => ff.max_rarity <= boss.id
                                &&
                                (
                                    ff.action.bonus_type !== c.action.bonus_type ||
                                    ff.action.bonus_amount < c.action.bonus_amount
                                )
                            );
                            if (compathr?.length) {
                                let olen = newstaff.length;
                                for (let i = olen; i < ship.battle_stations!.length && i < olen + 2 && i < compathr.length; i++) {
                                    newstaff.push(compathr[i-1]);
                                }
                            }
                            // if (c.action.ability?.type === 1) {
                            //     let compatcrit = critpool.filter(
                            //         ff => ff.max_rarity <= boss.id &&
                            //         ff.action.bonus_type !== 0 &&
                            //         (
                            //             ff.action.bonus_type !== c.action.bonus_type ||
                            //             ff.action.bonus_amount < c.action.bonus_amount
                            //         )
                            //     );
                            //     if (compatcrit?.length) {
                            //         let olen = newstaff.length;
                            //         for (let i = olen; i < ship.battle_stations!.length && i < olen + 1 && i < compatcrit.length; i++) {
                            //             newstaff.push(compatcrit[i-1]);
                            //         }
                            //     }
                            // }
                            // else if (c.action.ability?.type === 5) {
                            //     let compatboom = boompool.filter(
                            //         ff => ff.max_rarity <= boss.id &&
                            //         ff.action.bonus_type !== 0 &&
                            //         (
                            //             ff.action.bonus_type !== c.action.bonus_type ||
                            //             ff.action.bonus_amount < c.action.bonus_amount
                            //         )
                            //     );
                            //     if (compatboom?.length) {
                            //         let olen = newstaff.length;
                            //         for (let i = olen; i < ship.battle_stations!.length && i < olen + 1 && i < compatboom.length; i++) {
                            //             newstaff.push(compatboom[i-1]);
                            //         }
                            //     }
                            // }
                        }
                    }

                    result = iterateBattle(rate, true, ship, newstaff, boss, defense, offense, undefined, undefined, undefined, undefined, fbb_variance, true, ignore_defeat_fbb);
                    if (result.length) {
                        let attack = processBattleRun(result, newstaff, boss);
                        if (attack) {
                            let time = attack.battle_time;
                            let dmg = attack.attack;

                            if (c.action.limit) {
                                let exp = (c.action.limit * c.action.duration) +
                                          ((c.action.limit - 1) * c.action.cooldown) +
                                          c.action.initial_cooldown;

                                dmg *= (exp / 180);
                            }

                            allruns[runidx++] = {
                                crew: c,
                                ship: ship,
                                boss,
                                damage: dmg,
                                duration: time,
                                type: crewtype,
                                battle: 'fbb',
                                seated: newstaff.map(i => i.symbol),
                                win: !!attack.win,
                                compatibility: compat,
                                limit: c.action?.limit ?? 0
                            }
                        }
                    }
                });
            }
        }

        return runidx;
    }

	let count = 1;
    let cship = ships.length;

    const nextOpponent = (division: number, i: number) => {
        let j = i + 1;
        while (j < cship) {
            let oppo = ships[j];
            if (getShipDivision(oppo.rarity) === division) return oppo;
            j++;
        }
        j = 0;
        while (j < i) {
            let oppo = ships[j];
            if (getShipDivision(oppo.rarity) === division) return oppo;
            j++;
        }
        return undefined;
    }

    if (!cached?.length) {
        console.log("Calculate crew and ship battle scores...");
        console.log(`Frame Rate: ${rate} per second.`)

        allruns.length = (ships.length * crew.length * 18);
        console.log(`Alloc ${allruns.length} items.`);

        let calclen = ships.length * 4;
        for (let i = 0; i < cship; i++) {
            let ship = ships[i];
            let opponent = nextOpponent(getShipDivision(ship.rarity), i);

            console.log(`Run all crew on ${ship.name} (FBB Only) (${count++} / ${calclen})...`);

            for (let c of crew) {
                if (opponent?.battle_stations?.length) {
                    opponent.battle_stations[0].crew = c;
                }
                runidx = runBattles(ship, c, allruns, runidx, true, false);
            }

            console.log(`Run all crew on ${ship.name} (Arena Only; Opponent: SELF) (${count++} / ${calclen})...`);

            for (let c of crew) {
                if (opponent?.battle_stations?.length) {
                    opponent.battle_stations[0].crew = c;
                }
                runidx = runBattles(ship, c, allruns, runidx, false, true);
            }

            console.log(`Run all crew on ${ship.name} (Arena Only; Opponent: ${opponent?.name ?? 'NONE'}) (${count++} / ${calclen})...`);

            for (let c of crew) {
                if (opponent?.battle_stations?.length) {
                    opponent.battle_stations[0].crew = c;
                }
                runidx = runBattles(ship, c, allruns, runidx, false, true, opponent);
            }

            if (opponent) {
                console.log(`Run all crew on ${opponent.name} (Arena Only; Opponent: ${ship?.name}) (${count++} / ${calclen})...`);
                for (let c of crew) {
                    if (opponent?.battle_stations?.length) {
                        opponent.battle_stations[0].crew = c;
                    }
                    runidx = runBattles(opponent, c, allruns, runidx, false, true, ship);
                }
            }
        }

        console.log("Saving battle run cache...");
        allruns.splice(runidx);

        battleRunsToCache(allruns);
    }
    else {
        allruns = cacheToBattleRuns(cached);
        runidx = allruns.length;
    }

    console.log("Filtering runs into arena and fbb buckets ...");

    const origruns = allruns.slice();

    const fbbruns: BattleRun[] = [];
    fbbruns.length = runidx;
    const arenaruns: BattleRun[] = [];
    arenaruns.length = runidx;

    let fc = 0;
    let ac = 0;
    for (let run of allruns) {
        if (run.battle === 'fbb') {
            fbbruns[fc++] = run;
        }
        else if (run.battle === 'arena') {
            arenaruns[ac++] = run;
        }
    }

    fbbruns.splice(fc);
    arenaruns.splice(ac);

    allruns.length = 0;

    const shipscores = [] as Score[];
    const crewscores = [] as Score[];

    const createScoreData = (trigger_compat: boolean, seat_compat: boolean, ship_only = false) => {
        shipscores.length = 0;
        if (!ship_only) crewscores.length = 0;

        const scoreRun = (runs: BattleRun[], mode: number, scores: Score[], score_type: 'crew' | 'ship') => {
            if (mode === 0) {
                runs.sort((a, b) => (a.win != b.win) ? (a.win ? -1 : 1) : (b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score));
            }
            else {
                runs.sort((a, b) => b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score);
            }

            let z = -1;
            let score: Score | undefined = undefined;
            const indexes = {} as { [symbol: string]: { [div: string]: number[] } };

            for (let run of runs) {
                z++;

                if (trigger_compat && (run.compatibility.trigger === true && run.compatibility.score !== 1)) continue;
                if (seat_compat && !run.compatibility.seat) continue;

                let item: CrewMember | Ship;
                if (score_type === 'crew') {
                    item = crew.find(f => f.symbol === run.crew.symbol)!;
                }
                else {
                    item = ships.find(f => f.symbol === run.ship.symbol)!;
                }
                score = scores.find(cs => cs.symbol === item.symbol);
                if (!score) {
                    score = createScore(score_type, item.symbol);
                    scores.push(score);
                }

                const div_id = mode ? (run.boss?.id ?? 0) : run.division ?? 0;

                indexes[item.symbol] ??= {}
                indexes[item.symbol][div_id] ??= [];
                indexes[item.symbol][div_id].push(z);

                const scoreset = getScore(score, mode ? 'fbb' : 'arena', div_id);
                scoreset.original_indices.push(z);

                if (run.damage > scoreset.max_damage) {
                    scoreset.max_damage = run.damage;
                    scoreset.max_ship = run.ship.symbol;
                    if (run.seated?.length) {
                        scoreset.max_staff = [...run.seated]
                    }
                    else {
                        scoreset.max_staff = [run.crew.symbol]
                    }
                    scoreset.max_compat = run.compatibility.score;
                }
                if (!scoreset.min_damage || run.damage < scoreset.min_damage) {
                    scoreset.min_damage = run.damage;
                    scoreset.min_ship = run.ship.symbol;
                    if (run.seated?.length) {
                        scoreset.min_staff = [...run.seated]
                    }
                    else {
                        scoreset.min_staff = [run.crew.symbol]
                    }
                    scoreset.min_compat = run.compatibility.score;
                }
                scoreset.total_compat += run.compatibility.score;
                scoreset.duration += run.duration;
                scoreset.total_damage += run.damage;
                scoreset.count++;
                if (run.win) scoreset.win_count++;
            }

            Object.entries(indexes).forEach(([symbol, groups]) => {
                Object.entries(groups).forEach(([group, values]) => {
                    if (!values.length) return;
                    score = scores.find(cs => cs.symbol === symbol);
                    if (score) {
                        const scoreset = getScore(score, mode ? 'fbb' : 'arena', Number(group));
                        if (values.length > 2) {
                            scoreset.median_index = values[Math.floor(values.length / 2)];
                        }
                        scoreset.average_index = values.reduce((p, n) => p + n, 0) / values.length;
                    }
                });
            });
        }

        [arenaruns, fbbruns].forEach((runs, mode) => {
            if (!ship_only) {
                scoreRun(runs, mode, crewscores, 'crew');
            }
            scoreRun(runs, mode, shipscores, 'ship');
        });
    }

    const normalizeScores = (scores: Score[]) => {
        let max = 0;
        if (!scores.length) return;

        const _calc = (key: string) => {
            scores.sort((a, b) => b[key] - a[key]);
            max = scores[0][key];
            for (let score of scores) {
                score[key] = Math.round((score[key] / max) * 1000) / 100;
            }
        }
        _calc("arena_final");
        _calc("fbb_final");

        const arena_max = {} as { [key: string]: number };
        const fbb_max = {} as { [key: string]: number };
        // Compute overall from normalized component scores
        scores.forEach((score) => {
            score.overall_final = (score.fbb_final + score.arena_final) / 2;

            [score.arena_data, score.fbb_data].forEach((data, idx) => {
                data.forEach((unit) => {
                    if (idx == 0) {
                        arena_max[unit.group] ??= 0;
                        if (arena_max[unit.group] < unit.final) {
                            arena_max[unit.group] = unit.final;
                        }
                    }
                    else {
                        fbb_max[unit.group] ??= 0;
                        if (fbb_max[unit.group] < unit.final) {
                            fbb_max[unit.group] = unit.final;
                        }
                    }
                });
            });
        });

        scores.forEach((score) => {
            [score.arena_data, score.fbb_data].forEach((data, idx) => {
                data.forEach((unit) => {
                    if (idx === 0) {
                        unit.final = Math.round((unit.final / arena_max[unit.group]) * 1000) / 100;
                    }
                    else {
                        unit.final = Math.round((unit.final / fbb_max[unit.group]) * 1000) / 100;
                    }

                });
            });
        });

        // Normalize overall score
        _calc("overall_final");
    }

    const processScores = (scores: Score[], pass2 = false) => {
        scores.forEach((score) => {
            score.arena_data.sort((a, b) => b.group - a.group);
            score.fbb_data.sort((a, b) => b.group - a.group);
            score.arena_data.forEach((data) => {
                data.average_damage = data.total_damage / data.count;
                data.average_compat = data.total_compat / data.count;
            });

            score.fbb_data.forEach((data) => {
                data.average_damage = data.total_damage / data.count;
                data.average_compat = data.total_compat / data.count;
            });
        });

        const getLikeScores = (score: Score, mode: 'arena' | 'fbb', group: number) => {
            let results = scores.filter(s => {
                if (score.kind != s.kind) return false;
                if (mode === 'arena') {
                    return s.arena_data.some(a => a.group === group);
                }
                else {
                    return s.fbb_data.some(a => a.group === group);
                }
            });
            return results.map(s => {
                if (mode === 'arena') {
                    return s.arena_data.find(f => f.group === group)!
                }
                else {
                    return s.fbb_data.find(f => f.group === group)!
                }
            });
        }

        const getTopScore = (scores: Scoreable[], mode: 'arena' | 'fbb') => {
            if (mode === 'fbb') {
                return scores.map(ss => ss.total_damage).reduce((p, n) => p > n ? p : n, 0);
            }
            else {
                return scores.map(ss => ss.average_index).reduce((p, n) => p > n ? p : n, 0);
            }
        }

        const getWinScore = (scores: Scoreable[], mode: 'arena' | 'fbb') => {
            let result = scores.map(ss => ss.win_count).reduce((p, n) => p > n ? p : n, 0);
            if (result) return result;
            if (mode === 'fbb') {
                return scores.map(ss => ss.total_damage).reduce((p, n) => p > n ? p : n, 0);
            }
            else {
                return scores.map(ss => ss.duration).reduce((p, n) => p > n ? p : n, 0);
            }
        }

        const getMyScore = (top: number, score: Scoreable, mode: 'arena' | 'fbb') => {
            if (mode === 'fbb') {
                return score.total_damage;
            }
            else {
                return score.average_index;
            }
        }

        const getMyWinScore = (top: number, score: Scoreable, mode: 'arena' | 'fbb') => {
            let result = score.win_count;
            if (top) return result;

            if (mode === 'fbb') {
                return score.total_damage;
            }
            else {
                return score.duration;
            }
        }

        const computeScore = <T extends { symbol: string, name?: string }>(score: Score, c: T) => {

            score.arena_data = score.arena_data.sort((a, b) => b.group - a.group).slice(0, 1);
            score.fbb_data = score.fbb_data.sort((a, b) => b.group - a.group).slice(0, 1);

            let a_groups = score.arena_data.map(m => m.group);
            let b_groups = score.fbb_data.map(m => m.group);

            for (let ag of a_groups) {
                const raw_score = score.arena_data.find(f => f.group === ag)!;
                const ls_arena = getLikeScores(score, 'arena', ag);
                const arena_mul = 1;
                const topscore_arena = getTopScore(ls_arena, 'arena');

                score.name = c.name!;

                let my_arena = 0;
                let my_arenawin = 0;

                let my_arena_score = getMyScore(topscore_arena, raw_score, 'arena');

                my_arena = (my_arena_score / topscore_arena) * 100;
                my_arena *= arena_mul;

                if (!pass2) {
                    raw_score.final = my_arena;
                }
                else {
                    const maxwins_arena = getWinScore(ls_arena, 'arena');
                    let mywins_arena = getMyWinScore(maxwins_arena, raw_score, 'arena');

                    if (maxwins_arena && mywins_arena) {
                        my_arenawin = (mywins_arena / maxwins_arena) * 100;
                        my_arenawin *= arena_mul;
                        raw_score.final = (my_arena + my_arenawin) / 2;
                    }
                    else {
                        raw_score.final = my_arena;
                    }
                }
            }

            for (let bg of b_groups) {
                const raw_score = score.fbb_data.find(f => f.group === bg)!;
                const ls_fbb = getLikeScores(score, 'fbb', bg);
                const fbb_mul = 1;
                const topscore_fbb = getTopScore(ls_fbb, 'fbb');

                score.name = c.name!;

                let my_fbb = 0;
                let my_fbbwin = 0;

                let my_fbb_score = getMyScore(topscore_fbb, raw_score, 'fbb');

                my_fbb = (my_fbb_score / topscore_fbb) * 100;
                my_fbb *= fbb_mul;

                raw_score.final = my_fbb;
            }

            score.arena_final = score.arena_data.map(ad => ad.final * ad.group).reduce((p, n) => p + n, 0) / score.arena_data.length;
            score.fbb_final = score.fbb_data.map(ad => ad.final * ad.group).reduce((p, n) => p + n, 0) / score.fbb_data.length;
        }

        scores.forEach((score) => {
            let c = (crew.find(f => f.symbol === score.symbol) || ships.find(f => f.symbol === score.symbol))!;
            computeScore(score, c);
        });

        normalizeScores(scores);
    }

    const getShips = (crew: string | Score, scores: Score[], battle: 'arena' | 'fbb', group: number) => {
        const score = typeof crew === 'string' ? scores.find(cs => cs.symbol === crew) : crew;
        if (!score) {
            return undefined;
        }
        const totals = getScore(score, battle, group);
        if (!totals?.original_indices?.length) return undefined;

        const runs = [...new Set(totals.original_indices.map(i => origruns[i])) ];
        runs.sort((a, b) => battle === 'arena' && a.win != b.win ? (a.win ? -1 : 1) : b.damage - a.damage || b.duration - a.duration)
        const shipscore = {} as {[key: string]: number };
        const shipcount = {} as {[key: string]: number };
        const shipdmg = {} as {[key: string]: number };
        const shipcrew = {} as {[key: string]: string[] };
        runs.forEach((run, idx) => {
            let key = run.ship.symbol;
            shipscore[key] ??= 0;
            shipcount[key] ??= 0;
            shipdmg[key] ??= 0;
            shipdmg[key] += run.damage;
            shipcrew[key] ??= [];
            shipcrew[key] = shipcrew[key].concat(run.seated);
            shipscore[key] += idx + 1;
            shipcount[key]++;
        });
        const results: SymbolScore[] = Object.keys(shipscore).map((ship) => {
            return ({
                symbol: ship,
                score: (shipscore[ship] / shipcount[ship]),
                count: shipcount[ship],
                division: group,
                crew: shipcrew[ship],
                damage: shipdmg[ship]
            });
        });
        results.sort((a, b) => b.score - a.score || b.count - a.count);
        const max = results[0].score;
        results.forEach((r) => {
            r.score = Math.round((r.score / max) * 1000) / 100;
        });
        return results;
    }

    console.log("\nTabulating Results ...");
    createScoreData(true, true);

    const offs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense');
    const defs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense');
    const ship_2 = shipscores.filter(ss => ss.arena_data.some(ad => ad.total_damage) && ss.fbb_data.some(fd => fd.total_damage));

    console.log("Scoring Offense ...");
    processScores(offs_2);
    console.log("Scoring Defense ...");
    processScores(defs_2);
    console.log("Scoring Ships ...");
    processScores(ship_2);

    console.log("Mapping best crew to ships...");

    let arena_p2 = ships.map(sh => getStaffedShip(sh, false, offs_2, defs_2)).filter(f => !!f)
        .concat(ships.map(sh => getStaffedShip(sh, false, offs_2, defs_2, undefined, true)).filter(f => !!f));
    let fbb_p2 = ships.map(sh => getStaffedShip(sh, true, offs_2, defs_2)).filter(f => !!f)
        .concat(ships.map(sh => getStaffedShip(sh, true, offs_2, defs_2, undefined, true)).filter(f => !!f));

    allruns.length = (arena_p2.length + fbb_p2.length) * (arena_p2.length + fbb_p2.length) * 6;
    runidx = 0;

    console.log("Run Ships, Pass 2...");
    count = 1;

    for (let ship of arena_p2) {
        let crew = ship.battle_stations!.map(m => m.crew!);
        console.log(`Playing arena on ${ship.name} against all compatible ships (${count++} / ${ships.length})...`);
        let division = getShipDivision(ship.rarity);
        for (let ship2 of arena_p2) {
            if (ship == ship2) continue;
            if (getShipDivision(ship2.rarity) !== division) continue;
            runidx = runBattles(ship, crew, allruns, runidx, false, true, ship2);
        }
    }

    count = 1;

    for (let ship of fbb_p2) {
        console.log(`Running FBB on ${ship.name} (${count++} / ${ships.length})...`);
        let crew = ship.battle_stations!.map(m => m.crew!);
        runidx = runBattles(ship, crew, allruns, runidx, true, false, undefined);
    }

    console.log("Score Ships, Pass 2...");
    allruns.splice(runidx);

    arenaruns.length = 0;
    arenaruns.length = runidx;
    fbbruns.length = 0;
    fbbruns.length = runidx;

    fc = 0;
    ac = 0;

    for (let run of allruns) {
        if (run.battle === 'fbb') {
            fbbruns[fc++] = run;
        }
        else if (run.battle === 'arena') {
            arenaruns[ac++] = run;
        }
    }

    fbbruns.splice(fc);
    arenaruns.splice(ac);

    allruns.length = 0;

    createScoreData(true, true, true);

    const ship_3 = shipscores.filter(ss => ss.arena_data.some(ad => ad.total_damage) && ss.fbb_data.some(fd => fd.total_damage));

    processScores(ship_3, true);

    console.log("Factoring ship grades into final crew grades.");
    // Got the good crew, got the good ships from the good crew,
    // now let's bump the good crew higher if their ships are higher

    // ** Code is incomplete and currently does nothing! **
    // for (let c of crew) {
    //     let cs = crewscores.find(f => f.symbol === c.symbol);
    //     if (!cs) continue;

    //     let arenadivs = getCrewDivisions(c.max_rarity);
    //     let fbbdivs = getBosses(undefined, c).map(m => m.id);

    //     arenadivs.forEach((div) => {
    //         let tests = getShips(cs, crewscores, 'arena', div);
    //         let scurr = getScore(cs, 'arena', div);
    //         if (tests?.length) {
    //             tests.sort((a, b) => ship_3.findIndex(s3 => s3.symbol === a.symbol) - ship_3.findIndex(s3 => s3.symbol === b.symbol));
    //             scurr.max_damage = tests[0].damage;
    //             scurr.max_ship = tests[0].symbol;
    //             scurr.max_staff = tests[0].crew;
    //         }
    //     });

    //     fbbdivs.forEach((div) => {
    //         let tests = getShips(cs, crewscores, 'fbb', div);
    //         let scurr = getScore(cs, 'fbb', div);
    //         if (tests?.length) {
    //             tests.sort((a, b) => ship_3.findIndex(s3 => s3.symbol === a.symbol) - ship_3.findIndex(s3 => s3.symbol === b.symbol));
    //             scurr.max_damage = tests[0].damage;
    //             scurr.max_ship = tests[0].symbol;
    //             scurr.max_staff = tests[0].crew;
    //         }
    //     });
    //     cs.arena_data.sort((a, b) => b.group - a.group);
    //     cs.fbb_data.sort((a, b) => b.group - a.group);
    // }

    // crewscores.forEach((cs) => {
    //     cs.overall_final = (cs.arena_final + cs.fbb_final) / 2;
    // });

    // offs_2.sort((a, b) => b.overall_final - a.overall_final);
    // defs_2.sort((a, b) => b.overall_final - a.overall_final);

    // normalizeScores(offs_2);
    // normalizeScores(defs_2);

    const shipidx = 2;

    console.log("Name", "Overall", "Arena", "FBB");
    console.log("".padEnd(40, ""), "Arena Ship/Crew");
    console.log("".padEnd(40, ""), "FBB Ship/Crew");
    console.log("-------------------------------------------------------------------");

    const tc = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1);

    const buffer = [] as string[];

    function printAndLog(...params: any[]) {
        let text = params.join(" ");
        buffer.push(text);
        console.log(...params);
    }

    let keldon = origruns.filter(f => f.crew.symbol === 'uhura_red_crew' && f.ship.symbol === 'car_keldon_ship' && f.battle === 'arena');
    keldon.sort((a, b) => b.damage - a.damage);

    [offs_2, defs_2, ship_3].forEach((scores, idx) => {
        printAndLog(" ");
        printAndLog(`${idx == 0 ? 'Offense' : idx == 1 ? 'Defense' : 'Ship'}`);
        printAndLog(" ");
        let working = scores.slice(0, 100);
        let arena_high = scores.find(f => f.arena_final === 10);
        if (arena_high) {
            printAndLog(`Highest Arena: ${arena_high.name}, Max Damage: ${arena_high.arena_data[0].max_damage}`);
            if (!working.includes(arena_high)) {
                working.push(arena_high);
            }
        }
        let fbb_high = scores.find(f => f.fbb_final === 10);
        if (fbb_high) {
            printAndLog(`Highest FBB: ${fbb_high.name}, Max Damage: ${fbb_high.fbb_data[0].max_damage}`);
            if (!working.includes(fbb_high)) {
                working.push(fbb_high);
            }
        }
        printAndLog(" ");

        for (let item of working) {
            let triggered = false;
            let c = crew.find(f => f.symbol === item.symbol);
            if (c && c.action.ability?.condition) triggered = true;

            let arena_crew = crew.filter(f => item.arena_data?.length && item.arena_data[0].max_staff.includes(f.symbol));
            let fbb_crew = crew.filter(f => item.fbb_data?.length && item.fbb_data[0].max_staff.includes(f.symbol));
            let arena_ship = ships.find(f => item.arena_data?.length && f.symbol === item.arena_data[0].max_ship);
            let fbb_ship = ships.find(f => item.fbb_data?.length && f.symbol === item.fbb_data[0].max_ship);
            if (!arena_crew || !fbb_crew || !arena_ship || !fbb_ship) return;

            printAndLog(
                item.name.padEnd(40, " "),
                `${item.overall_final}`.padEnd(5, ' '),
                `${item.arena_final}`.padEnd(5, ' '),
                `${item.fbb_final}`.padEnd(5, ' '),
                idx == shipidx ? 'Ship' : 'Crew',
                idx == shipidx ? 'Ship' : tc(crewcategories[item.symbol]).padEnd(7, " "),
                `${c ? printTrigger(c) : ''}`
            );

            if (item.kind === 'ship') {
                printAndLog(" ".padEnd(40, " "), arena_crew.map(c => c.name + `${printTrigger(c)}`).join(", "));
                printAndLog(" ".padEnd(40, " "), fbb_crew.map(c => c.name + `${printTrigger(c)}`).join(", "));
            }
            else {
                printAndLog(" ".padEnd(40, " "), arena_ship?.name?.padEnd(20, " "));
                printAndLog(" ".padEnd(40, " "), fbb_ship?.name?.padEnd(20, " "));
            }
            item.arena_data.forEach((group) => {
                printAndLog(" ".padEnd(40, " "), `A${group.group}: ${group.final} (Max Dmg: ${Math.ceil(group.max_damage).toLocaleString()}, Avg Dmg: ${Math.ceil(group.average_damage).toLocaleString()}, ${group.count} Runs)`);
            });
            item.fbb_data.forEach((group) => {
                printAndLog(" ".padEnd(40, " "), `B${group.group}: ${group.final} (Max Dmg: ${Math.ceil(group.max_damage).toLocaleString()}, Avg Dmg: ${Math.ceil(group.average_damage).toLocaleString()}, ${group.count} Runs)`);
            });
        }
    });

    console.log("Writing report and raw scores...");
    fs.writeFileSync("./battle_run_report.txt", buffer.join("\n"));
    fs.writeFileSync("./battle_run_report.json", JSON.stringify(offs_2.concat(defs_2).concat(ship_3)));

	const runEnd = new Date();

	const diff = (runEnd.getTime() - runStart.getTime()) / (1000 * 60);

    console.log("Run Time", `${diff.toFixed(2)} minutes.`);

}

processShips();
processCrewShipStats(10, 0, 0);
