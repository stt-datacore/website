import React from 'react';
import {
	Icon,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { PlayerCrew } from '../../../../model/player';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';

import { IContest } from '../model';
import { formatContestResult } from '../utils';
import { EncounterContext } from './context';
import { BoostPicker } from './boostpicker';
import { assignCrewToContest, IChampionBoost, IChampionContest, IContestAssignment, IContestAssignments, IRangeMinMax, MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from './championdata';

interface IContributor {
	index: number;
	crew?: PlayerCrew;
	boost?: IChampionBoost;
	skills: IContributorSkills;
};

interface IContributorSkills {
	[key: string]: IContributorSkill;
};

interface IContributorSkill {
	value: number;
	status: StatusNote;
};

enum StatusNote {
	Available,
	Inactive,
	Wasted,
	Exhausted,
	Irrelevant
};

type ContributorsTableProps = {
	activeContest: IChampionContest,
	assignments: IContestAssignments;
	setAssignments: (assignments: IContestAssignments) => void;
};

export const ContributorsTable = (props: ContributorsTableProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, contestIds } = React.useContext(EncounterContext);
	const { activeContest, assignments, setAssignments } = props;

	const contributors = React.useMemo<IContributor[]>(() => {
		return getContributors();
	}, [assignments]);

	return (
		<React.Fragment>
			The crew assigned to this contest will contribute their full proficiency. Some crew assigned to prior contests may also contribute a fraction of their unused skills. The average values added to this contest by all contributing crew are listed below. You can add boosts to increase any contribution, which may improve the odds of winning this contest.
			<Table celled selectable striped>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell	/* Contest */
							textAlign='center'
						>
							{t('voyage.contests.contest')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Assigned Crew */>
							{t('voyage.contests.assigned_crew')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Boost */
							textAlign='center'
						>
							Boost
						</Table.HeaderCell>
						{activeContest.skills.map(contestSkill => (
							<Table.HeaderCell
								key={contestSkill.skill}
								textAlign='center'
							>
								<img
									src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${contestSkill.skill}.png`}
									style={{ height: '1.1em', verticalAlign: 'middle' }}
									className='invertibleIcon'
								/>
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{contributors.map(contributor => {
						return (
							<React.Fragment>
								<Table.Row key={contributor.index}>
									<Table.Cell textAlign='center'>
										{contributor.index + 1}
									</Table.Cell>
									<Table.Cell>
										{contributor.crew && <CrewLabel crew={contributor.crew} />}
										{!contributor.crew && <>{t('global.unassigned')}</>}
									</Table.Cell>
									<Table.Cell textAlign='center'>
										{renderBoostPicker(contributor)}
									</Table.Cell>
									{activeContest.skills.map(contestSkill => (
										<Table.Cell
											key={contestSkill.skill}
											textAlign='center'>
												{renderContribution(contributor, contestSkill.skill)}
										</Table.Cell>
									))}
								</Table.Row>
							</React.Fragment>
						);
					})}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={2} />
						<Table.HeaderCell textAlign='center'>
							<b>{activeContest.result && formatContestResult(activeContest.result)}</b>
						</Table.HeaderCell>
						{activeContest.skills.map(contestSkill => (
							<Table.HeaderCell
								key={contestSkill.skill}
								textAlign='center'>
									{renderTotalValue(contestSkill.skill)}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Footer>
			</Table>
		</React.Fragment>
	);

	function getContributors(): IContributor[] {
		return encounter.contests.slice(0, activeContest.index + 1).map((contest, contestIndex) => {
			const contestId: string = contestIds[contestIndex];
			const active: boolean = contestIndex === activeContest.index;
			const contestSkills: string[] = contest.skills.map(cs => cs.skill);

			const assignment: IContestAssignment = assignments[contestId];
			const crew: PlayerCrew | undefined = assignment.crew;
			const boost: IChampionBoost | undefined = assignment.boost;

			const skills: IContributorSkills = {};

			activeContest.skills.forEach(contestSkill => {
				const skill: string = contestSkill.skill;
				if (crew?.skills[skill]) {
					// Crew cannot contribute to inactive skills
					if (!activeContest.champion.skills.map(cs => cs.skill).includes(skill)) {
						skills[skill] = {
							value: 0,
							status: StatusNote.Wasted
						};
					}
					// Crew cannot contribute exhausted skills
					else if (!active && contestSkills.includes(skill)) {
						skills[skill] = {
							value: 0,
							status: StatusNote.Exhausted
						};
					}
					else {
						let crewRangeMin: number = crew.skills[skill].range_min;
						let crewRangeMax: number = crew.skills[skill].range_max;
						if (boost?.type === skill) {
							crewRangeMin += MIN_RANGE_BOOSTS[boost.rarity];
							crewRangeMax += MAX_RANGE_BOOSTS[boost.rarity];
						}
						let value: number = 0;
						// If active contest, AVA is full crew proficiency
						if (active) {
							value = Math.floor((crewRangeMin + crewRangeMax) / 2) * 3;
						}
						// Otherwise, AVA is value of unused skill when used
						else {
							value = getAddedValue(assignment.index + 1, skill, crewRangeMin, crewRangeMax);
						}
						skills[skill] = {
							value,
							status: StatusNote.Available
						};
					}
				}
				// Crew is missing active skill
				else if (contestIndex === activeContest.index) {
					skills[skill] = {
						value: 0,
						status: StatusNote.Inactive
					};
				}
			});

			return {
				index: contestIndex,
				crew,
				boost,
				skills
			};
		});
	}

	// Sum of added values should closely match expectedRoll.average
	// 	Because of differences of when rounding occurs, this number may not match exactly
	function getAddedValue(index: number, skill: string, crewRangeMin: number, crewRangeMax: number): number {
		// First residual is 50% of crew proficiency
		let residual: IRangeMinMax = {
			range_min: Math.floor(crewRangeMin / 2),
			range_max: Math.floor(crewRangeMax / 2)
		};

		const addedValues: IRangeMinMax[] = [];
		for (let i = index; i < encounter.contests.length; i++) {
			const contest: IContest = encounter.contests[i];
			const contestSkills: string[] = contest.skills.map(cs => cs.skill);
			// If contest requires skill, AVA here is current residual
			if (contestSkills.includes(skill)) {
				// Can only contribute if champion of active contest has skill
				if (Object.keys(activeContest.champion.crew.skills).includes(skill)) {
					addedValues.push(residual);
				}
			}
			// Otherwise update residual to 150% of current residual
			else {
				const assignment: IContestAssignment = assignments[contestIds[i]];
				if (assignment.crew?.skills[skill]) {
					residual = {
						range_min: residual.range_min + Math.floor(residual.range_min / 2),
						range_max: residual.range_max + Math.floor(residual.range_max / 2)
					};
				}
			}
		}

		const totalMin: number = addedValues.reduce((prev, curr) => prev + curr.range_min, 0);
		const totalMax: number = addedValues.reduce((prev, curr) => prev + curr.range_max, 0);
		return Math.floor((totalMin + totalMax) / 2) * 3;
	}

	function renderBoostPicker(contributor: IContributor): JSX.Element {
		if (!contributor.crew) return <></>;
		const totalValue: number = Object.keys(contributor.skills)
			.reduce((prev, curr) => prev + contributor.skills[curr].value, 0);
		if (totalValue === 0) {
			return renderNote(contributor, StatusNote.Irrelevant);
		}
		const targetSkills: string[] = Object.keys(contributor.skills);
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
				<BoostPicker
					assignedCrew={contributor.crew}
					assignedBoost={contributor.boost}
					targetSkills={targetSkills}
					targetCrit={contributor.index === activeContest.index}
					onBoostSelected={(boost) => editBoost(contributor, boost)}
				/>
			</div>
		);
	}

	function renderContribution(contributor: IContributor, skill: string): JSX.Element {
		const contributorSkill: IContributorSkill | undefined = contributor.skills[skill];
		if (!contributorSkill) return <></>;
		if (contributorSkill.status === StatusNote.Inactive)
			return <>{t('voyage.contests.no_skill')}</>;
		if (contributorSkill.status === StatusNote.Exhausted)
			return renderNote(contributor, StatusNote.Exhausted);
		if (contributorSkill.status === StatusNote.Wasted)
			return renderNote(contributor, StatusNote.Wasted);
		return <>+{contributorSkill.value}</>;
	}

	function renderTotalValue(skill: string): JSX.Element {
		const total: number = contributors.reduce((prev, curr) => prev + (curr.skills[skill] ? curr.skills[skill].value : 0), 0);
		if (total === 0) return <></>;
		return <b>{total}</b>;
	}

	function renderNote(contributor: IContributor, skillStatus?: StatusNote): JSX.Element {
		const contestId: string = contestIds[contributor.index];
		const assignedCrew: PlayerCrew | undefined = assignments[contestId].crew;
		if (assignedCrew) {
			let message: string = '';
			switch (skillStatus) {
				/* CREW has no relevant skills to contribute */
				case StatusNote.Irrelevant:
					message = `${assignedCrew.name} has no relevant skills to contribute`;
					break;
				/* CREW cannot contribute exhausted skills */
				case StatusNote.Exhausted:
					message = `${assignedCrew.name} cannot contribute exhausted skills`;
					break;
				/* CREW cannot contribute to inactive skills */
				case StatusNote.Wasted:
					message = `${assignedCrew.name} cannot contribute to inactive skills`;
					break;
			}
			if (message !== '')
				return <Icon name='info circle' title={message} />;
		}
		return <></>;
	}

	function editBoost(contributor: IContributor, boost: IChampionBoost | undefined): void {
		if (!contributor.crew) return;
		assignCrewToContest(
			encounter,
			assignments,
			contestIds[contributor.index],
			contributor.crew,
			boost
		);
		setAssignments({...assignments});
	}
};
