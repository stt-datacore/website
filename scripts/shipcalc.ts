import fs from 'fs';
import { CrewMember } from "../src/model/crew";
import { Ship, Schematics, BattleStations, BattleStation } from "../src/model/ship";
import { AttackInstant, ShipWorkerItem } from "../src/model/worker";
import { mergeShips } from "../src/utils/shiputils";
import { iterateBattle } from "../src/workers/battleworkerutils";

const Commander = [[1, 2], [1, 2]]
const Captain = [[3, 4], [1, 2, 3, 4]]
const Admiral = [[5], [1, 2, 3, 4, 5]]

function getLeague(ship: Ship) {
    for (let league of [Commander, Captain, Admiral]) {
        if (league[0].includes(ship.rarity)) return league;
    }
    return [];
}

const STATIC_PATH = `${__dirname}/../../static/structured/`;

type ShipCompat = {
    score: number,
    trigger: boolean,
    seat: boolean
};

interface Score {
    kind: 'crew' | 'ship';
    symbol: string;
    name: string;
    overall: number;
    fbb: number;
    arena: number,
    overall_final: number;
    fbb_final: number;
    arena_final: number,
    arena_count: number,
    fbb_count: number,
    arena_average_index: number,
    arena_median_index: number,
    fbb_average_index: number,
    fbb_median_index: number,
    arena_max: number,
    fbb_max: number,
    arena_max_ship: string,
    fbb_max_ship: string,
    arena_max_staff: string[],
    fbb_max_staff: string[]
}

interface BattleRun {
    crew: CrewMember;
    ship: Ship;
    boss?: Ship;
    damage: number;
    duration: number;
    seated: string[];
    compatibility: ShipCompat,
    limit: number,
    battle: 'arena' | 'fbb',
    type: 'defense' | 'offense',
    win: boolean
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

function processCrewShipStats() {

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
	const brutal_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":1150000000,"evasion":0,"attack":225000,"accuracy":80000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 4, antimatter: 0, level: 10};
	const hard_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":20000000,"evasion":0,"attack":45000,"accuracy":15000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 3, antimatter: 0, level: 10};
	const normal_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":160000000,"evasion":0,"attack":92000,"accuracy":35000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 2, antimatter: 0, level: 10}
	const easy_boss: Ship = {"icon":{"file":"/ship_previews/doomsday_machine"},"archetype_id":19557,"symbol":"doomsday_machine_ship","name":"Doomsday Machine(PL)","rarity":5,"shields":0,"hull":20000000,"evasion":0,"attack":45000,"accuracy":15000,"crit_chance":0,"crit_bonus":5000,"attacks_per_second":0.1,"shield_regen":0,"actions":[], id: 1, antimatter: 0, level: 10}
	const all_bosses = [easy_boss, normal_boss, hard_boss, brutal_boss, nm_boss, unm_boss];

	const runStart = new Date();

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

	const shipnum = (ship: Ship) => (ship.hull - (ship.attack * ship.attacks_per_second)) / (ship.hull + (ship.attack * ship.attacks_per_second));

	let ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
	let crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];

    let mboom = crew.filter(f => f.action.ability?.type === 1 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);
    let mcrit = crew.filter(f => f.action.ability?.type === 5 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);
    let mhr = crew.filter(f => f.action.bonus_type !== 0 && f.action.ability?.type === 2 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);

    const makeStaff = (ship: Ship, staff: CrewMember[], fbb: boolean, c: CrewMember, add_crew = false) => {
        let boom = mboom.filter(f => f.max_rarity <= c.max_rarity && shipCompatibility(ship, c).score === 1).slice(0, 1);
        let crit = mcrit.filter(f => f.max_rarity <= c.max_rarity && shipCompatibility(ship, c).score === 1).slice(0, 2);
        let hr = mhr.filter(f => f.max_rarity <= c.max_rarity && shipCompatibility(ship, c).score === 1).slice(0, 2);

        if (add_crew) {
            staff.push(c);
        }

        if (fbb) {
            if (add_crew && c.action?.ability?.type === 2) {
                let dmg = hr.slice(0, 1).concat(boom.concat(crit));
                let min = Math.min(ship.battle_stations!.length - (add_crew ? 1 : 0), dmg.length);
                if (min) {
                    for (let i = 0; i < min; i++) {
                        staff.push(dmg[i]);
                    }
                }
            }
            else {
                let dmg = hr.concat(boom.concat(crit));
                let min = Math.min(ship.battle_stations!.length - (add_crew ? 1 : 0), dmg.length);
                if (min) {
                    for (let i = 0; i < min; i++) {
                        staff.push(dmg[i]);
                    }
                }
            }
        }
        else {
            let dmg = boom.concat(crit);
            let min = Math.min(ship.battle_stations!.length - (add_crew ? 1 : 0), dmg.length);
            if (min) {
                for (let i = 0; i < min; i++) {
                    staff.push(dmg[i]);
                }
            }
        }
    };

    console.log(mboom[0].name, mboom[1].name);
    console.log(mcrit[0].name, mcrit[1].name);
    console.log(mhr[0].name, mhr[1].name);

    let ships = mergeShips(ship_schematics.filter(sc => highestLevel(sc.ship) == (sc.ship.max_level ?? sc.ship.level) + 1 && (sc.ship.battle_stations?.length)), []);
	ships = ships.sort((a, b) => shipnum(b) - shipnum(a)); //.slice(0, 10);

    const allruns = [] as BattleRun[];
    allruns.length = (ships.length * crew.length * 6);

    const crewcategories = {} as {[key: string]: 'defense' | 'offense' }
    crew.forEach((c) => crewcategories[c.symbol] = characterizeCrew(c) < 0 ? 'defense' : 'offense');

    let runidx = 0;
    let current_id = 1;
	let ignore_skill = true;
	let battle_mode = 'arena';

	const processBattleRun = (attacks: AttackInstant[], crew_set: CrewMember[]) => {
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
            win
			//attacks: get_attacks ? attacks : undefined
		} as ShipWorkerItem;
	}

    const runBattles = (ship: Ship, testcrew: CrewMember | CrewMember[], allruns: BattleRun[], runidx: number, no_arena = false, no_fbb = false, opponent?: Ship) => {
        if (!Array.isArray(testcrew)) testcrew = [testcrew];

        const c = testcrew[0];

        const crewtype = characterizeCrew(c) < 0 ? 'defense' : 'offense';
        const compat = shipCompatibility(ship, c);
        const staff = testcrew;

        battle_mode = 'arena';
        let result: AttackInstant[] = [];
        // Test Arena
        if (!no_arena) {
            result = iterateBattle(10, false, ship, staff, opponent, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true, ignoreDefeat);
            if (result.length) {
                result[0].ship = ship;
                let attack = processBattleRun(result, staff);
                if (attack) {
                    let time = attack.battle_time;
                    let dmg = attack.attack;

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
                        limit: c.action?.limit ?? 0
                    }
                }
            }
        }

        if (!no_fbb) {
            battle_mode = 'fbb';

            // Test FBB
            let bosses = getBosses(ship, c);
            if (bosses?.length) {

                if (staff.length === 1) {
                    if (c.action.ability?.type === 2) {
                        for (let i = 1; i < ship.battle_stations!.length && i < 2; i++) {
                            staff.push(c);
                        }
                    }
                    else if (crewtype !== 'defense') {
                        for (let i = 1; i < ship.battle_stations!.length && i < 3; i++) {
                            staff.push(mhr[i-1]);
                        }
                    }
                }

                bosses.sort((a, b) => b.id - a.id);
                bosses.slice(0, 1).forEach((boss) => {
                    result = iterateBattle(10, true, ship, staff, boss, defense, offense, undefined, undefined, undefined, undefined, undefined, true, ignoreDefeat);
                    if (result.length) {
                        let attack = processBattleRun(result, staff);
                        if (attack) {
                            let time = attack.battle_time;
                            let dmg = attack.attack;

                            if (c.action.limit) dmg *= (time / 180);

                            allruns[runidx++] = {
                                crew: c,
                                ship: ship,
                                boss,
                                damage: dmg,
                                duration: time,
                                type: crewtype,
                                battle: 'fbb',
                                seated: staff.map(i => i.symbol),
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

    arenaruns.sort((a, b) => a.win != b.win ? a.win ? -1 : 1 : b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score);
    fbbruns.sort((a, b) => a.win != b.win ? a.win ? -1 : 1 : b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score);

    const shipscores = [] as Score[];
    const crewscores = [] as Score[];

    const processRuns = (trigger_compat: boolean, seat_compat: boolean, ship_only_dmg: boolean, ship_only = false) => {

        shipscores.length = 0;
        crewscores.length = 0;

        [arenaruns, fbbruns].forEach((runs, mode) => {
            if (!ship_only) {
                crew.forEach((c) => {
                    let score = crewscores.find(cs => cs.symbol === c.symbol);
                    if (!score) {
                        score = {
                            kind: 'crew',
                            symbol: c.symbol,
                            name: c.name,
                            overall: 0,
                            fbb: 0,
                            arena: 0,
                            overall_final: 0,
                            arena_final: 0,
                            fbb_final: 0,
                            arena_count: 0,
                            fbb_count: 0,
                            arena_average_index: 0,
                            arena_median_index: 0,
                            fbb_average_index: 0,
                            fbb_median_index: 0,
                            arena_max: 0,
                            fbb_max: 0,
                            arena_max_ship: '',
                            fbb_max_ship: '',
                            arena_max_staff: [],
                            fbb_max_staff: [],
                        }
                        crewscores.push(score);
                    }
                    const indexes = [] as number[];
                    let z = -1;
                    for (let run of runs) {
                        z++;
                        if (run.crew?.symbol !== c?.symbol) continue;
                        if (trigger_compat && (run.compatibility.trigger === true && run.compatibility.score !== 1)) continue;
                        if (seat_compat && !run.compatibility.seat) continue;

                        indexes.push(z);

                        if (mode === 0) {
                            if (run.damage > score.arena_max) {
                                score.arena_max = run.damage;
                                score.arena_max_ship = run.ship.symbol;
                                score.arena_max_staff = [run.crew.symbol]
                            }
                            score.arena += run.damage;
                            score.arena_count++;
                        }
                        else {
                            if (run.damage > score.fbb_max) {
                                score.fbb_max = run.damage;
                                score.fbb_max_ship = run.ship.symbol;
                                score.fbb_max_staff = [run.crew.symbol]
                            }
                            score.fbb += run.damage;
                            score.fbb_count++;
                        }
                    }
                    if (mode === 0) {
                        if (indexes.length > 2) {
                            score.arena_median_index = indexes[indexes.length / 2];
                        }
                        score.arena_average_index = indexes.reduce((p, n) => p + n, 0) / indexes.length;
                    }
                    else {
                        if (indexes.length > 2) {
                            score.fbb_median_index = indexes[indexes.length / 2];
                        }
                        score.fbb_average_index = indexes.reduce((p, n) => p + n, 0) / indexes.length;
                    }
                });
            }

            ships.forEach((s) => {
                let score = shipscores.find(cs => cs.symbol === s.symbol);
                if (!score) {
                    score = {
                        kind: 'ship',
                        symbol: s.symbol,
                        name: s.name!,
                        overall: 0,
                        fbb: 0,
                        arena: 0,
                        overall_final: 0,
                        arena_final: 0,
                        fbb_final: 0,
                        arena_count: 0,
                        fbb_count: 0,
                        arena_average_index: 0,
                        arena_median_index: 0,
                        fbb_average_index: 0,
                        fbb_median_index: 0,
                        arena_max: 0,
                        fbb_max: 0,
                        arena_max_ship: '',
                        fbb_max_ship: '',
                        arena_max_staff: [],
                        fbb_max_staff: []
                    }
                    shipscores.push(score);
                }
                const indexes = [] as number[];
                let z = -1;
                for (let run of runs) {
                    z++;
                    if (run.ship?.symbol !== s?.symbol) continue;
                    if (ship_only_dmg && run.type === 'defense') continue;
                    if (trigger_compat && (run.compatibility.trigger === true && run.compatibility.score !== 1)) continue;
                    if (seat_compat && !run.compatibility.seat) continue;

                    indexes.push(z);

                    if (mode === 0) {
                        if (run.damage > score.arena_max) {
                            score.arena_max = run.damage;
                            score.arena_max_ship = run.ship.symbol;
                            if (run.seated.length > 1) {
                                score.arena_max_staff = [...run.seated]
                            }
                            else {
                                score.arena_max_staff = [run.crew.symbol]
                            }
                        }
                        score.arena += run.damage;
                        score.arena_count++;
                    }
                    else {
                        if (run.damage > score.fbb_max) {
                            score.fbb_max = run.damage;
                            score.fbb_max_ship = run.ship.symbol;
                            if (run.seated.length > 1) {
                                score.fbb_max_staff = [...run.seated]
                            }
                            else {
                                score.fbb_max_staff = [run.crew.symbol]
                            }
                        }
                        score.fbb += run.damage;
                        score.fbb_count++;
                    }
                }
                if (!indexes.length) return;
                if (mode === 0) {
                    if (indexes.length > 2) {
                        score.arena_median_index = indexes[indexes.length / 2];
                    }
                    score.arena_average_index = indexes.reduce((p, n) => p + n, 0) / indexes.length;
                }
                else {
                    if (indexes.length > 2) {
                        score.fbb_median_index = indexes[indexes.length / 2];
                    }
                    score.fbb_average_index = indexes.reduce((p, n) => p + n, 0) / indexes.length;
                }
            });
        });
    }

    const compileScore = (scores: Score[]) => {
        // scores.forEach((score) => {
        //     score.arena /= score.arena_count;
        //     score.fbb /= score.fbb_count;
        // });
        console.log("Finding maximums...");

        const scoremax_arena = scores.map(cs => cs.arena_max).reduce((p, n) => p < n ? n : p, 0);
        const scoremax_fbb = scores.map(cs => cs.fbb_max).reduce((p, n) => p < n ? n : p, 0);

        const summax_arena = scores.map(cs => cs.arena).reduce((p, n) => p < n ? n : p, 0);
        const summax_fbb = scores.map(cs => cs.fbb).reduce((p, n) => p < n ? n : p, 0);

        const computeScore = <T extends { symbol: string, name?: string }>(score: Score, c: T) => {
            score.name = c.name!;

            let a_arena = 0;
            let a_fbb = 0;
            let b_arena = 0;
            let b_fbb = 0;

            a_arena = (score.arena_max / scoremax_arena) * 100;
            a_fbb = (score.fbb_max / scoremax_fbb) * 100;

            b_arena = (score.arena / summax_arena) * 100;
            b_fbb = (score.fbb / summax_fbb) * 100;

            score.fbb_final = (a_fbb + b_fbb) / 2;
            score.arena_final = (a_arena + b_arena) / 2;

            score.overall_final = (score.arena_final + score.fbb_final) / 2;
        }

        const normalizeScores = (scores: Score[]) => {
            let max = 0;

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

            scores.sort((a, b) => b.overall_final - a.overall_final);
            max = scores[0].overall_final;
            for (let score of scores) {
                score.overall_final = Math.round((score.overall_final / max) * 1000) / 100;
            }
        }

        console.log("Computing scores...");

        scores.forEach((score) => {
            let c = (crew.find(f => f.symbol === score.symbol) || ships.find(f => f.symbol === score.symbol))!;
            computeScore(score, c);
        });

        console.log("Normalizing scores...");

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
    processRuns(true, true, true);

    const offs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense');
    const defs_2 = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense');
    const ship_2 = shipscores.filter(ss => ss.arena && ss.fbb);

    console.log("Scoring Offense ...");
    compileScore(offs_2);
    console.log("Scoring Defense ...");
    compileScore(defs_2);
    console.log("Scoring Ships ...");
    compileScore(ship_2);

    const getStaffedShip = (ship: string | Ship, fbb: boolean) => {
        let data = typeof ship === 'string' ? ships.find(f => f.symbol === ship) : ship;
        if (!data?.battle_stations?.length) return data;
        data = { ...data } as Ship;
        if (data.name === 'Breen Command Warship') {
            console.log("Break");
        }
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

        let dmg = offs_2.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f);
        let repair = defs_2.map(c2 => cs.find(csf => csf.symbol === c2.symbol)).filter(f => !!f);

        let used = [] as string[];
        let ct = 0;
        let half = Math.floor(data.battle_stations.length / 2);

        for (let bs of data.battle_stations) {
            if (fbb && ct >= half) {
                let r1 = repair.find(f => f.skill_order.includes(bs.skill) && !used.includes(f.symbol));
                if (r1) {
                    bs.crew = r1;
                    used.push(r1.symbol);
                }
            }
            else {
                let d1 = dmg.find(f => f.skill_order.includes(bs.skill) && !used.includes(f.symbol));
                if (d1) {
                    bs.crew = d1;
                    used.push(d1.symbol);
                }
            }
            ct++;
        }
        return data;
    }

    console.log("Mapping best crew to ships...");

    let arena_p2 = ships.map(sh => getStaffedShip(sh, false)).filter(f => !!f);
    let fbb_p2 = ships.map(sh => getStaffedShip(sh, true)).filter(f => !!f);

    allruns.length = (arena_p2.length + fbb_p2.length) * (arena_p2.length + fbb_p2.length) * 2;
    runidx = 0;

    console.log("Run Ships, Pass 2...");

    for (let ship of arena_p2) {
        let crew = ship.battle_stations!.map(m => m.crew!);
        console.log(`Playing arena on ${ship.name} against all ${ship.rarity}* ships (${count++} / ${ships.length})...`);
        for (let ship2 of arena_p2) {
            if (ship == ship2) continue;
            let league = getLeague(ship);
            if (!league[0].includes(ship.rarity)) continue;
            runidx = runBattles(ship, crew, allruns, runidx, false, true, ship2);
        }
    }

    for (let ship of fbb_p2) {
        console.log(`Running FBB on ${ship.name} (${count++} / ${ships.length})...`);
        let crew = ship.battle_stations!.map(m => m.crew!);
        runidx = runBattles(ship, crew, allruns, runidx, true, false);
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

    arenaruns.sort((a, b) => a.win != b.win ? a.win ? -1 : 1 : b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score);
    fbbruns.sort((a, b) => a.win != b.win ? a.win ? -1 : 1 : b.damage - a.damage || b.duration - a.duration || b.compatibility.score - a.compatibility.score);

    processRuns(true, true, true, true);

    const ship_3 = shipscores.filter(ss => ss.arena && ss.fbb);

    compileScore(ship_3);

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

            let arena_crew = crew.filter(f => item.arena_max_staff.includes(f.symbol));
            let fbb_crew = crew.filter(f => item.fbb_max_staff.includes(f.symbol));
            let arena_ship = ships.find(f => f.symbol === item.arena_max_ship);
            let fbb_ship = ships.find(f => f.symbol === item.fbb_max_ship);

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
