import _ from 'lodash';

import { BaseSkills } from '../../model/crew';
import { VoyageSkills } from '../../model/player';
import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';

import { IPrimedCrew, IVoyagerScore, IVoyagersOptions } from './model';
import { CrewSeater } from './crewseater';
import { VoyagersLineup } from './lineup';

const SKILL_IDS: string[] = [
	'command_skill', 'diplomacy_skill', 'security_skill',
	'engineering_skill', 'science_skill', 'medicine_skill'
];

export const OmegaProtocol = (
	voyage: IVoyageInputConfig,
	crew: IVoyageCrew[],
	options: IVoyagersOptions = {}
): Promise<VoyagersLineup[]> => {

	const MAX_CANDIDATES: number = 20;
	const MAX_VOYAGER_RANK: number = 50;
	const MAX_PRIME_RANK: number = 10;
	const MAX_PRIME_PLUS_RANK: number = 3;

	const primedRoster: IPrimedCrew[] = getPrimedRoster();
	sendProgress(`Considering ${primedRoster.length} crew for this voyage...`);

	return new Promise((resolve, reject) => {
		const lineups: VoyagersLineup[] = getPrimePlusLineups();
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
				const dProficiency: number = crewSkills[skillId].range_min+(crewSkills[skillId].range_max-crewSkills[skillId].range_min)/2;
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

	function getVoyagerScores(primedRoster: IPrimedCrew[]): IVoyagerScore[] {
		const TRAIT_BOOST: number = 200;
		const voyagerScores: IVoyagerScore[] = [];
		for (let i = 0; i < primedRoster.length; i++) {
			const baseScore: number = primedRoster[i].primary_score
				+ primedRoster[i].secondary_score
				+ primedRoster[i].other_score;
			const bestScore: number = baseScore + TRAIT_BOOST;
			const baseSlots: number[] = [], bestSlots: number[] = [];
			for (let j = 0; j < 12; j++) {
				if (!primedRoster[i].viable_slots[j]) continue;
				baseSlots.push(j);
				if (primedRoster[i].trait_slots[j]) bestSlots.push(j);
			}
			if (bestSlots.length > 0)
				voyagerScores.push({ score: bestScore, id: primedRoster[i].id, isIdeal: true });
			if (baseSlots.length > bestSlots.length)
				voyagerScores.push({ score: baseScore, id: primedRoster[i].id, isIdeal: false });
		}
		return voyagerScores;
	}

	function getComboLineups(primedCrew: IPrimedCrew[], voyagerScores: IVoyagerScore[]): VoyagersLineup[] {
		// Based on lodash.combinations
		function lodashCombinations(collection: IPrimedCrew[], n: number): IPrimedCrew[][] {
			const array: IPrimedCrew[] = _.values(collection);
			if (array.length < n) {
				return [];
			}
			const recur = ((array: IPrimedCrew[], n: number): IPrimedCrew[][] => {
				if (--n < 0) {
					return [[]];
				}
				const combinations: IPrimedCrew[][] = [];
				array = array.slice();
				while (array.length - n) {
					const value: IPrimedCrew | undefined = array.shift();
					if (!value) continue;
					recur(array, n).forEach((combination: IPrimedCrew[]) => {
						combination.unshift(value);
						combinations.push(combination);
					});
				}
				return combinations;
			});
			return recur(array, n);
		}

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
		sendProgress(`${crewCombos.length} crew combinations generated!`);

		// Validate combos before sending to crew seater
		const getTotalScore = (crewCombo: IPrimedCrew[]) => {
			return crewCombo.reduce((prev, curr) => prev + curr.primary_score + curr.secondary_score + curr.other_score, 0 );
		};
		const avgScore: number = crewCombos.reduce((prev, curr) => prev + getTotalScore(curr), 0)/crewCombos.length;
		interface ISkillCounts {
			[key: string]: number;
		};
		const viableCombos: IPrimedCrew[][] = [[]];
		crewCombos.forEach(crewCombo => {
			const skillCounts: ISkillCounts = {};
			crewCombo.forEach(crew => {
				Object.keys(crew.skills).forEach(skillId => {
					if (!skillCounts[skillId]) skillCounts[skillId] = 0;
					skillCounts[skillId]++;
				});
			});
			if (Object.keys(skillCounts).length === 6) {
				let canSeat2: boolean = true;
				Object.values(skillCounts).forEach(count => { if (count < 2) canSeat2 = false; });
				if (canSeat2) {
					const voyageScore: number = getTotalScore(crewCombo);
					if (voyageScore > (avgScore+1000)) {
						viableCombos.push(crewCombo);
					}
				}
			}
		});

		sendProgress(`${viableCombos.length} crew combinations viable!`);

		const lineups: VoyagersLineup[] = [];
		viableCombos.forEach(crewCombo => {
			const lineup: VoyagersLineup | false = CrewSeater(crewCombo, voyagerScores.slice(), !!options.debugCallback);
			if (lineup) lineups.push(lineup);
		});

		sendProgress(`${lineups.length} lineups assembled!`);
		return lineups;
	}

	function getPrimePlusLineups(): VoyagersLineup[] {
		const skilledCrew = {};
		SKILL_IDS.forEach(skillId => {
			const rankedCrew: IPrimedCrew[] = primedRoster
				.filter(crew => crew.skills[skillId] && crew.skills[skillId].core > 0)
				.sort((a, b) => b.skills[skillId].core - a.skills[skillId].core)
			skilledCrew[skillId] = rankedCrew;
		});

		const voyagerScores: IVoyagerScore[] = getVoyagerScores(primedRoster);
		voyagerScores.sort((a, b) => b.score - a.score);

		const rankedVoyagers: number[] = [];
		voyagerScores.forEach(score => {
			if (!rankedVoyagers.includes(score.id)) rankedVoyagers.push(score.id);
		});

		const getSkillScore = (primedCrew: IPrimedCrew, skillId: string): number => {
			const crewSkill = primedCrew.skills[skillId];
			if (!crewSkill) return 0;
			const dProficiency: number = crewSkill.range_min + (crewSkill.range_max - crewSkill.range_min) / 2;
			const dSkillScore: number = crewSkill.core+dProficiency;
			return dSkillScore;
		};

		const getRankIndex = (primedCrew: IPrimedCrew[], primeSkillId: string, primeSkillScore: number): number => {
			return primedCrew.filter(crew => !!crew.skills[primeSkillId] && getSkillScore(crew, primeSkillId) > primeSkillScore).length;
		};

		const rankedCrewIds: Set<number> = new Set<number>();
		rankedVoyagers.forEach((crewId: number, voyagerRank: number) => {
			// Only consider top voyagers
			if (voyagerRank < MAX_VOYAGER_RANK) {
				const crew: IPrimedCrew | undefined = primedRoster.find(crew => crew.id === crewId);
				if (crew) {
					let considerCrew: boolean = false;
					const isDoublePrime: boolean = crew.primary_score > 0 && crew.secondary_score > 0;
					// Only consider crew with at least 1 prime skill
					if (crew.primary_score + crew.secondary_score > 0) {
						Object.keys(crew.skills).forEach(skillId => {
							if (!considerCrew) {
								const primeSkills: string[] = [voyage.skills.primary_skill, voyage.skills.secondary_skill];
								// Only consider crew with the highest prime skills
								if (primeSkills.includes(skillId)) {
									const rankIndex: number = skilledCrew[skillId].findIndex(crew => crew.id === crewId);
									if (rankIndex < MAX_PRIME_RANK) considerCrew = true;
									// console.log(crew.name, skillId, rankIndex, rankIndex < MAX_PRIME_RANK);
								}
								// Otherwise only consider crew with highest (prime + nonprime) skills
								//	Give more consideration to crew with both prime skills
								else {
									const maxRank: number = isDoublePrime ? MAX_PRIME_PLUS_RANK * 2 : MAX_PRIME_PLUS_RANK;
									primeSkills.forEach(primeSkillId => {
										const primeScore: number = primeSkillId === voyage.skills.primary_skill ? crew.primary_score : crew.secondary_score;
										if (primeScore > 0) {
											const rankIndex: number = getRankIndex(skilledCrew[skillId], primeSkillId, primeScore);
											if (rankIndex < maxRank) considerCrew = true;
											// console.log(crew.name, skillId, primeSkillId, primeScore, rankIndex, rankIndex < maxRank);
										}
									});
								}
							}
						});
					}
					if (considerCrew) rankedCrewIds.add(crew.id);
				}
			}
		});

		const rankedCrew: IPrimedCrew[] = [];
		 [...rankedCrewIds].forEach(crewId => {
			const crew: IPrimedCrew | undefined = primedRoster.find(crew => crew.id === crewId);
			if (crew) rankedCrew.push(crew);
		});

		// console.log(rankedCrew.map(crew => crew.name));

		sendProgress(`Identified ${rankedCrew.length} good candidates for this voyage!`);

		// SKILL_IDS.forEach(skillId => {
		// 	console.log(
		// 		skillId,
		// 		rankedCrew.reduce((prev, curr) => prev + (curr.skills[skillId] ? 1 : 0), 0),
		// 		rankedCrew.reduce((prev, curr) => prev + (curr.skills[skillId] ? curr.skills[skillId].core : 0), 0)
		// 	);
		// });

		const rankedScores: IVoyagerScore[] = getVoyagerScores(rankedCrew);
		return getComboLineups(rankedCrew.slice(0, MAX_CANDIDATES), rankedScores);
	}

	function sendProgress(message: string): void {
		if (options.debugCallback)
			options.debugCallback(message);
		if (options.progressCallback)
			options.progressCallback(message);
	}
};
