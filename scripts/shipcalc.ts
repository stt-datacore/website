import fs from 'fs';
import { CrewMember } from "../src/model/crew";
import { Ship, Schematics, BattleStations, BattleStation } from "../src/model/ship";
import { AttackInstant, ShipWorkerItem } from "../src/model/worker";
import { mergeShips } from "../src/utils/shiputils";
import { ChargeAction, iterateBattle } from "../src/workers/battleworkerutils";

const Commander = [[1, 2], [1, 2]] as [number[], number[]]
const Captain = [[3, 4], [1, 2, 3, 4]] as [number[], number[]]
const Admiral = [[5], [1, 2, 3, 4, 5]] as [number[], number[]]

function getLeague(ship: Ship): [number[], number[]] {
    for (let league of [Commander, Captain, Admiral]) {
        if (league[0].includes(ship.rarity)) return league;
    }
    return [[0], [0]];
}

const STATIC_PATH = `${__dirname}/../../static/structured/`;

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
    max: number,
    median_index: number,
    win_count: number,
    damage: number;
    duration: number;
}


interface ScoreTotal extends Scoreable {
    max_ship: string,
    max_staff: string[],
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
        max: 0,
        median_index: 0,
        win_count: 0,
        damage: 0,
        duration: 0,
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
        if (!c.action.ability?.condition) return '';
        else return " " + Triggers[c.action.ability.condition];
    }

    const ignoreDefeat = false;

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

    // let boompool = crew.filter(f => f.action.ability?.type === 1 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);
    // let critpool = crew.filter(f => f.action.ability?.type === 5 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);
    const hrpool = crew.filter(f => f.action.bonus_type !== 0 && f.action.ability?.type === 2 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);

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
		let bosses = [] as Ship[];
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
				if (crew.max_rarity > boss.id) return;
			}
			bosses.push(boss);
		});

		return bosses;
	}

	const getStaffedShip = (ship: string | Ship, fbb: boolean) => {
        let data = typeof ship === 'string' ? origShips.find(f => f.symbol === ship) : origShips.find(f => f.symbol === ship.symbol);
        if (!data?.battle_stations?.length) return undefined;
        data = { ...data } as Ship;

        let league = getLeague(data);
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
            (!cloak_min || cc.action.initial_cooldown >= cloak_min) &&
            (
                (fbb && cc.max_rarity <= boss!.id) ||
                (!fbb && league[1].includes(cc.max_rarity))
            ) &&
            (!cc.action.ability?.condition || conds.includes(cc.action.ability.condition)) &&
            cc.skill_order.some(sko => skills.includes(sko)));

        let dmg = offs_2.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f && (!fbb || !f.action.limit)) as CrewMember[];
        let repair = defs_2.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f && (!fbb || !f.action.limit)) as CrewMember[];

        let filtered = dmg.concat(repair);

        filtered.sort((a, b) => {
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

    const allruns = [] as BattleRun[];
    allruns.length = (ships.length * crew.length * 6);

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
			rate: 10,
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

    const flat_arena = ships.map(ship => processBattleRun(iterateBattle(rate, false, ship, [], undefined, undefined, undefined, undefined, undefined, undefined, undefined, arena_variance, true), [], ship)!);
    const flat_fbb = ships.map(ship => getBosses(ship).map((boss) => processBattleRun(iterateBattle(rate, true, ship, [], boss, undefined, undefined, undefined, undefined, undefined, undefined, fbb_variance, true), [], boss)!)).flat();

    const runBattles = (ship: Ship, testcrew: CrewMember | CrewMember[], allruns: BattleRun[], runidx: number, no_arena = false, no_fbb = false, opponent?: Ship, every_boss = false, division?: number, ignore_defeat?: 'fbb' | 'arena' | 'all') => {
        if (!Array.isArray(testcrew)) testcrew = [testcrew];

        const c = testcrew[0];

        const crewtype = characterizeCrew(c) < 0 ? 'defense' : 'offense';
        const compat = shipCompatibility(ship, c);
        const staff = testcrew;

        battle_mode = 'arena';
        let result: AttackInstant[] = [];
        // Test Arena
        if (!no_arena) {
            let fa = flat_arena.find(fa => fa.ship.symbol === ship.symbol)!
            result = iterateBattle(rate, false, ship, staff, opponent, undefined, undefined, undefined, undefined, undefined, undefined, arena_variance, true, !!ignore_defeat && ignore_defeat !== 'fbb');
            if (result.length) {
                result[0].ship = ship;
                let attack = processBattleRun(result, staff, opponent);
                if (attack) {
                    let time = attack.battle_time;
                    let dmg = attack.attack; // - fa.attack;
                    division ??= ship.rarity === 5 ? 3 : ship.rarity > 2 ? 2 : 1
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
                        division
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
                if (!every_boss) bosses = bosses.slice(0, 1);

                bosses.forEach((boss) => {
                    let fb = flat_fbb.find(fa => fa.ship.symbol === ship.symbol && fa.opponent.id === boss.id)!
                    let newstaff = [...staff];

                    if (newstaff.length === 1) {
                        if (c.action.ability?.type === 2) {
                            for (let i = 1; i < ship.battle_stations!.length && i < 2; i++) {
                                newstaff.push(c);
                            }
                        }
                        else if (crewtype !== 'defense') {
                            let compathr = hrpool.filter(
                                ff => ff.max_rarity <= boss.id &&
                                (
                                    ff.action.bonus_type !== c.action.bonus_type ||
                                    ff.action.bonus_amount < c.action.bonus_amount
                                )
                            );
                            if (!compathr?.length) compathr = hrpool;
                            for (let i = 1; i < ship.battle_stations!.length && i < 3 && i < compathr.length; i++) {
                                newstaff.push(compathr[i-1]);
                            }
                        }
                    }

                    result = iterateBattle(rate, true, ship, newstaff, boss, defense, offense, undefined, undefined, undefined, undefined, fbb_variance, true, !!ignore_defeat && ignore_defeat !== 'arena');
                    if (result.length) {
                        let attack = processBattleRun(result, newstaff, boss);
                        if (attack) {
                            let time = attack.battle_time;
                            let dmg = attack.attack; // - fb.attack;

                            // if (c.action.limit) dmg *= (time / 180);

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

	console.log("Calculate crew and ship battle scores...");
	let count = 1;

	for (let ship of ships) {
		console.log(`Testing crew on ${ship.name} (${count++} / ${ships.length})...`);
        for (let c of crew) {
            runidx = runBattles(ship, c, allruns, runidx);
		}
	}

    console.log("Filtering runs into arena and fbb buckets ...");

    allruns.splice(runidx);
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

    const processRuns = (trigger_compat: boolean, seat_compat: boolean, ship_only = false) => {
        shipscores.length = 0;
        if (!ship_only) crewscores.length = 0;

        const scoreRun = (runs: BattleRun[], mode: number, scores: Score[], score_type: 'crew' | 'ship') => {
            if (mode === 0) {
                runs.sort((a, b) => a.win != b.win ? a.win ? -1 : 1 : b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score);
            }
            else {
                runs.sort((a, b) => b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score);
            }

            (score_type === 'crew' ? crew : ships).forEach((item: CrewMember | Ship) => {

                const indexes = {} as { [div: string]: number[] };
                let z = -1;
                let score: Score | undefined = undefined;

                const seen = [
                    [] as number[],
                    [] as number[],
                ];

                for (let run of runs) {
                    z++;

                    if (score_type === 'crew') {
                        if (run.crew?.symbol !== item?.symbol) continue;
                    }
                    else {
                        if (run.ship?.symbol !== item?.symbol) continue;
                    }

                    if (trigger_compat && (run.compatibility.trigger === true && run.compatibility.score !== 1)) continue;
                    if (seat_compat && !run.compatibility.seat) continue;

                    score = scores.find(cs => cs.symbol === item.symbol);

                    if (!score) {
                        score = createScore(score_type, item.symbol);
                        scores.push(score);
                    }

                    const div_id = mode ? (run.boss?.id ?? 0) : run.division ?? 0;
                    indexes[div_id] ??= [];
                    indexes[div_id].push(z);

                    const scoreset = getScore(score, mode ? 'fbb' : 'arena', div_id);
                    if (!seen[mode].includes(div_id)) seen[mode].push(div_id);

                    if (run.damage > scoreset.max) {
                        scoreset.max = run.damage;
                        scoreset.max_ship = run.ship.symbol;
                        if (run.seated?.length) {
                            scoreset.max_staff = [...run.seated]
                        }
                        else {
                            scoreset.max_staff = [run.crew.symbol]
                        }
                    }
                    scoreset.duration += run.duration;
                    scoreset.damage += run.damage;
                    scoreset.count++;
                    if (run.win) scoreset.win_count++;
                }

                if (!score) return;

                seen[mode].forEach((group) => {
                    if (!indexes[group].length) return;

                    const scoreset = getScore(score, mode ? 'fbb' : 'arena', group);
                    if (indexes[group].length > 2) {
                        scoreset.median_index = indexes[group][Math.floor(indexes[group].length / 2)];
                    }
                    scoreset.average_index = indexes[group].reduce((p, n) => p + n, 0) / indexes[group].length;
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

        scores.sort((a, b) => b.arena_final - a.arena_final);
        max = scores[0].arena_final;
        for (let score of scores) {
            score.arena_final = Math.round((score.arena_final / max) * 1000) / 100;
        }

        scores.sort((a, b) => b.fbb_final - a.fbb_final);
        max = scores[0].fbb_final;
        for (let score of scores) {
            score.fbb_final = Math.round((score.fbb_final / max) * 1000) / 100;
        }

        // Compute overall from normalized component scores
        scores.forEach((score) => {
            score.overall_final = (score.fbb_final + score.arena_final) / 2;
        });

        // Normalize overall score
        scores.sort((a, b) => b.overall_final - a.overall_final);
        max = scores[0].overall_final;
        for (let score of scores) {
            score.overall_final = Math.round((score.overall_final / max) * 1000) / 100;
        }
    }

    const processScores = (scores: Score[], pass2 = false) => {

        const getLikeScores = (score: Score, mode: 'arena' | 'fbb') => {
            return scores;
            // return scores.filter(s => {
            //     if (mode === 'fbb') {
            //         if (s.fbb_data.length !== score.fbb_data.length) return false;
            //         if (!s.fbb_data.every(data1 => score.fbb_data.some(data2 => data1.group === data2.group))) return false;
            //     }
            //     else {
            //         if (s.arena_data.length !== score.arena_data.length) return false;
            //         if (!s.arena_data.every(data1 => score.arena_data.some(data2 => data1.group === data2.group))) return false;
            //     }
            //     return true;
            // });
        }

        const topA = (scores: Scoreable[][], mode: 'arena' | 'fbb') => {
            return 1;
            // if (mode === 'fbb') {
            //     return scores.map(s => s.map(ss => ss.damage).reduce((p, n) => p + n, 0)).reduce((p, n) => p > n ? p : n, 0);
            // }
            // else {
            //     let result = scores.map(s => s.map(ss => ss.win_count).reduce((p, n) => p + n, 0)).reduce((p, n) => p > n ? p : n, 0);
            //     if (!result) {
            //         result = scores.map(s => s.map(ss => ss.duration).reduce((p, n) => p + n, 0)).reduce((p, n) => p > n ? p : n, 0);
            //     }
            //     return result;
            // }
        }

        const topB = (scores: Scoreable[][], mode: 'arena' | 'fbb') => {
            if (mode === 'fbb') {
                return scores.map(s => s.map(ss => ss.damage).reduce((p, n) => p > n ? p : n, 0)).reduce((p, n) => p > n ? p : n, 0);
            }
            else {
                return scores.map(s => s.map(ss => ss.average_index).reduce((p, n) => p + n, 0) / s.length).reduce((p, n) => p > n ? p : n, 0);
            }
        }

        const topC = (scores: Scoreable[][], mode: 'arena' | 'fbb') => {
            let result = scores.map(s => s.map(ss => ss.win_count).reduce((p, n) => p + n, 0)).reduce((p, n) => p > n ? p : n, 0);
            if (result) return result;
            if (mode === 'fbb') {
                return scores.map(s => s.map(ss => ss.damage).reduce((p, n) => p + n, 0)).reduce((p, n) => p > n ? p : n, 0);
            }
            else {
                return scores.map(s => s.map(ss => ss.duration).reduce((p, n) => p + n, 0)).reduce((p, n) => p > n ? p : n, 0);
            }
        }

        const myA = (top: number, scores: Scoreable[], mode: 'arena' | 'fbb') => {
            return 0;
            // if (mode === 'fbb') {
            //     return scores.map(ss => ss.damage).reduce((p, n) => p + n, 0);
            // }
            // else {
            //     if (top) {
            //         return scores.map(ss => ss.win_count).reduce((p, n) => p + n, 0);
            //     }
            //     else {
            //         return scores.map(ss => ss.duration).reduce((p, n) => p + n, 0);
            //     }
            // }
        }

        const myB = (top: number, scores: Scoreable[], mode: 'arena' | 'fbb') => {
            if (mode === 'fbb') {
                return scores.map(ss => ss.damage).reduce((p, n) => p > n ? p : n, 0);
            }
            else {
                return (scores.map(ss => ss.average_index).reduce((p, n) => p + n, 0) / scores.length);
            }
        }

        const myC = (top: number, scores: Scoreable[], mode: 'arena' | 'fbb') => {
            let result = scores.map(ss => ss.win_count).reduce((p, n) => p + n, 0);
            if (result) return result;

            if (mode === 'fbb') {
                scores.map(ss => ss.damage).reduce((p, n) => p + n, 0);
            }
            else {
                scores.map(ss => ss.duration).reduce((p, n) => p + n, 0);
            }
        }


        const computeScore = <T extends { symbol: string, name?: string }>(score: Score, c: T) => {
            const ls_arena = getLikeScores(score, 'arena').map(cs => cs.arena_data);
            const ls_fbb = getLikeScores(score, 'fbb').map(cs => cs.fbb_data);

            const arena_mul = 1;
            const fbb_mul = 1;

            const a_top_arena = topA(ls_arena, 'arena');
            const a_top_fbb = topA(ls_fbb, 'fbb');

            const b_top_arena = topB(ls_arena, 'arena');
            const b_top_fbb = topB(ls_fbb, 'fbb');

            score.name = c.name!;
            if (score.name === "First Clerk Leeta") {
                console.log("Break here");
            }

            let a_arena = 0;
            let a_fbb = 0;
            let b_arena = 0;
            let b_fbb = 0;
            let c_arena = 0;
            let c_fbb = 0;

            let my_arena_a = myA(a_top_arena, score.arena_data, 'arena');
            let my_fbb_a = myA(a_top_fbb, score.fbb_data, 'fbb');

            let my_arena_b = myB(b_top_arena, score.arena_data, 'arena');
            let my_fbb_b = myB(b_top_fbb, score.fbb_data, 'fbb');

            a_arena = (my_arena_a / a_top_arena) * 100;
            a_fbb = (my_fbb_a / a_top_fbb) * 100;

            b_arena = (my_arena_b / b_top_arena) * 100;
            b_fbb = (my_fbb_b / b_top_fbb) * 100;

            a_arena *= arena_mul;
            a_fbb *= fbb_mul;

            b_arena *= arena_mul;
            a_fbb *= fbb_mul;

            if (!pass2) {
                score.fbb_final = (a_fbb + b_fbb) / 2;
                score.arena_final = (a_arena + b_arena) / 2;
            }
            else {
                const c_top_arena = topC(ls_arena, 'arena');
                const c_top_fbb = topC(ls_fbb, 'fbb');

                let my_arena_c = myC(c_top_arena, score.arena_data, 'arena');
                let my_fbb_c = myC(c_top_fbb, score.fbb_data, 'fbb');

                if (my_arena_c) c_arena = (my_arena_c / c_top_arena) * 100;
                if (my_fbb_c) c_fbb = (my_fbb_c / c_top_fbb) * 100;

                c_arena *= arena_mul;
                c_fbb *= fbb_mul;

                score.fbb_final = (a_fbb + b_fbb + c_fbb) / 3;
                score.arena_final = (a_arena + b_arena + c_arena) / 3;
            }
        }

        scores.forEach((score) => {
            if (!pass2) {
                // We want the strongest FBB boss
                score.fbb_data.sort((a, b) => b.group - a.group).slice(0, 1);

                // // We want the weakest Arena division
                score.arena_data.sort((a, b) => a.group - b.group).slice(0, 1);

                // // TODO : Think more about how to score arena?

                // // Weaker crew can sit in stronger divisions,
                // // but stronger crew cannot sit in weaker divisions
                // // therefore there is a discrepency with the amount
                // // of available battles to score by.
                // score.arena_data.sort((a, b) => a.group - b.group).slice(0, 1);
            }
            let c = (crew.find(f => f.symbol === score.symbol) || ships.find(f => f.symbol === score.symbol))!;
            computeScore(score, c);
        });

        normalizeScores(scores);
    }

    // processRuns(false);

    // const offs_1 = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense' && cs.arena && cs.fbb);
    // const defs_1 = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense' && cs.arena && cs.fbb);
    // const ship_1 = shipscores.filter(ss => ss.arena && ss.fbb);

    // compileScore(ship_1);
    // compileScore(offs_1);
    // compileScore(defs_1);

    console.log("\nTabulating Results ...");
    processRuns(true, true);

    const offs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense');
    const defs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense');
    const ship_2 = shipscores.filter(ss => ss.arena_data.some(ad => ad.damage) && ss.fbb_data.some(fd => fd.damage));

    console.log("Scoring Offense ...");
    processScores(offs_2);
    console.log("Scoring Defense ...");
    processScores(defs_2);
    console.log("Scoring Ships ...");
    processScores(ship_2);

    console.log("Mapping best crew to ships...");

    let arena_p2 = ships.map(sh => getStaffedShip(sh, false)).filter(f => !!f);
    let fbb_p2 = ships.map(sh => getStaffedShip(sh, true)).filter(f => !!f);

    allruns.length = (arena_p2.length + fbb_p2.length) * (arena_p2.length + fbb_p2.length) * 3;
    runidx = 0;

    console.log("Run Ships, Pass 2...");
    count = 1;

    for (let ship of arena_p2) {
        let division = ship.rarity === 5 ? 3 : ship.rarity > 2 ? 2 : 1
        let crew = ship.battle_stations!.map(m => m.crew!);
        console.log(`Playing arena on ${ship.name} against all compatible ships (${count++} / ${ships.length})...`);
        let league = getLeague(ship);
        for (let ship2 of arena_p2) {
            if (ship == ship2) continue;
            if (!league[0].includes(ship2.rarity)) continue;
            runidx = runBattles(ship, crew, allruns, runidx, false, true, ship2, false, division);
        }
    }

    count = 1;

    for (let ship of fbb_p2) {
        console.log(`Running FBB on ${ship.name} (${count++} / ${ships.length})...`);
        let crew = ship.battle_stations!.map(m => m.crew!);
        runidx = runBattles(ship, crew, allruns, runidx, true, false, undefined, true);
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
            //fbbruns.push(run);
        }
        else if (run.battle === 'arena') {
            arenaruns[ac++] = run;
            //arenaruns.push(run);
        }
    }

    fbbruns.splice(fc);
    arenaruns.splice(ac);

    allruns.length = 0;

    processRuns(true, true, true);

    const ship_3 = shipscores.filter(ss => ss.arena_data.some(ad => ad.damage) && ss.fbb_data.some(fd => fd.damage));

    processScores(ship_3, true);

    console.log("Factoring ship grades into final crew grades.");
    // Got the good crew, got the good ships from the good crew,
    // now let's bump the good crew higher if their ships are higher

    for (let ss of ship_3) {
        let arenas = origruns.filter((r, i) => r.ship?.symbol === ss.symbol && r.battle === 'arena');
        let fbbs = origruns.filter((r, i) => r.ship?.symbol === ss.symbol && r.battle === 'fbb');

        arenas.sort((a, b) => (a.win !== b.win) ? (a.win ? -1 : 1) : b.damage - a.damage || b.duration - a.duration);

        fbbs.sort((a, b) => b.damage - a.damage || b.duration - a.duration);
        let maxb = fbbs[0].damage;

        for (let cs of crewscores) {
            let maxa = arenas.findIndex(f => f.crew.symbol === cs.symbol);
            let ab = arenas.find(f => f.crew.symbol === cs.symbol);
            let fb = fbbs.find(f => f.crew.symbol === cs.symbol);

            if (ab) {
                let aff = ((maxa / arenas.length)) * (ab.win ? 2 : 1);
                cs.arena_final += (aff * ss.arena_final);
            }

            if (fb) {
                let bff = (fb.damage / maxb);
                cs.fbb_final += (bff * ss.fbb_final);
            }
        }
    }

    crewscores.forEach((cs) => {
        cs.overall_final = (cs.arena_final + cs.fbb_final) / 2;
    });

    offs_2.sort((a, b) => b.overall_final - a.overall_final);
    defs_2.sort((a, b) => b.overall_final - a.overall_final);

    normalizeScores(offs_2);
    normalizeScores(defs_2);

    const shipidx = 2;

    console.log("Name", "Overall", "Arena", "FBB");
    console.log("".padEnd(40, ""), "Arena Ship/Crew");
    console.log("".padEnd(40, ""), "FBB Ship/Crew");
    console.log("-------------------------------------------------------------------");

    const tc = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1);

    [offs_2, defs_2, ship_3].forEach((scores, idx) => {
        console.log(" ");
        console.log(`${idx == 0 ? 'Offense' : idx == 1 ? 'Defense' : 'Ship'}`);
        console.log(" ");
        let working = scores.slice(0, 100);
        for (let item of working) {
            let triggered = false;
            let c = crew.find(f => f.symbol === item.symbol);
            if (c && c.action.ability?.condition) triggered = true;

            let arena_crew = crew.filter(f => item.arena_data?.length && item.arena_data[0].max_staff.includes(f.symbol));
            let fbb_crew = crew.filter(f => item.fbb_data?.length && item.fbb_data[0].max_staff.includes(f.symbol));
            let arena_ship = ships.find(f => item.arena_data?.length && f.symbol === item.arena_data[0].max_ship);
            let fbb_ship = ships.find(f => item.fbb_data?.length && f.symbol === item.fbb_data[0].max_ship);
            if (!arena_crew || !fbb_crew || !arena_ship || !fbb_ship) return;

            console.log(
                item.name.padEnd(40, " "),
                `${item.overall_final}`.padEnd(5, ' '),
                `${item.arena_final}`.padEnd(5, ' '),
                `${item.fbb_final}`.padEnd(5, ' '),
                idx == shipidx ? 'Ship' : 'Crew',
                idx == shipidx ? 'Ship' : tc(crewcategories[item.symbol]).padEnd(7, " "),
                `${c ? printTrigger(c) : ''}`
            );

            if (item.kind === 'ship') {
                console.log(" ".padEnd(40, " "), arena_crew.map(c => c.name + `${printTrigger(c)}`).join(", ").padEnd(40, " "));
                console.log(" ".padEnd(40, " "), fbb_crew.map(c => c.name + `${printTrigger(c)}`).join(", ").padEnd(40, " "));
            }
            else {
                console.log(" ".padEnd(40, " "), arena_ship?.name?.padEnd(20, " "));
                console.log(" ".padEnd(40, " "), fbb_ship?.name?.padEnd(20, " "));
            }
        }
    });

	const runEnd = new Date();

	const diff = (runEnd.getTime() - runStart.getTime()) / (1000 * 60);
	console.log("Run Time", `${diff.toFixed(2)} minutes.`);
}

processShips();
processCrewShipStats();
