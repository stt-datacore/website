import { BaseSkills, Skill } from '../../model/crew';
import { VoyageSkills } from '../../model/player';
import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';

import { IPrimedCrew, IProjection, ISlottableCrew, IVoyagerScore, IVoyagersOptions } from './model';
import { VoyagersLineup } from './lineup';
import { seatCrew } from './crewseater';
import { projectLineup } from './projector';

interface ICrewSkillDepth {
	[key: string]: number;
};

const SKILL_IDS: string[] = [
	'command_skill', 'diplomacy_skill', 'security_skill',
	'engineering_skill', 'science_skill', 'medicine_skill'
];

export const OmegaDirective = (
	voyage: IVoyageInputConfig,
	crew: IVoyageCrew[],
	options: IVoyagersOptions = {}
): Promise<VoyagersLineup[]> => {
	// How many crew should actually be considered?
	//	Increasing this exponentially increases execution time of ComboCuller and CrewSeater
	//	Sweet spot seems to be 24
	const MAX_CREW: number = 24;

	// How many crew combos should be sent to crew seater?
	//	Increasing this increases execution time of CrewSeater
	//	Can decrease this if we have higher confidence in ComboCuller
	const MAX_COMBOS: number = 100000;

	// Increase this to prioritize total voyage score over matching skills
	const VOYAGER_RANK_WEIGHT: number = 12;

	return new Promise((resolve, reject) => {
		const primedRoster: IPrimedCrew[] = getPrimedRoster();
		sendProgress(`Considering ${primedRoster.length} crew for this voyage...`);

		const topCrew: IPrimedCrew[] = getTopRankedCrew(primedRoster);
		sendProgress(`Identified top ${topCrew.length} candidates for this voyage!`);

		const crewCombos: IPrimedCrew[][] = getAllCrewCombos(topCrew);
		sendProgress(`Considering ${crewCombos.length} crew combinations for this voyage...`);

		const topCombos: IPrimedCrew[][] = getTopCrewCombos(crewCombos);	// aka ComboCuller
		sendProgress(`Identified top ${topCombos.length} crew combinations for this voyage!`);

		// CrewSeater
		const lineups: VoyagersLineup[] = [];
		const topScores: IVoyagerScore[] = getVoyagerScores(topCrew);
		topCombos.forEach(crewCombo => {
			const lineup: VoyagersLineup | false = seatCrew(crewCombo, topScores, !!options.debugCallback);
			if (lineup) lineups.push(lineup);
		});

		if (lineups.length === 0) {
			reject(`Critical error: Omega Directive unable to construct a valid lineup!`);
			return;
		}

		sendProgress(`${lineups.length} lineups assembled!`);
		resolve(lineups);
	});

	function getPrimedRoster(): IPrimedCrew[] {
		const skills: VoyageSkills = voyage.skills;
		const traits: string[] = [];
		for (let i = 0; i < voyage.crew_slots.length; i++) {
			traits.push(voyage.crew_slots[i].trait);
		}

		const primedRoster: IPrimedCrew[] = [];
		for (let i = 0; i < crew.length; i++) {
			let dPrimaryScore: number = 0, dSecondaryScore: number = 0, dOtherScore: number = 0;
			const rViableSkills: number[] = [0, 0, 0, 0, 0, 0];
			const rViableSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			const rTraitSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

			const crewId: number = crew[i].id ?? i;
			const crewSkills: BaseSkills = crew[i].skills ? JSON.parse(JSON.stringify(crew[i].skills)) : {};

			for (let iSkill = 0; iSkill < SKILL_IDS.length; iSkill++) {
				const skillId: string = SKILL_IDS[iSkill];
				if (!crewSkills[skillId]) continue;
				rViableSkills[iSkill] = 1;
				rViableSlots[iSkill*2] = 1;
				rViableSlots[(iSkill*2)+1] = 1;
				const dProficiency: number = crewSkills[skillId].range_min
					+ (crewSkills[skillId].range_max - crewSkills[skillId].range_min)/2;
				const dSkillScore: number = crewSkills[skillId].core+dProficiency;
				if (skillId === skills.primary_skill)
					dPrimaryScore = dSkillScore;
				else if (skillId === skills.secondary_skill)
					dSecondaryScore = dSkillScore;
				else
					dOtherScore += dSkillScore;
				if (crew[i].traits.indexOf(traits[iSkill*2]) >= 0)
					rTraitSlots[iSkill*2] = 1;
				if (crew[i].traits.indexOf(traits[(iSkill*2)+1]) >= 0)
					rTraitSlots[(iSkill*2)+1] = 1;
				if (options.strategy === 'peak-antimatter') {
					if (rTraitSlots[iSkill*2] === 0) rViableSlots[iSkill*2] = 0;
					if (rTraitSlots[(iSkill*2)+1] === 0) rViableSlots[(iSkill*2)+1] = 0;
					if (rTraitSlots[iSkill*2] === 0 && rTraitSlots[(iSkill*2)+1] === 0)
						rViableSkills[iSkill] = 0;
				}
			}

			const crewman: IPrimedCrew = {
				id: crewId,
				name: crew[i].name,
				skills: crewSkills,
				primary_score: dPrimaryScore,
				secondary_score: dSecondaryScore,
				other_score: dOtherScore,
				viable_slots: rViableSlots,
				trait_slots: rTraitSlots
			};
			primedRoster.push(crewman);
		}
		return primedRoster;
	}

	function getVoyagerScores(primedCrew: IPrimedCrew[]): IVoyagerScore[] {
		const TRAIT_BOOST: number = 200;
		const voyagerScores: IVoyagerScore[] = [];
		for (let i = 0; i < primedCrew.length; i++) {
			const baseScore: number = primedCrew[i].primary_score
				+ primedCrew[i].secondary_score
				+ primedCrew[i].other_score;
			const bestScore: number = baseScore + TRAIT_BOOST;
			const baseSlots: number[] = [], bestSlots: number[] = [];
			for (let j = 0; j < 12; j++) {
				if (!primedCrew[i].viable_slots[j]) continue;
				baseSlots.push(j);
				if (primedCrew[i].trait_slots[j]) bestSlots.push(j);
			}
			if (bestSlots.length > 0)
				voyagerScores.push({ score: bestScore, id: primedCrew[i].id, isIdeal: true });
			if (baseSlots.length > bestSlots.length)
				voyagerScores.push({ score: baseScore, id: primedCrew[i].id, isIdeal: false });
		}
		return voyagerScores;
	}

	function getCrewSkillDepth(crew: IPrimedCrew): ICrewSkillDepth {
		const getSkillScore = (crew: IPrimedCrew, skillId: string) => {
			const crewSkills: Skill = crew.skills[skillId];
			if (!crewSkills) return 0;
			const dProficiency: number = crewSkills.range_min
				+ (crewSkills.range_max - crewSkills.range_min)/2;
			return crewSkills.core+dProficiency;
		};

		const skillDepth: ICrewSkillDepth = {};
		[voyage.skills.primary_skill, voyage.skills.secondary_skill].forEach(primeSkillId => {
			const primeSkillScore: number = getSkillScore(crew, primeSkillId);
			if (primeSkillScore > 0) {
				skillDepth[primeSkillId] = primeSkillScore;
				SKILL_IDS.forEach(seatSkillId => {
					if (primeSkillId !== seatSkillId) {
						const crewSkillScore: number = getSkillScore(crew, seatSkillId);
						const skillKey: string = `${primeSkillId},${seatSkillId}`;
						skillDepth[skillKey] = primeSkillScore + crewSkillScore;
					}
				});
			}
		});

		return skillDepth;
	}

	function getTopRankedCrew(primedCrew: IPrimedCrew[]): IPrimedCrew[] {
		interface IRankedCrew extends IPrimedCrew {
			primeScores: number[];
			totalScore: number;
		};

		const rankedCrew: IRankedCrew[] = [];
		primedCrew.forEach(crew => {
			// Only consider crew with at least 1 prime skill
			if (crew.primary_score + crew.secondary_score > 0) {
				const skillDepth: ICrewSkillDepth = getCrewSkillDepth(crew);
				const primeScores: number[] = Object.values(skillDepth).map(score => score);
				primeScores.push((crew.primary_score + crew.secondary_score + crew.other_score) * VOYAGER_RANK_WEIGHT);
				const totalScore: number = primeScores.reduce((prev, curr) => prev + curr, 0);
				rankedCrew.push({ ...crew, primeScores, totalScore });
			}
		});

		rankedCrew.sort((a, b) => b.totalScore - a.totalScore);
		// console.log(rankedCrew.slice(0, 50).map(crew => crew.name));
		return rankedCrew.slice(0, MAX_CREW);
	}

	function getAllCrewCombos(primedCrew: IPrimedCrew[]): IPrimedCrew[][] {
		// Based on lodash.combinations
		// function lodashCombinations(collection: IPrimedCrew[], n: number): IPrimedCrew[][] {
		// 	const array: IPrimedCrew[] = _.values(collection);
		// 	if (array.length < n) {
		// 		return [];
		// 	}
		// 	const recur = ((array: IPrimedCrew[], n: number): IPrimedCrew[][] => {
		// 		if (--n < 0) {
		// 			return [[]];
		// 		}
		// 		const combinations: IPrimedCrew[][] = [];
		// 		array = array.slice();
		// 		while (array.length - n) {
		// 			const value: IPrimedCrew | undefined = array.shift();
		// 			if (!value) continue;
		// 			recur(array, n).forEach((combination: IPrimedCrew[]) => {
		// 				combination.unshift(value);
		// 				combinations.push(combination);
		// 			});
		// 		}
		// 		return combinations;
		// 	});
		// 	return recur(array, n);
		// }

		// https://blog.lublot.dev/combinations-in-typescript
		function souzaCombinations<T>(items: T[], size: number = items.length): T[][] {
			const combinations: T[][] = [];
			const stack: number[] = [];
			let i = 0;

			size = Math.min(items.length, size);

			while (true) {
				if (stack.length === size) {
					combinations.push(stack.map((index) => items[index]));
					i = stack.pop()! + 1;
				}

				if (i >= items.length) {
					if (stack.length === 0) {
						break;
					}
					i = stack.pop()! + 1;
				} else {
					stack.push(i++);
				}
			}

			return combinations;
		}

		const crewCombos: IPrimedCrew[][] = souzaCombinations(primedCrew, 12);
		return crewCombos;
	}

	function getTopCrewCombos(crewCombos: IPrimedCrew[][]): IPrimedCrew[][] {
		interface IScoredCombo {
			crewCombo: IPrimedCrew[],
			score: number;
			projection: IProjection;
		};

		const comboScores: IScoredCombo[] = [];
		crewCombos.forEach(crewCombo => {
			// Rule out combo if it can't seat 2 crew per skill
			const viableSlots: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
			crewCombo.forEach(crew => {
				crew.viable_slots.forEach((value: number, idx: number) => {
					viableSlots[idx] += value;
				});
			});
			if (viableSlots.every(slot => slot >= 2)) {
				const assignments: ISlottableCrew[] = crewCombo.map((crew: IPrimedCrew, slot: number) => {
					return {
						...crew,
						score: crew.primary_score + crew.secondary_score + crew.other_score,
						slot,
						isIdeal: false
					};
				});
				// This pseudo lineup ignores usual seating rules and antimatter bonuses
				const lineup: VoyagersLineup = new VoyagersLineup(assignments);
				const projection: IProjection = projectLineup(voyage, 2500, lineup);
				comboScores.push({
					crewCombo, score: lineup.score, projection
				});
			}
		});

		return comboScores.sort((a, b) => b.projection.ticks - a.projection.ticks)
			.slice(0, MAX_COMBOS)
			.map(cs => cs.crewCombo);
	}

	function sendProgress(message: string): void {
		if (options.debugCallback)
			options.debugCallback(message);
		if (options.progressCallback)
			options.progressCallback(message);
	}
};
