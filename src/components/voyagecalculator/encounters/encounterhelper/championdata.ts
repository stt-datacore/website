import { PlayerCrew } from '../../../../model/player';
import { oneCrewCopy } from '../../../../utils/crewutils';
import { IContest, IExpectedScore, IContestant, IContestSkill, IContestResult, IEncounter } from '../model';
import { getCrewCritChance, getExpectedScore, makeContestant, simulateContest } from '../utils';

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
	endurable_skills: IEndurableSkill[];
};

export interface IChampion extends IContestant {
	crew: PlayerCrew;
};

export interface IEndurableSkill extends IContestSkill {
	contests_boosted: number;
};

export interface IChampionContestResult extends IContestResult {
	crewId: number;
	contestId: string;
	champion_average: number;
};

export interface IContestAssignments {
	[contestId: string]: IContestAssignment;
};

export interface IContestAssignment {
	index: number;
	unusedSkills: IUnusedSkills;
	crew?: PlayerCrew;
};

export interface IUnusedSkills {
	[key: string]: IUnusedSkill;
};

export interface IUnusedSkill {
	min: number;
	max: number;
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
		crewData.crit_chance = getCrewCritChance(crewData, encounter.critTraits);

		crewData.contest_viability = 0;
		crewData.contests = {};
		for (let contestIndex = 0; contestIndex < encounter.contests.length; contestIndex++) {
			const contest: IContest = encounter.contests[contestIndex];
			const contestId: string = contestIds[contestIndex];
			const skills: string[] = contest.skills.map(cs => cs.skill);
			const champion: IChampion = makeContestant(skills, encounter.critTraits, crewData) as IChampion;

			const unusedSkills: IUnusedSkills = assignments[contestId].unusedSkills;
			Object.keys(crewData.skills).forEach(skill => {
				if (contest.skills.map(cs => cs.skill).includes(skill)) {
					const championSkill: IContestSkill | undefined = champion.skills.find(cs => cs.skill === skill);
					if (championSkill) {
						championSkill.range_min += unusedSkills[skill].min;
						championSkill.range_max += unusedSkills[skill].max;
					}
				}
			});

			const championRoll: IExpectedScore = getExpectedScore(champion.skills);
			const challenger: IContestant = {
				skills: contest.skills,
				critChance: contest.critChance
			};

			const endurableSkills: IEndurableSkill[] = [];
			Object.keys(crewData.skills).filter(skill => !skills.includes(skill)).forEach(unusedSkill => {
				let postContestsBoosted: number = 0;
				for (let postIndex = contestIndex + 1; postIndex < encounter.contests.length; postIndex++) {
					const postContest: IContest = encounter.contests[postIndex];
					if (postContest.skills.filter(cs => cs.skill === unusedSkill).length > 0)
						postContestsBoosted++;
				}
				if (postContestsBoosted > 0) {
					const min: number = unusedSkills[unusedSkill].min + crew.skills[unusedSkill].range_min;
					const max: number = unusedSkills[unusedSkill].max + crew.skills[unusedSkill].range_max;
					endurableSkills.push({
						skill: unusedSkill,
						range_min: Math.floor(min / 2),
						range_max: Math.floor(max / 2),
						contests_boosted: postContestsBoosted
					});
				}
			});

			// Reuse previous contest data, if available and unchanged
			//	Otherwise queue for simulation
			let previousResult: IChampionContestResult | undefined;
			const previousCrew: IChampionCrewData | undefined = previousCrewData?.find(previousCrew => previousCrew.id === crewData.id);
			if (previousCrew) previousResult = previousCrew.contests[contestId]?.result;
			const oddsNeeded: boolean = !previousResult || previousResult.champion_average !== championRoll.average;
			if (oddsNeeded) {
				promises.push(
					simulateContest(champion, challenger, 1000).then(result => {
						return {
							...result,
							contestId,
							crewId: champion.crew.id,
							champion_average: championRoll.average
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
				endurable_skills: endurableSkills
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
