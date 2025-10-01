import { BaseSkills, Skill } from '../../model/crew';
import { VoyageSkills } from '../../model/player';
import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';

import { IPrimedCrew, IProjection, ISlottableCrew, IVoyagerScore, IAssemblerOptions } from './model';
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

export const InfiniteDiversity = (
	voyage: IVoyageInputConfig,
	crew: IVoyageCrew[],
	options: IAssemblerOptions = {}
): Promise<VoyagersLineup[]> => {
	// How many crew should actually be considered?
	//	Increasing this exponentially increases execution time of ComboCuller and CrewSeater
	//	24 is theoretically ideal, but 20 seems to be a perfect sweet spot
	const CREW_TARGET_MINIMUM: number = 20;

	// How many crew combos should be sent to the crew seater, at most?
	//	Increasing this increases execution time of CrewSeater
	//	Can decrease this if we have higher confidence in ComboCuller
	//	This basically ensures that the calc doesn't run forever
	//  If CREW_TARGET_MINIMUM stays <= 20, this has little effect anyway,
	//	 i.e. C(20, 12) = 125970
	const MAX_COMBOS: number = 100000;

	// Increase this to prioritize total voyage score over matching skills
	const VOYAGER_RANK_WEIGHT: number = 20;

	// Stop considering crew with a specific skill,
	//	if the crew pool already has this many crew with that skill
	//	Can't have more than 12 of any single skill on a voyage anyway
	const SKILL_TARGET_MAXIMUM: number = 12;

	// Keep considering crew until each skill is represented by this many crew
	//	Can technically be as low as 2, but 4 seems a safe target
	const SKILL_TARGET_MINIMUM: number = 4;

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
			reject(`Critical error: Infinite Diversity unable to construct a valid lineup!`);
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
			const crewSkills: BaseSkills = crew[i].skills ? structuredClone(crew[i].skills) : {};

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
			} as IPrimedCrew;
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
			if (baseSlots.length > bestSlots.length)
				voyagerScores.push({ score: baseScore, id: primedCrew[i].id, isIdeal: false, traitValue: 0, eventScore: 0 });
			if (bestSlots.length > 0)
				voyagerScores.push({ score: bestScore, id: primedCrew[i].id, isIdeal: true, traitValue: 0, eventScore: 0 });
		}
		// Seat crew, starting with worst crew (in ideal slots) first
		return voyagerScores.reverse();
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

		interface ISkilledCrew {
			command_skill: number[];
			diplomacy_skill: number[];
			engineering_skill: number[];
			medicine_skill: number[];
			science_skill: number[];
			security_skill: number[];
		};

		const rankedCrew: IRankedCrew[] = [];
		primedCrew.forEach(crew => {
			const skillDepth: ICrewSkillDepth = getCrewSkillDepth(crew);
			const primeScores: number[] = Object.values(skillDepth).map(score => score);
			primeScores.push((crew.primary_score + crew.secondary_score + crew.other_score) * VOYAGER_RANK_WEIGHT);
			const totalScore: number = primeScores.reduce((prev, curr) => prev + curr, 0);
			rankedCrew.push({ ...crew, primeScores, totalScore });
		});
		rankedCrew.sort((a, b) => b.totalScore - a.totalScore);

		const skilledCrew: ISkilledCrew = {
			command_skill: [],
			diplomacy_skill: [],
			engineering_skill: [],
			medicine_skill: [],
			science_skill: [],
			security_skill: []
		};

		const topCrew: IRankedCrew[] = [];
		const skillsUnfulfilled: Set<string> = new Set<string>([
			'command_skill',
			'diplomacy_skill',
			'engineering_skill',
			'medicine_skill',
			'science_skill',
			'security_skill'
		]);
		for (let i = 0; i < rankedCrew.length; i++) {
			const crew: IRankedCrew = rankedCrew[i];
			const crewSkills: string[] = Object.keys(crew.skills);
			const skillFulfilled: boolean = [...skillsUnfulfilled].some(neededSkillId =>
				crewSkills.includes(neededSkillId)
			);
			const skillOverkill: boolean = crewSkills.map(skillId => skilledCrew[skillId].length)
				.reduce((prev, curr) => Math.max(prev, curr), 0) > SKILL_TARGET_MAXIMUM;

			// When target pool size is reached...
			if (topCrew.length >= CREW_TARGET_MINIMUM) {
				// Stop searching if all skills fulfilled
				if (skillsUnfulfilled.size === 0) {
					break;
				}
				// Otherwise only consider crew with unfulfilled skills
				else if (!skillFulfilled) {
					// console.log(`Skipping ${crew.name}`, `SKILL_TARGET_MINIMUM`, skillsUnfulfilled);
					continue;
				}
			}

			// Don't consider crew with skills readily available in pool
			if (skillOverkill && !skillFulfilled) {
				// console.log(`Skipping ${crew.name}`, `SKILL_TARGET_MAXIMUM`, crewSkills);
				continue;
			}

			const ranks: number[] = [];
			Object.keys(crew.skills).forEach(skillId => {
				skilledCrew[skillId].push(crew.id);
				if (skilledCrew[skillId].length === SKILL_TARGET_MINIMUM)
					skillsUnfulfilled.delete(skillId);
				ranks.push(skilledCrew[skillId].length);
			});
			topCrew.push(crew);
		}

		if (options.debugCallback) {
			let crewList: string = `===== Top Ranked Crew =====`;
			crewList += `\n(${rankedCrew.length} considered, voyager rank weight: ${VOYAGER_RANK_WEIGHT})`;
			const lastIndex: number = rankedCrew.findIndex(crew => crew.id === topCrew[topCrew.length-1].id)
			rankedCrew.slice(0, lastIndex + 5).forEach(crew => {
				let rank: number = topCrew.findIndex(cp => cp.id === crew.id);
				const sRank: string = rank >= 0 ? `${rank+1}` : 'xx';
				crewList += `\n${sRank.padStart(2, ' ')} ${crew.name} (${crew.totalScore})`;
			});
			options.debugCallback(crewList);
		}

		return topCrew;
	}

	function getAllCrewCombos(primedCrew: IPrimedCrew[]): IPrimedCrew[][] {
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
		let totalTicks: number = 0;
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
				//	Assume starting antimatter of 2500 for purposes of projection
				const lineup: VoyagersLineup = new VoyagersLineup(assignments);
				const projection: IProjection = projectLineup(voyage, 2500, lineup);
				comboScores.push({
					crewCombo, score: lineup.score, projection
				});
				totalTicks += projection.ticks;
			}
		});

		const avgTicks: number = totalTicks / comboScores.length;

		return comboScores.filter(cs => cs.projection.ticks > avgTicks)
			.sort((a, b) => b.projection.ticks - a.projection.ticks)
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
