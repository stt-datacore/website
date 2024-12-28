import fs from 'fs';
import { CrewMember } from "../src/model/crew";
import { Ship, Schematics, BattleStations } from "../src/model/ship";
import { AttackInstant, ShipWorkerItem } from "../src/model/worker";
import { mergeShips } from "../src/utils/shiputils";
import { iterateBattle } from "../src/workers/battleworkerutils";

const STATIC_PATH = `${__dirname}/../../static/structured/`;

interface ScoreDetails {
    overall: number;
    arena: number;
    fbb: number;
    overall_duration: number;
    arena_duration: number;
    fbb_duration: number;
}

interface Score {
    kind: 'crew' | 'ship';
    symbol: string;
    name: string;
    overall: number;
    fbb: number;
    arena: number,
    arena_count: number,
    fbb_count: number,
    arena_average_index: number,
    arena_median_index: number,
    fbb_average_index: number,
    fbb_median_index: number,
}

interface BattleRun {
    crew: CrewMember;
    ship: Ship;
    boss?: Ship;
    damage: number;
    duration: number;
    seated: number;
    compatibility: number,
    limit: number,
    battle: 'arena' | 'fbb',
    type: 'defense' | 'offense',
    win: boolean
}

function sortCrew(fbb_mode: boolean, crew: CrewMember[]) {
    const pref_order = fbb_mode ? [1, 2, 5, 0, 3, 4, 6, 7, 8, 9, 10] : [1, 5, 0, 2, 3, 4, 6, 7, 8, 9, 10];
    const bonus_pref = [0, 2, 1, 3];

    crew.sort((a, b) => {
        let r = 0;
        // check durations
        if (fbb_mode) {
            r = a.action.cycle_time - b.action.cycle_time;
            if (r) return r;
        }
        else {
            r = a.action.initial_cooldown - b.action.initial_cooldown;
            if (r) return r;
        }

        // check for bonus abilities, first
        if (a.action.ability && b.action.ability) {
            if (fbb_mode) {
                if ([1, 2, 5].includes(a.action.ability.type) && ![1, 2, 5].includes(b.action.ability.type)) return -1;
                if ([1, 2, 5].includes(b.action.ability.type) && ![1, 2, 5].includes(a.action.ability.type)) return 1;
            }
            else {
                if ([0, 1, 5].includes(a.action.ability.type) && ![0, 1, 5].includes(b.action.ability.type)) return -1;
                if ([0, 1, 5].includes(b.action.ability.type) && ![0, 1, 5].includes(a.action.ability.type)) return 1;
            }

            if (a.action.ability.type === b.action.ability.type) {
                let aamt = a.action.ability.amount;
                let bamt = b.action.ability.amount;

                if (a.action.ability.type === 0) {
                    aamt += a.action.bonus_amount;
                    bamt += b.action.bonus_amount;
                }

                r = bamt - aamt;
                if (r) return r;

                r = a.action.ability.condition - b.action.ability.condition;
                if (r) return r;
            }
            else {
                r = pref_order.indexOf(a.action.ability.type) - pref_order.indexOf(b.action.ability.type);
                //r = a.action.ability.type - b.action.ability.type;
                if (r) return r;
            }
        }
        else {
            if (a.action.ability && !b.action.ability) return -1;
            if (!a.action.ability && b.action.ability) return 1;
        }

        // check the bonus amount/type
        if (a.action.bonus_type === b.action.bonus_type) {
            r = b.action.bonus_amount - a.action.bonus_amount;
            if (r) return r;
        }
        else {
            r = bonus_pref.indexOf(a.action.bonus_type) - bonus_pref.indexOf(b.action.bonus_type);
            if (r) return r;
        }

        // check limits
        if (fbb_mode) {
            if (a.action.limit && !b.action.limit) return 1;
            if (!a.action.limit && b.action.limit) return -1;
            if (a.action.limit && b.action.limit) {
                r = b.action.limit - a.action.limit;
                if (r) return r;
            }
        }

        // check passives
        if (a.ship_battle.crit_bonus && b.ship_battle.crit_bonus) {
            r = b.ship_battle.crit_bonus - a.ship_battle.crit_bonus;
        }
        if (a.ship_battle.crit_chance && b.ship_battle.crit_chance) {
            r = b.ship_battle.crit_chance - a.ship_battle.crit_chance;
        }
        if (a.ship_battle.accuracy && b.ship_battle.accuracy) {
            r = b.ship_battle.accuracy - a.ship_battle.accuracy;
        }
        if (a.ship_battle.evasion && b.ship_battle.evasion) {
            r = b.ship_battle.evasion - a.ship_battle.evasion;
        }

        // check other stats
        if (!r) {
            r = Object.values(a.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0) - Object.values(b.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0)
            if (!r) {
                // !!
                console.log(`completely identical stats! ${a.name}, ${b.name}`);
            }
        }
        return r;
    });

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

		if (ship.battle_stations?.some(bs => crew.skill_order.includes(bs.skill))) {
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
			}
		}
		return compat;
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

    // crew.sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);

    let mboom = crew.filter(f => f.action.ability?.type === 1 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);
    let mcrit = crew.filter(f => f.action.ability?.type === 5 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);
    let mhr = crew.filter(f => f.action.ability?.type === 2 && !f.action.limit && !f.action.ability?.condition).sort((a, b) => b.action.ability!.amount - a.action.ability!.amount || a.action.bonus_type - b.action.bonus_type || b.action.bonus_amount - a.action.bonus_amount);

    const makeStaff = (ship: Ship, staff: CrewMember[], fbb: boolean, c: CrewMember, add_crew = false) => {
        let boom = mboom.filter(f => f.max_rarity <= c.max_rarity && shipCompatibility(ship, c) === 1).slice(0, 1);
        let crit = mcrit.filter(f => f.max_rarity <= c.max_rarity && shipCompatibility(ship, c) === 1).slice(0, 2);
        let hr = mhr.filter(f => f.max_rarity <= c.max_rarity && shipCompatibility(ship, c) === 1).slice(0, 2);

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
	ships = ships.sort((a, b) => shipnum(b) - shipnum(a)); //.slice(0, 5);

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

	console.log("Calculate crew and ship battle scores...");
	let count = 1;
	for (let ship of ships) {
		console.log(`Testing crew on ${ship.name} (${count++} / ${ships.length})...`);

        // let raw_base_arena = iterateBattle(1, false, ship, [], ship, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
        // let raw_base_bosses = getBosses(ship).map(boss => iterateBattle(1, true, ship, [], boss, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true));

        // let base_arena = processBattleRun(raw_base_arena, []);
        // let base_bosses = raw_base_bosses.map(battle => processBattleRun(battle, []));

        for (let c of crew) {
            const crewtype = characterizeCrew(c) < 0 ? 'defense' : 'offense';
			// if (c.action.ability?.condition && (!ship.actions?.some(a => a.status == c.action?.ability?.condition))) {
			// 	// TODO?
            //     continue;
			// }
			// if (!c.skill_order.some(skill => ship.battle_stations?.some(bs => skill == bs.skill))) {
			// 	// TODO?
            //     continue;
			// }

            battle_mode = 'arena';
            const compat = shipCompatibility(ship, c);
            const staff = [] as CrewMember[];
            const oppostaff = [] as CrewMember[];

            for (let i = 0; i < ship.battle_stations!.length; i++) {
                staff.push(c);
                if (i >= 0) break;
            }

            // const oppo = { ...ship, battle_stations: JSON.parse(JSON.stringify(ship.battle_stations)) } as Ship;

            // makeStaff(oppo, oppostaff, false, c, false);
            // oppo.battle_stations!.forEach((bs, idx) => bs.crew = oppostaff[idx]);

            // if (c.name === 'Scientist Degra') {
            //     console.log("break here");
            // }

            // Test Arena
            let result = iterateBattle(10, false, ship, staff, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
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
                        seated: staff.length,
                        win: !!attack.win,
                        compatibility: compat,
                        limit: c.action?.limit ?? 0
                    }
                }
			}

			battle_mode = 'fbb';

            // Test FBB
			let bosses = getBosses(ship, c);
            if (bosses?.length) {
				bosses.sort((a, b) => b.id - a.id);
				bosses.slice(0, 1).forEach((boss) => {
					result = iterateBattle(10, true, ship, staff, boss, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
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
                                seated: staff.length,
                                win: !!attack.win,
                                compatibility: compat,
                                limit: c.action?.limit ?? 0
                            }
                        }
                    }
				});
			}
		}
	}

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

    arenaruns.sort((a, b) => a.win != b.win ? a.win ? -1 : 1 : b.damage - a.damage || b.duration - a.duration || b.compatibility - a.compatibility);
    fbbruns.sort((a, b) => a.win != b.win ? a.win ? -1 : 1 : b.damage - a.damage || b.duration - a.duration || b.compatibility - a.compatibility);

    const shipscores = [] as Score[];
    const crewscores = [] as Score[];

    [arenaruns, fbbruns].forEach((runs, mode) => {
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
                    arena_count: 0,
                    fbb_count: 0,
                    arena_average_index: 0,
                    arena_median_index: 0,
                    fbb_average_index: 0,
                    fbb_median_index: 0,
                }
                crewscores.push(score);
            }
            const indexes = [] as number[];
            let z = -1;
            for (let run of runs) {
                z++;
                if (run.crew !== c) continue;
                indexes.push(z);

                if (mode === 0) {
                    score.arena += run.damage;
                    score.arena_count++;
                }
                else {
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
                    arena_count: 0,
                    fbb_count: 0,
                    arena_average_index: 0,
                    arena_median_index: 0,
                    fbb_average_index: 0,
                    fbb_median_index: 0,
                }
                shipscores.push(score);
            }
            const indexes = [] as number[];
            let z = -1;
            for (let run of runs) {
                z++;
                if (run.ship !== s) continue;
                indexes.push(z);

                if (mode === 0) {
                    score.arena += run.damage;
                    score.arena_count++;
                }
                else {
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
    });

    const compileScore = (scores: Score[]) => {
        // scores.forEach((score) => {
        //     score.arena /= score.arena_count;
        //     score.fbb /= score.fbb_count;
        // });
        const scoremax_arena = scores.map(cs => cs.arena).reduce((p, n) => p < n ? n : p, 0);
        const scoremax_fbb = scores.map(cs => cs.fbb).reduce((p, n) => p < n ? n : p, 0);

        const computeScore = <T extends { symbol: string, name?: string }>(score: Score, c: T) => {
            score.name = c.name!;

            let arena = 0;
            let fbb = 0;

            arena = (score.arena / scoremax_arena) * 100;
            fbb = (score.fbb / scoremax_fbb) * 100;

            score.fbb = fbb;
            score.arena = arena;
            score.overall = (score.arena + score.fbb) / 2;
        }

        const normalizeScores = (scores: Score[]) => {
            let max = 0;

            scores.sort((a, b) => b.arena - a.arena);
            max = scores[0].arena;
            for (let score of scores) {
                score.arena = Math.round((score.arena / max) * 1000) / 100;
            }

            scores.sort((a, b) => b.fbb - a.fbb);
            max = scores[0].fbb;
            for (let score of scores) {
                score.fbb = Math.round((score.fbb / max) * 1000) / 100;
            }

            scores.sort((a, b) => b.overall - a.overall);
            max = scores[0].overall;
            for (let score of scores) {
                score.overall = Math.round((score.overall / max) * 1000) / 100;
            }
        }

        scores.forEach((score) => {
            let c = (crew.find(f => f.symbol === score.symbol) || ships.find(f => f.symbol === score.symbol))!;
            computeScore(score, c);
        });

        normalizeScores(scores);
    }

    const offs = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense');
    const defs = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense');

    compileScore(shipscores);
    compileScore(offs);
    compileScore(defs);

    const shipidx = 2;

    [offs, defs, shipscores].forEach((scores, idx) => {
        console.log(" ");
        console.log(`${idx == 0 ? 'Offense' : idx == 1 ? 'Defense' : 'Ship'}`);
        //console.log(`${idx == 0 ? 'Crew' : 'Ships'}`);
        console.log(" ");
        let working = scores.slice(0, 100);
        for (let item of working) {
            console.log(item.name.padEnd(40, " "), `${item.overall}`.padEnd(5, ' '), `${item.arena}`.padEnd(5, ' '), `${item.fbb}`.padEnd(5, ' '), idx ? 'Ship' : 'Crew', idx == shipidx ? 'Ship' : crewcategories[item.symbol].slice(0, 1).toUpperCase() + crewcategories[item.symbol].slice(1));
        }
    });

	const runEnd = new Date();

	const diff = (runEnd.getTime() - runStart.getTime()) / (1000 * 60);
	console.log("Run Time", `${diff.toFixed(2)} minutes.`);
}

processShips();
processCrewShipStats();
