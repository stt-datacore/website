import fs from 'fs';
import { CrewMember } from "../src/model/crew";
import { Ship, Schematics, BattleStations } from "../src/model/ship";
import { AttackInstant, ShipWorkerItem } from "../src/model/worker";
import { mergeShips } from "../src/utils/shiputils";
import { iterateBattle } from "../src/workers/battleworkerutils";

const STATIC_PATH = `${__dirname}/../../static/structured/`;

interface Score {
    kind: 'crew' | 'ship';
    symbol: string;
    name: string;
    overall: number;
    fbb: number;
    arena: number,
    count: number
}

interface BattleRun {
    crew: CrewMember;
    ship: Ship;
    boss?: Ship;
    damage: number;
    duration: number;
    seated: number;
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

	const getBosses = (ship: Ship, crew: CrewMember) => {
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
			rate: 0.5,
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

            const staff = [] as CrewMember[];

            for (let i = 0; i < ship.battle_stations!.length; i++) {
				staff.push(c);
				//if (i >= 1) break;
			}

            battle_mode = 'arena';
            let compat = shipCompatibility(ship, c);

            // Test Arena
            let result = iterateBattle(0.5, false, ship, staff, ship, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
			if (result.length) {
				result[0].ship = ship;
				let attack = processBattleRun(result, staff);
                if (attack) {
                    let time = Math.ceil(attack.battle_time);
                    let dmg = Math.ceil(attack.arena_metric) * compat * ship.rarity;
                    allruns[runidx++] = {
                        crew: c,
                        ship: ship,
                        damage: dmg,
                        duration: time,
                        type: crewtype,
                        battle: 'arena',
                        seated: staff.length,
                        win: !!attack.win
                    }
                }
			}

			battle_mode = 'fbb';

            // Test FBB
			let bosses = getBosses(ship, c);
            if (bosses?.length) {
				bosses.sort((a, b) => b.id - a.id);
				bosses.forEach((boss) => {
					result = iterateBattle(0.5, true, ship, staff, boss, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
					if (result.length) {
						let attack = processBattleRun(result, staff);
                        if (attack) {
                            let time = attack.battle_time;
                            let dmg = attack.fbb_metric * compat * ship.rarity;
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
                                win: !!attack.win
                            }
                        }
                    }
				});
			}
		}
	}

    allruns.splice(runidx);

    const fbbruns: BattleRun[] = [];
    const arenaruns: BattleRun[] = [];

    for (let run of allruns) {
        if (run.battle === 'fbb') {
            fbbruns.push(run);
        }
        else if (run.battle === 'arena') {
            arenaruns.push(run);
        }
    }

    allruns.length = 0;

    const shipscores = [] as Score[];
    const crewscores = [] as Score[];

    const arenamax = arenaruns.length;
    const fbbmax = fbbruns.length;

    [arenaruns, fbbruns].forEach((runset, idx) => {
        const crewinc = {} as {[key:string]: number[] };
        runset.sort((a, b) => (a.win !== b.win) ? (a.win ? -1 : 1) : b.damage - a.damage);

        crew.forEach((c) => {
            const cidx = [] as number[];
            let zi = 1;
            for (let run of runset) {
                if (run.crew === c) {
                    cidx.push(zi);
                }
                zi++;
            }
            let num = cidx.reduce((p, n) => p + n, 0) / cidx.length;
            if (num) {
                crewinc[c.symbol] ??= [];
                crewinc[c.symbol].push(num);
            }
        });

        const shipinc = {} as {[key:string]: number[] };

        ships.forEach((s) => {
            const cidx = [] as number[];
            let zi = 1;
            for (let run of runset) {
                if (run.ship === s) {
                    cidx.push(zi);
                }
                zi++;
            }
            let num = cidx.reduce((p, n) => p + n, 0) / cidx.length;
            if (num) {
                shipinc[s.symbol] ??= [];
                shipinc[s.symbol].push(num);
            }
        });

        Object.entries(crewinc).map(([key, value]) => {
            let val = !value.length ? 0 : value.reduce((p, n) => p + n, 0) / value.length;
            return [key, val] as [string, number]
        }).sort((a, b) => a[1] - b[1]).forEach((c) => {
            if (!c[1]) return;
            let scoreobj = crewscores.find(f => f.symbol === c[0]);
            if (!scoreobj) {
                scoreobj = {
                    kind: 'crew',
                    name: '',
                    symbol: c[0],
                    overall: 0,
                    fbb: 0,
                    arena: 0,
                    count: 0
                };
                crewscores.push(scoreobj);
            }
            scoreobj.count++;
            if (idx < 1) scoreobj.arena += c[1];
            else scoreobj.fbb += c[1];
        });

        Object.entries(shipinc).map(([key, value]) => {
            let val = !value.length ? 0 : value.reduce((p, n) => p + n, 0) / value.length;
            return [key, val] as [string, number]
        }).sort((a, b) => a[1] - b[1]).forEach((c) => {
            if (!c[1]) return;
            let scoreobj = shipscores.find(f => f.symbol === c[0]);
            if (!scoreobj) {
                scoreobj = {
                    kind: 'ship',
                    name: '',
                    symbol: c[0],
                    overall: 0,
                    fbb: 0,
                    arena: 0,
                    count: 0
                };
                shipscores.push(scoreobj);
            }
            scoreobj.count++;
            if (idx < 1) scoreobj.arena += c[1];
            else scoreobj.fbb += c[1];
        });
    });

    crewscores.forEach((score) => {
        let c = crew.find(f => f.symbol === score.symbol)!;
        score.name = c.name;
        score.arena /= score.count;
        score.fbb /= score.count;
        score.arena = Math.round(((arenamax - (score.arena - 1)) / arenamax) * 10000) / 100;
        score.fbb = Math.round(((fbbmax - (score.fbb - 1)) / fbbmax) * 10000) / 100;
        score.overall = Math.round(((score.arena + score.fbb) / 2) * 100) / 100;
    });

    shipscores.forEach((score) => {
        let c = ships.find(f => f.symbol === score.symbol)!;
        score.name = c.name!;
        score.arena /= score.count;
        score.fbb /= score.count;
        score.arena = Math.round(((arenamax - (score.arena - 1)) / arenamax) * 10000) / 100;
        score.fbb = Math.round(((fbbmax - (score.fbb - 1)) / fbbmax) * 10000) / 100;
        score.overall = Math.round(((score.arena + score.fbb) / 2) * 100) / 100;
    });

    const normalize = (items: Score[]) => {
        items.sort((a, b) => b.arena - a.arena);
        let max = items[0].arena;

        items.forEach((item) => {
            item.arena = Math.round((item.arena / max) * 1000) / 100;
        });

        items.sort((a, b) => b.fbb - a.fbb);
        max = items[0].fbb;

        items.forEach((item) => {
            item.fbb = Math.round((item.fbb / max) * 1000) / 100;
        });

        items.sort((a, b) => b.overall - a.overall);
        max = items[0].overall;

        items.forEach((item) => {
            item.overall = Math.round((item.overall / max) * 1000) / 100;
        });
    };

    shipscores.sort((a, b) => b.overall - a.overall);

    const offs = crewscores.filter(cs => crewcategories[cs.symbol] === 'offense');
    const defs = crewscores.filter(cs => crewcategories[cs.symbol] === 'defense');

    normalize(shipscores);
    normalize(offs);
    normalize(defs);
    const shipidx = 1;
    const newcrew = offs.concat(defs).sort((a, b) => b.overall - a.overall);
    [newcrew, shipscores].forEach((scores, idx) => {
        console.log(" ");
        //console.log(`${idx == 0 ? 'Offense' : idx == 1 ? 'Defense' : 'Ship'}`);
        console.log(`${idx == 0 ? 'Crew' : 'Ships'}`);
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
