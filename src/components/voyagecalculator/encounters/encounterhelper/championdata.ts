import { BaseSkills } from '../../../../model/crew';
import { PlayerCrew } from '../../../../model/player';
import { oneCrewCopy } from '../../../../utils/crewutils';
import { IContest, IContestant, IContestResult, IContestSkill, IEncounter, IExpectedScore } from '../model';
import { getCrewCritChance, getExpectedScore, makeContestant, makeResultId, simulateContest } from '../utils';

export const MIN_RANGE_BOOSTS: number[] = [15, 20, 35, 50, 100, 150];
export const MAX_RANGE_BOOSTS: number[] = [35, 50, 100, 150, 200, 250];
export const CRIT_BOOSTS: number[] = [0, 0, 15, 25, 50, 75];

export interface IChampionCrewData extends PlayerCrew {
	best_proficiency: number;
	crit_chance: number;
	contest_viability: number;
	contests: { [contestId: string]: IChampionContest; };
};

export interface IChampionContest extends IContest {
	id: string;
	index: number;
	champion: IChampion;
	champion_roll: IExpectedScore;
	challenger: IContestant;
	challenger_roll: IExpectedScore;
	result: IChampionContestResult | undefined;
	odds: number;
	unused_skills: IUnusedSkill[];
};

export interface IChampion extends IContestant {
	crew: PlayerCrew;
};

export interface IUnusedSkill extends IContestSkill {
	relevance: number;
};

export interface IChampionContestResult extends IContestResult {
	crewId: number;
	contestId: string;
	championAverage: number;
	critChance: number;
};

export interface IContestAssignments {
	[contestId: string]: IContestAssignment;
};

export interface IContestAssignment {
	index: number;
	residualSkills: IResidualSkills;
	crew?: PlayerCrew;
	boost?: IChampionBoost;
};

export interface IChampionBoost {
	type: string;	// voyage_crit_boost | command_skill, diplomacy_skill, etc
	rarity: number;
};

export interface IResidualSkills {
	[key: string]: IRangeMinMax;
};

export interface IRangeMinMax {
	range_min: number;
	range_max: number;
};

export function makeContestId(contest: IContest, contestIndex: number): string {
	let contestId: string = `contest-${contestIndex}:`
	contestId += contest.skills.map(cs => cs.skill).join(',');
	return contestId;
}

export async function getChampionCrewData(
	voyageCrew: PlayerCrew[],
	encounter: IEncounter,
	assignments: IContestAssignments,
	previousCrewData?: IChampionCrewData[]
): Promise<IChampionCrewData[]> {
	const contestIds: string[] = encounter.contests.map((contest, contestIndex) => makeContestId(contest, contestIndex));

	const challengerRolls: IExpectedScore[] = encounter.contests.map(contest =>
		getExpectedScore(contest.skills)
	);

	const promises: Promise<IChampionContestResult>[] = [];

	const data: IChampionCrewData[] = voyageCrew.map(crew => {
		const crewData: IChampionCrewData = oneCrewCopy(crew) as IChampionCrewData;

		crewData.best_proficiency = Object.keys(crewData.skills).reduce((prev, curr) => {
			const max: number = crewData.skills[curr].range_max;
			return max > prev ? max : prev;
		}, 0);
		crewData.crit_chance = getCrewCritChance(crewData, encounter.critTraits, encounter.critChances);

		crewData.contest_viability = 0;
		crewData.contests = {};
		for (let contestIndex = 0; contestIndex < encounter.contests.length; contestIndex++) {
			const contest: IContest = encounter.contests[contestIndex];
			const contestId: string = contestIds[contestIndex];
			const skills: string[] = contest.skills.map(cs => cs.skill);
			const champion: IChampion = makeContestant(skills, encounter.critTraits, crewData, encounter.critChances) as IChampion;

			// Apply boosts before residualSkill bonuses
			const boost: IChampionBoost | undefined = assignments[contestId].boost;
			if (boost?.type === 'voyage_crit_boost') {
				champion.critChance += CRIT_BOOSTS[boost.rarity];
			}
			else if (boost) {
				const boostedSkill: IContestSkill | undefined = champion.skills.find(cs => cs.skill === boost.type);
				if (boostedSkill) {
					boostedSkill.range_min += MIN_RANGE_BOOSTS[boost.rarity];
					boostedSkill.range_max += MAX_RANGE_BOOSTS[boost.rarity];
				}
			}

			const assignedContestId: string | undefined = getAssignedContest(assignments, crewData.id);
			const crewIsAssignedPrior: boolean = !!assignedContestId && assignments[assignedContestId].index < contestIndex;

			const residualSkills: IResidualSkills = assignments[contestId].residualSkills;
			Object.keys(crewData.skills).forEach(skill => {
				if (contest.skills.map(cs => cs.skill).includes(skill)) {
					const championSkill: IContestSkill | undefined = champion.skills.find(cs => cs.skill === skill);
					if (championSkill) {
						championSkill.range_min += (!crewIsAssignedPrior ? residualSkills[skill].range_min : 0);
						championSkill.range_max += (!crewIsAssignedPrior ? residualSkills[skill].range_max : 0);
					}
				}
			});

			const championRoll: IExpectedScore = getExpectedScore(champion.skills);
			const challenger: IContestant = {
				skills: contest.skills,
				critChance: contest.critChance
			};

			const unusedSkills: IUnusedSkill[] = [];
			Object.keys(crewData.skills).filter(skill => !skills.includes(skill)).forEach(unusedSkill => {
				let relevance: number = 0;
				for (let postIndex = contestIndex + 1; postIndex < encounter.contests.length; postIndex++) {
					const postContest: IContest = encounter.contests[postIndex];
					if (postContest.skills.filter(cs => cs.skill === unusedSkill).length > 0)
						relevance++;
				}
				if (relevance > 0) {
					const rangeMin: number = crew.skills[unusedSkill].range_min + (!crewIsAssignedPrior ? residualSkills[unusedSkill].range_min : 0);
					const rangeMax: number = crew.skills[unusedSkill].range_max + (!crewIsAssignedPrior ? residualSkills[unusedSkill].range_max : 0);
					unusedSkills.push({
						skill: unusedSkill,
						range_min: Math.floor(rangeMin / 2),
						range_max: Math.floor(rangeMax / 2),
						relevance: relevance
					});
				}
			});

			// Reuse previous contest data, if available and rolls unchanged
			//	Otherwise queue for simulation
			let previousResult: IChampionContestResult | undefined;
			const previousCrew: IChampionCrewData | undefined = previousCrewData?.find(previousCrew => previousCrew.id === crewData.id);
			if (previousCrew) previousResult = previousCrew.contests[contestId]?.result;
			const oddsNeeded: boolean = !previousResult || previousResult.id !== makeResultId(champion, challenger);
			if (oddsNeeded) {
				promises.push(
					simulateContest(champion, challenger, 1000).then(result => {
						return {
							...result,
							contestId,
							crewId: champion.crew.id,
							championAverage: championRoll.average,
							critChance: champion.critChance
						};
					})
				);
			}

			crewData.contests[contestId] = {
				id: contestId,
				index: contestIndex,
				skills: contest.skills,
				critChance: contest.critChance,
				champion,
				champion_roll: championRoll,
				challenger,
				challenger_roll: challengerRolls[contestIndex],
				result: previousResult && !oddsNeeded ? previousResult : undefined,
				odds: previousResult && !oddsNeeded ? previousResult.oddsA : 0,
				unused_skills: unusedSkills
			};

			if (championRoll.average > 0) crewData.contest_viability++;
		}
		return crewData;
	});

	const results: IChampionContestResult[] = await Promise.all(promises);
	results.forEach(result => {
		const crewData: IChampionCrewData | undefined = data.find(crewData => crewData.id === result.crewId);
		if (crewData) {
			crewData.contests[result.contestId].result = result;
			crewData.contests[result.contestId].odds = result.oddsA;
		}
	});
	return data;
}

export function assignCrewToContest(
	encounter: IEncounter,
	assignments: IContestAssignments,
	contestId: string | undefined,
	crew: PlayerCrew,
	boost?: IChampionBoost | undefined
): void {
	// Remove crew from existing assignment, if necessary
	Object.keys(assignments).forEach(contestId => {
		if (assignments[contestId].crew?.id === crew.id) {
			assignments[contestId].crew = undefined;
			assignments[contestId].boost = undefined;
		}
	});
	if (contestId) {
		assignments[contestId].crew = crew;
		assignments[contestId].boost = boost;
	}

	const residualSkills: IResidualSkills = {
		command_skill: { range_min: 0, range_max: 0 },
		diplomacy_skill: { range_min: 0, range_max: 0 },
		engineering_skill: { range_min: 0, range_max: 0 },
		medicine_skill: { range_min: 0, range_max: 0 },
		science_skill: { range_min: 0, range_max: 0 },
		security_skill: { range_min: 0, range_max: 0 }
	};

	encounter.contests.forEach((contest, contestIndex) => {
		const contestId: string = makeContestId(contest, contestIndex);
		const assignment: IContestAssignment = assignments[contestId];
		assignment.residualSkills = structuredClone(residualSkills);
		if (assignment.crew) {
			const crewSkills: BaseSkills = assignment.crew.skills;
			Object.keys(crewSkills).filter(skill =>
				!contest.skills.map(cs => cs.skill).includes(skill)
			).forEach(unusedSkill => {
				let crewRangeMin: number = crewSkills[unusedSkill].range_min;
				let crewRangeMax: number = crewSkills[unusedSkill].range_max;
				// Apply boosts before unusedSkill bonuses
				const boost: IChampionBoost | undefined = assignments[contestId].boost;
				if (boost?.type === unusedSkill) {
					crewRangeMin += MIN_RANGE_BOOSTS[boost.rarity];
					crewRangeMax += MAX_RANGE_BOOSTS[boost.rarity];
				}
				const rangeMin: number = residualSkills[unusedSkill].range_min + crewRangeMin;
				const rangeMax: number = residualSkills[unusedSkill].range_max + crewRangeMax;
				residualSkills[unusedSkill].range_min += Math.floor(rangeMin / 2);
				residualSkills[unusedSkill].range_max += Math.floor(rangeMax / 2);
			});
		}
	});
}

export function getDefaultAssignments(contests: IContest[]): IContestAssignments {
	const assignments: IContestAssignments = {};
	const residualSkills: IResidualSkills = {
		command_skill: { range_min: 0, range_max: 0 },
		diplomacy_skill: { range_min: 0, range_max: 0 },
		engineering_skill: { range_min: 0, range_max: 0 },
		medicine_skill: { range_min: 0, range_max: 0 },
		science_skill: { range_min: 0, range_max: 0 },
		security_skill: { range_min: 0, range_max: 0 }
	};
	contests.forEach((contest, contestIndex) => {
		const contestId: string = makeContestId(contest, contestIndex);
		assignments[contestId] = {
			index: contestIndex,
			residualSkills: residualSkills
		};
	});
	return assignments;
}

export function getAssignedContest(assignments: IContestAssignments, crewId: number): string | undefined {
	let assignedContest: string | undefined;
	Object.keys(assignments).forEach(contestId => {
		if (assignments[contestId].crew?.id === crewId)
			assignedContest = contestId;
	});
	return assignedContest;
}
