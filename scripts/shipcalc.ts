import fs from 'fs';
import { CrewMember } from "../src/model/crew";
import { Ship, Schematics } from "../src/model/ship";
import { AttackInstant, ShipWorkerItem } from "../src/model/worker";
import { mergeShips } from "../src/utils/shiputils";
import { iterateBattle } from "../src/workers/battleworkerutils";
import { highestLevel } from "./precalculate";


const STATIC_PATH = `${__dirname}/../../static/structured/`;

type ShipTest = {
	symbol: string,
	name: string,
	arena_attack: number,
	arena_duration: number,
	fbb_attack: number,
	fbb_duration: number,
	type: number,
	score: number,
	arena_score: number,
	fbb_score: number,
	arena_times: number,
	fbb_times: number,
	data?: {
		ships: number,
		fully_compatible: number,
		average_compatibility: number
	};
};

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
		//if (crew.action.limit) return [];
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

	const shipnum = (ship: Ship) => (ship.attack * ship.attacks_per_second * 60) + ship.hull + ship.evasion + ship.accuracy + ship.crit_bonus + ship.crit_chance;

	let ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
	let crew = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8')) as CrewMember[];

	let ships = mergeShips(ship_schematics.filter(sc => highestLevel(sc.ship) == (sc.ship.max_level ?? sc.ship.level) + 1 && (sc.ship.battle_stations?.length)), []);
	ships = ships.sort((a, b) => shipnum(b) - shipnum(a)); //.slice(0, 5);
	let current_id = 1;
	let ignore_skill = true;
	let battle_mode = 'arena';

	const processBattleRun = (attacks: AttackInstant[], crew_set: CrewMember[]) => {
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
			//attacks: get_attacks ? attacks : undefined
		} as ShipWorkerItem;
	}

	const crew_tests = {} as {[key: string]: ShipTest };
	const ship_tests = {} as {[key: string]: ShipTest };

	console.log("Calculate crew and ship battle scores...");
	let count = 1;
	for (let ship of ships) {
		ship_tests[ship.symbol] ??= {
			symbol: ship.symbol,
			name: ship.name!,
			arena_attack: 0,
			arena_duration: 0,
			fbb_attack: 0,
			fbb_duration: 0,
			score: 0,
			arena_score: 0,
			fbb_score: 0,
			type: 1,
			arena_times: 0,
			fbb_times: 0
		}

		const ship_scoring = ship_tests[ship.symbol];

		console.log(`Testing crew on ${ship.name} (${count++} / ${ships.length})...`);
		for (let c of crew) {

			crew_tests[c.symbol] ??= {
				symbol: c.symbol,
				name: c.name,
				arena_attack: 0,
				arena_duration: 0,
				fbb_attack: 0,
				fbb_duration: 0,
				score: 0,
				arena_score: 0,
				fbb_score: 0,
				type: characterizeCrew(c),
				arena_times: 0,
				fbb_times: 0,
				data: {
					ships: 0,
					fully_compatible: 0,
					average_compatibility: 0
				}
			}

			const scoring = crew_tests[c.symbol];
			const staff = [] as CrewMember[];
			for (let i = 0; i < ship.battle_stations!.length; i++) {
				staff.push(c);
				if (i >= 0) break;
			}
			battle_mode = 'arena';
			// Test Arena
			let result = iterateBattle(0.5, false, ship, staff, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
			if (result.length) {
				result[0].ship = ship;
				scoring.data!.ships++;
				let sc = shipCompatibility(ship, c);
				scoring.data!.average_compatibility += sc;
				if (sc == 1) scoring.data!.fully_compatible++;

				let attack = processBattleRun(result, staff);
				let bt = Math.ceil(attack.battle_time);
				let am = Math.ceil(attack.arena_metric);
				scoring.arena_attack += am;
				scoring.arena_duration += bt;
				if (am > ship_scoring.arena_attack) {
					ship_scoring.arena_attack = am;
				}
				if (bt > ship_scoring.arena_duration) {
					ship_scoring.arena_duration = bt;
				}
				scoring.arena_times++;
				ship_scoring.arena_times++;
			}

			battle_mode = 'fbb';
			// Test FBB
			let bosses = getBosses(ship, c);
			if (bosses?.length) {
				let att = 0;
				let dur = 0;
				bosses.sort((a, b) => b.id - a.id);
				bosses.forEach((boss) => {
					result = iterateBattle(0.5, true, ship, staff, boss, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
					if (result.length) {
						let attack = processBattleRun(result, staff);
						att += attack.fbb_metric;
						dur += attack.battle_time;
					}
				});

				if (c.action.limit && dur) {
					att *= ((dur / bosses.length) / 180);
				}

				let bt = Math.ceil(dur / bosses.length);
				let am = Math.ceil(att / bosses.length);
				scoring.fbb_attack += am;
				scoring.fbb_duration += bt;
				if (am > ship_scoring.fbb_attack) {
					ship_scoring.fbb_attack = am;
				}
				if (bt > ship_scoring.fbb_duration) {
					ship_scoring.fbb_duration = bt;
				}
				scoring.fbb_times++;
				ship_scoring.fbb_times++;
			}

			// if (c.action.ability?.condition && (!ship.actions?.some(a => a.status == c.action?.ability?.condition))) {
			// 	// TODO?
			// }
			// if (!c.skill_order.some(skill => ship.battle_stations?.some(bs => skill == bs.skill))) {
			// 	// TODO?
			// }
			// if (c.action?.limit) {
			// 	// TODO?
			// }
		}
	}

	const buckets = [Object.values(crew_tests).filter(f => f.arena_attack || f.fbb_attack), Object.values(ship_tests).filter(f => f.arena_attack || f.fbb_attack)];

	buckets.forEach((bucket, idx) => {
		let types = [...new Set(bucket.map(s => s.type)) ];
		// if (!idx) {
		// 	bucket.forEach((record) => {
		// 		if (record.arena_times) {
		// 			record.arena_attack /= record.arena_times;
		// 			record.arena_duration /= record.arena_times;
		// 		}
		// 		if (record.fbb_times) {
		// 			record.fbb_attack /= record.fbb_times;
		// 			record.fbb_duration /= record.fbb_times;
		// 		}
		// 	});
		// }
		// const arenanum = (c: ShipTest) => c.type < 0 ? c.arena_duration : c.arena_attack;
		// const fbbnum = (c: ShipTest) => c.type < 0 ? c.fbb_duration : c.fbb_attack;
		const arenanum = (c: ShipTest) => c.arena_attack;
		const fbbnum = (c: ShipTest) => c.fbb_attack;

		types.forEach((type) => {
			let batch = bucket.filter(f => f.type == type);

			batch.sort((a, b) => arenanum(b) - arenanum(a));
			let highest = arenanum(batch[0]);

			for (let s of batch) {
				let z = ((arenanum(s) / highest) * 10).toFixed(1);
				s.arena_score = Number(z);
			}

			batch.sort((a, b) => fbbnum(b) - fbbnum(a));
			highest = fbbnum(batch[0]);

			for (let s of batch) {
				let z = ((fbbnum(s) / highest) * 10).toFixed(1);
				s.fbb_score = Number(z);
			}

			for (let s of batch) {
				let z = ((s.fbb_score + s.arena_score) / 2).toFixed(1);
				s.score = Number(z);
				if (s.data) {
					s.data.average_compatibility /= s.data.ships;
                    let compats = s.data.fully_compatible / s.data.ships;
					s.score *= ((s.data.average_compatibility + compats) / 2);
				}
			}

			// batch.sort((a, b) => b.score - a.score || b.arena_score - a.arena_score || b.fbb_score - a.fbb_score);
			// highest = batch[0].score;

			// for (let s of batch) {
			// 	let z = ((s.score / highest) * 10).toFixed(1);
			// 	s.score = Number(z);
			// }
		});

		bucket.sort((a, b) => b.score - a.score);
		let highest = bucket[0].score;

		for (let s of bucket) {
			let z = ((s.score / highest) * 10).toFixed(1);
			s.score = Number(z);
		}

		console.log("");
		console.log((idx ? "Ships" : "Crew").padEnd(40, " "), "Score", "Arena Score", "FBB Score", "Type")

		bucket.slice(0, 100).forEach((score) => {
			console.log(score.name.padEnd(40, " "), `${score.score}`.padEnd(5, " "), `${score.arena_score}`.padEnd(11, " "), `${score.fbb_score}`.padEnd(9, " "), idx ? "Ship" : score.type < 0 ? "Defense" : "Offense");
		});
	});

	const runEnd = new Date();

	const diff = (runEnd.getTime() - runStart.getTime()) / (1000 * 60);
	console.log("Run Time", `${diff.toFixed(2)} minutes.`);
	return buckets;
}

processCrewShipStats();