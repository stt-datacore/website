import React from 'react';
import {
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { PlayerCrew } from '../../../../model/player';

import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';

import { IContest, IEncounter } from '../model';
import { IChampionBoost, IRangeMinMax } from './championdata';
import { MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from './championdata';

import { BoostPicker } from './boostpicker';

import { IChampionContest, IContestAssignment, IContestAssignments, makeContestId } from './championdata';

interface IContributor {
	index: number;
	crew?: PlayerCrew;
	boost?: IChampionBoost;
	skillValues: { [key: string]: number; };
};

type ContributorsTableProps = {
	encounter: IEncounter,
	activeContest: IChampionContest,
	assignments: IContestAssignments;
};

export const ContributorsTable = (props: ContributorsTableProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, activeContest, assignments } = props;

	const contestIds: string[] = encounter.contests.map((contest, contestIndex) => makeContestId(contest, contestIndex));

	const contributors = React.useMemo<IContributor[]>(() => {
		return getContributors();
	}, [assignments]);

	return (
		<React.Fragment>
			The crew assigned to this contest will contribute their full proficiency to the contest. Some crew assigned to prior contests may also contribute a fraction of their unused skills. The average values added are listed below. Add boosts to increase these values, which may improve the odds of winning the contest.
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
										{contributor.crew && (
											<BoostPicker
												skills={activeContest.skills.map(contestSkill => contestSkill.skill)}
												activeBoost={contributor.boost}
												onBoostSelected={() => {}}
												impact='now'
											/>
										)}
									</Table.Cell>
									{activeContest.skills.map(contestSkill => (
										<Table.Cell
											key={contestSkill.skill}
											textAlign='center'>
												{renderAddedValue(contributor, contestSkill.skill)}
										</Table.Cell>
									))}
								</Table.Row>
							</React.Fragment>
						);
					})}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={3} />
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

			const skillValues: { [key: string]: number; } = {};

			activeContest.skills.forEach(contestSkill => {
				const skill: string = contestSkill.skill;
				if (crew?.skills[skill] && (active || !contestSkills.includes(skill))) {
					let min: number = crew.skills[skill].range_min;
					let max: number = crew.skills[skill].range_max;
					if (boost?.type === skill) {
						min += MIN_RANGE_BOOSTS[boost.rarity];
						max += MAX_RANGE_BOOSTS[boost.rarity];
					}
					// If active contest, AVA is full crew proficiency
					if (active) {
						skillValues[skill] = Math.floor((min + max) / 2) * 3;
					}
					// Otherwise, AVA is value of unused skill when used
					else {
						skillValues[skill] = getAddedValue(assignment.index + 1, skill, min, max);
					}
				}
			});

			return {
				index: contestIndex,
				crew,
				boost,
				skillValues
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

	function renderAddedValue(contributor: IContributor, skill: string): JSX.Element {
		if (!contributor.skillValues[skill]) return <></>;
		return <>+{contributor.skillValues[skill]}</>;
	}

	function renderTotalValue(skill: string): JSX.Element {
		const total: number = contributors.reduce((prev, curr) => prev + (curr.skillValues[skill] ?? 0), 0);
		if (total === 0) return <></>;
		return <b>{total}</b>;
	}
};
