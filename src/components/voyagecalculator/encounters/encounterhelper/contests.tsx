import React from 'react';
import {
	Header,
	Table
} from 'semantic-ui-react';

import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';
import { IContest, IContestSkill, IEncounter, IExpectedScore } from '../model';
import { formatContestResult, getExpectedScore } from '../utils';
import { ProficiencyRanges } from '../common/ranges';
import { IChampion, IChampionContest, IChampionCrewData, IContestAssignments, makeContestId } from './championdata';

type ContestsTableProps = {
	encounter: IEncounter;
	championData: IChampionCrewData[];
	assignments: IContestAssignments;
};

export const ContestsTable = (props: ContestsTableProps) => {
	const { encounter, championData, assignments } = props;

	const contestIds: string[] = encounter.contests.map((contest, contestIndex) => makeContestId(contest, contestIndex));

	return (
		<React.Fragment>
			<Header	/* Contest Assignments */
				 as='h4'
			>
				Contest Assignments
			</Header>
			<Table celled selectable striped padded='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell	/* Contest */
							textAlign='center'
						>
							Contest
						</Table.HeaderCell>
						<Table.HeaderCell	/* Opponent */
							textAlign='center'
						>
							Opponent
						</Table.HeaderCell>
						<Table.HeaderCell	/* Crit Chance */
							textAlign='center'
						>
							Crit Chance
						</Table.HeaderCell>
						<Table.HeaderCell	/* Assigned Crew */>
							Assigned Crew
						</Table.HeaderCell>
						<Table.HeaderCell	/* Skills */
							textAlign='center'
						>
							Skills
						</Table.HeaderCell>
						<Table.HeaderCell	/* Crit Chance */
							textAlign='center'
						>
							Crit Chance
						</Table.HeaderCell>
						<Table.HeaderCell	/* Average Score */
							textAlign='center'
						>
							Average Score
						</Table.HeaderCell>
						<Table.HeaderCell	/* Odds of Winning */
							textAlign='center'
						>
							Odds of Winning
						</Table.HeaderCell>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{encounter.contests.map((contest, contestIndex) => {
						const contestId: string = contestIds[contestIndex];
						const assignedContest: IChampionContest | undefined = championData.find(crew =>
							crew.id === assignments[contestId].crew?.id
						)?.contests[contestId];
						return (
							<Table.Row key={contestId}>
								<Table.Cell textAlign='center'>
									{contestIndex+1}/{encounter.contests.length}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{renderSkills(contest.skills)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{contest.critChance}%
								</Table.Cell>
								<Table.Cell>
									{assignedContest && (<CrewLabel crew={assignedContest.champion.crew} />)}
									{!assignedContest && <>(Unassigned)</>}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest && renderChampionSkills(assignedContest)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest && (<>{assignedContest.champion.critChance}%</>)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{renderContest(contestIndex, assignedContest)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest?.result && <>{formatContestResult(assignedContest.result)}</>}
									{!assignedContest && <>0%</>}
								</Table.Cell>
							</Table.Row>
						);
					})}
				</Table.Body>
			</Table>
		</React.Fragment>
	);

	function renderSkills(skills: IContestSkill[]): JSX.Element {
		return <ProficiencyRanges skills={skills} />;
	}

	function renderChampionSkills(contest: IChampionContest): JSX.Element {
		const champion: IChampion = contest.champion;
		const contestSkills: IContestSkill[] = contest.skills.map(contestSkill => {
			const championSkill: IContestSkill | undefined = champion.skills.find(championSkill =>
				championSkill.skill === contestSkill.skill
			);
			if (championSkill) return championSkill;
			return {
				skill: contestSkill.skill,
				range_min: 0,
				range_max: 0
			};
		});
		return renderSkills(contestSkills);
	}

	function renderContest(contestIndex: number, assignedContest: IChampionContest | undefined): JSX.Element {
		if (assignedContest) {
			return (
				<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
					<span>
						{assignedContest.result?.simulated?.a.average ?? assignedContest.champion_roll.average}
					</span>
					<span>
						vs
					</span>
					<span>
						{assignedContest.result?.simulated?.b.average ?? assignedContest.challenger_roll.average}
					</span>
				</div>
			);
		}
		const contest: IContest = encounter.contests[contestIndex];
		const challengerRoll: IExpectedScore = getExpectedScore(contest.skills);
		return (
			<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
				<span>0</span>
				<span>vs</span>
				<span>{challengerRoll.average}</span>
			</div>
		);
	}
};
