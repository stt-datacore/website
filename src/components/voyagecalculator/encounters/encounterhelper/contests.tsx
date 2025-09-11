import React from 'react';
import {
	Header,
	Label,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { PlayerCrew } from '../../../../model/player';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';

import { IContest, IContestSkill, IExpectedScore } from '../model';
import { formatContestResult, getExpectedScore } from '../utils';
import { ProficiencyRanges } from '../common/ranges';
import { EncounterContext } from './context';
import { BoostPicker } from './boostpicker';
import { assignCrewToContest, IChampion, IChampionBoost, IChampionContest, IContestAssignment } from './championdata';

type ContestsTableProps = {
	setTargetSkills: (skills: string[]) => void;
	openSimulator: (contest: IChampionContest) => void;
};

export const ContestsTable = (props: ContestsTableProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, contestIds, championData, assignments, setAssignments } = React.useContext(EncounterContext);
	const { openSimulator } = props;

	return (
		<React.Fragment>
			<Header	/* Contest Assignments */
				 as='h4'
			>
				{t('voyage.contests.contests_header')}
			</Header>
			<p>{t('voyage.contests.contests_description')}</p>
			<Table celled selectable striped padded='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell	/* Contest */
							textAlign='center'
						>
							{t('voyage.contests.contest')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Opponent */
							textAlign='center'
						>
							{t('global.opponent')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Crit Chance */
							textAlign='center'
						>
							{t('voyage.contests.crit_chance')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Assigned Crew */>
							{t('voyage.contests.assigned_crew')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Boost */
							textAlign='center'
						>
							Boost
						</Table.HeaderCell>
						<Table.HeaderCell	/* Skills */
							textAlign='center'
						>
							{t('base.skills')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Crit Chance */
							textAlign='center'
						>
							{t('voyage.contests.crit_chance')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Average Score */
							textAlign='center'
						>
							{t('voyage.contests.avg_score')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Odds of Winning */
							textAlign='center'
						>
							{t('voyage.contests.odds_of_winning')}
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
									{contest.critChance > 0 && (
										<div>
											<Label	/* Boss */
												color='pink'
											>
												{t('base.boss')}
											</Label>
										</div>
									)}
								</Table.Cell>
								<Table.Cell	/* Find viable crew for this contest */
									title='Find viable crew for this contest'
									textAlign='center'
									onClick={() => props.setTargetSkills(contest.skills.map(cs => cs.skill))}
									style={{ cursor: 'pointer' }}
								>
									{renderSkills(contest.skills)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{t('global.n_%', { n: contest.critChance })}
								</Table.Cell>
								<Table.Cell>
									{assignedContest && <CrewLabel crew={assignedContest.champion.crew} />}
									{!assignedContest && <>{t('global.unassigned')}</>}
								</Table.Cell>
								<Table.Cell>
									{renderBoost(assignments[contestId])}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest && renderChampionSkills(assignedContest)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{assignedContest && <>{t('global.n_%', { n: assignedContest.champion.critChance })}</>}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{renderContest(contestIndex, assignedContest)}
								</Table.Cell>
								<Table.Cell textAlign='center'>
									{renderOdds(assignedContest)}
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

	function renderBoost(assignment: IContestAssignment): JSX.Element {
		if (!assignment.crew) return <></>;
		return (
			<BoostPicker
				assignedCrew={assignment.crew}
				assignedBoost={assignment.boost}
				onBoostSelected={(boost) => editBoost(assignment.index, assignment.crew, boost)}
			/>
		);
	}

	function renderChampionSkills(assignedContest: IChampionContest): JSX.Element {
		const champion: IChampion = assignedContest.champion;
		const contestSkills: IContestSkill[] = assignedContest.skills.map(contestSkill => {
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

	function renderOdds(assignedContest: IChampionContest | undefined): JSX.Element {
		if (!assignedContest) return <>{t('global.n_%', { n: 0 })}</>;
		if (!assignedContest.result) return <></>;
		return (
			<div	/* Simulate contest */
				title={t('voyage.contests.simulate_contest')}
				style={{ cursor: 'pointer' }}
				onClick={() => openSimulator(assignedContest)}
			>
				{formatContestResult(assignedContest.result)}
			</div>
		);
	}

	function editBoost(contestIndex: number, crew: PlayerCrew | undefined, boost: IChampionBoost | undefined): void {
		if (!crew) return;
		assignCrewToContest(
			encounter,
			assignments,
			contestIds[contestIndex],
			crew,
			boost
		);
		setAssignments({...assignments});
	}
};
