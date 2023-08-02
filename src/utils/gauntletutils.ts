import { Icon } from "../model/game-elements";


export interface GauntletCrewDTO {
	archetype_symbol: string;
	crew_id: number;
	crit_chance: number;
	debuff: number;
	disabled: boolean;
	level: number;
	max_rarity: number;
	rarity: any; // huh? came in as boolean
	selected: boolean;
	skills: { min: number; max: number; skill: string }[];
}


export interface GauntletOpponentDTO {
	crew_contest_data: { crew: GauntletCrewDTO[]; };
	icon: Icon;
	level: number;
	name: string;
	player_id: number;
	rank: number;
	value: number;
}


export interface GauntletDTO {
	bracket_id: string;
	consecutive_wins: number;
	contest_data: {
		featured_skill: string;
		primary_skill: string;
		secondary_skill: string;
		traits: string[];
		selected_crew: GauntletCrewDTO[];

		contest_rewards: any[];
		ranked_rewards: any[];
		crit_chance_per_trait: number;
	};

	gauntlet_id: number;
	jackpot_crew: string;
	opponents: GauntletOpponentDTO[];

	rank: number;
	score: number;
	seconds_to_end: number;
	seconds_to_join?: number; // only if gauntlet has not started
	seconds_to_next_crew_refresh: number;
	seconds_to_next_opponent_refresh: number;
	/** 'NONE' | 'STARTED' | 'UNSTARTED' | 'ENDED_WITH_REWARDS' */
	state: string;
	refresh_cost: { currency: number; amount: number };
	revive_and_save_cost: { currency: number; amount: number };
	revive_cost: { currency: number; amount: number };
}

export interface CrewOdd extends GauntletCrewDTO {
	used: number;
	max: number[];
	min: number[];
}

export interface OpponentOdd {
	name: string;
	level: number;
	value: number;
	rank: number;
	player_id: number;
	crew_id: number;
	archetype_symbol: string;
	crit_chance: number;
	max: number[];
	min: number[];
}

export interface Match {
	crewOdd: CrewOdd;
	opponent: OpponentOdd;
	chance: number;
}

export interface GauntletRoundOdds {
	rank: number;
	consecutive_wins: number;
	crewOdds: CrewOdd[];
	opponents: OpponentOdd[];
	matches: Match[];
}

export function gauntletRoundOdds(currentGauntlet: GauntletDTO, simulatedRounds: number): GauntletRoundOdds {
	let result: GauntletRoundOdds = {
		rank: currentGauntlet.rank,
		consecutive_wins: currentGauntlet.consecutive_wins,
		crewOdds: [],
		opponents: [],
		matches: []
	};

	currentGauntlet.contest_data.selected_crew.forEach((crew: GauntletCrewDTO) => {
		if (!crew.disabled) {
			let crewOdd: CrewOdd = {
				...crew,
				used: crew.debuff / 4,
				max: [0, 0],
				min: [0, 0],
			};

			crew.skills.forEach((skillStats) => {
				if (skillStats.skill == currentGauntlet.contest_data.primary_skill) {
					crewOdd.max[0] = skillStats.max;
					crewOdd.min[0] = skillStats.min;
				} else if (skillStats.skill == currentGauntlet.contest_data.secondary_skill) {
					crewOdd.max[1] = skillStats.max;
					crewOdd.min[1] = skillStats.min;
				}
			});

			result.crewOdds.push(crewOdd);
		}
	});

	currentGauntlet.opponents.forEach((opponent) => {
		let opponentOdd: OpponentOdd = {
			name: opponent.name,
			level: opponent.level,
			value: opponent.value,
			rank: opponent.rank,
			player_id: opponent.player_id,
			crew_id: opponent.crew_contest_data.crew[0].crew_id,
			archetype_symbol: opponent.crew_contest_data.crew[0].archetype_symbol,
			crit_chance: opponent.crew_contest_data.crew[0].crit_chance,
			max: [0, 0],
			min: [0, 0]
		};

		opponent.crew_contest_data.crew[0].skills.forEach((skillStats) => {
			if (skillStats.skill == currentGauntlet.contest_data.primary_skill) {
				opponentOdd.max[0] = skillStats.max;
				opponentOdd.min[0] = skillStats.min;
			} else if (skillStats.skill == currentGauntlet.contest_data.secondary_skill) {
				opponentOdd.max[1] = skillStats.max;
				opponentOdd.min[1] = skillStats.min;
			}
		});

		result.opponents.push(opponentOdd);
	});

	const roll = (data: CrewOdd | OpponentOdd, skillIndex: number): number => {
		let max = Math.random() < 0.5 ? 0 : 1;
		let min = Math.random() < 0.5 ? 0 : 1;
		if (data.min[skillIndex] > 0) {
			max = data.max[skillIndex];
			min = data.min[skillIndex];
		}

		return Math.floor(Math.random() * (max - min) + min) * (Math.random() < data.crit_chance / 100 ? 2 : 1);
	};

	result.matches = [];

	result.crewOdds.forEach((crewOdd: CrewOdd) => {
		result.opponents.forEach((opponent: OpponentOdd) => {
			if ((crewOdd.max[0] + crewOdd.max[1]) * 2 < opponent.min[0] + opponent.min[1]) {
				// If there is 0 chance of winning, bail early and don't waste time
				result.matches.push({
					crewOdd: crewOdd,
					opponent: opponent,
					chance: 0
				});
			} else if ((opponent.max[0] + opponent.max[1]) * 2 < crewOdd.min[0] + crewOdd.min[1]) {
				// If there is 100 chance of winning, bail early and don't waste time
				result.matches.push({
					crewOdd: crewOdd,
					opponent: opponent,
					chance: 100
				});
			} else {
				// TODO: this is silly; perhaps someone more statisitically-inclined can chime in with a proper probabilistic formula
				let wins = 0;
				for (let i = 0; i < simulatedRounds; i++) {
					let totalCrew = roll(crewOdd, 0);
					totalCrew += roll(crewOdd, 0);
					totalCrew += roll(crewOdd, 0);
					totalCrew += roll(crewOdd, 1);
					totalCrew += roll(crewOdd, 1);
					totalCrew += roll(crewOdd, 1);

					let totalOpponent = roll(opponent, 0);
					totalOpponent += roll(opponent, 0);
					totalOpponent += roll(opponent, 0);
					totalOpponent += roll(opponent, 1);
					totalOpponent += roll(opponent, 1);
					totalOpponent += roll(opponent, 1);

					if (totalCrew > totalOpponent) wins++;
				}

				result.matches.push({
					crewOdd: crewOdd,
					opponent: opponent,
					chance: Math.floor((wins / simulatedRounds) * 100)
				});
			}
		});
	});

	result.matches.sort((a, b) => b.chance - a.chance);

	return result;
}
