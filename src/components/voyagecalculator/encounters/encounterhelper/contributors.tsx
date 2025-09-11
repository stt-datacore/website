import React from 'react';
import {
	Icon,
	SemanticCOLORS,
	SemanticICONS,
	Table
} from 'semantic-ui-react';

import { GlobalContext } from '../../../../context/globalcontext';
import { PlayerCrew } from '../../../../model/player';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';

import { IContest } from '../model';
import { EncounterContext } from './context';
import { BoostPicker } from './boostpicker';
import { assignCrewToContest, IChampionBoost, IChampionContest, IContestAssignment, IContestAssignments, IRangeMinMax, MAX_RANGE_BOOSTS, MIN_RANGE_BOOSTS } from './championdata';

interface IContributor {
	index: number;
	crew?: PlayerCrew;
	boost?: IChampionBoost;
	skills: IContributorSkills;
	relevant: boolean;
	effectiveness: Effectiveness;
};

interface IContributorSkills {
	[key: string]: IContributorSkill;
};

interface IContributorSkill {
	value: number;
	status: SkillStatus;
};

enum SkillStatus {
	Available,
	Inactive,
	Wasted,
	Exhausted
};

enum Effectiveness {
	Unboosted,
	Unneeded,
	Ineffective,
	RelevantSkill,
	RelevantCrit,
	Self,
	Elsewhere
};

type ContributorsTableProps = {
	activeContest: IChampionContest;
	contestOdds: { [key: string]: number; };
	assignments: IContestAssignments;
	setAssignments: (assignments: IContestAssignments) => void;
};

export const ContributorsTable = (props: ContributorsTableProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { encounter, contestIds } = React.useContext(EncounterContext);
	const { activeContest, contestOdds, assignments, setAssignments } = props;

	const contributors = React.useMemo<IContributor[]>(() => {
		return getContributors();
	}, [assignments]);

	return (
		<React.Fragment>
			The crew assigned to this contest will contribute their full proficiency. Some crew assigned to prior contests may also contribute a fraction of their unused skills. The average values added to this contest by all contributing crew are listed below. You can add boosts to increase any contribution, which may improve the odds of winning this contest.
			<Table celled selectable striped fixed unstackable>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell	/* Contest */
							textAlign='center'
						>
							{t('voyage.contests.contest')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Assigned Crew */
							width={6}
						>
							{t('voyage.contests.assigned_crew')}
						</Table.HeaderCell>
						<Table.HeaderCell	/* Boost */
							width={4}
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
							<Table.Row key={contributor.index}>
								<Table.Cell textAlign='center'>
									{contributor.index + 1}
								</Table.Cell>
								<Table.Cell>
									{contributor.crew && <CrewLabel crew={contributor.crew} />}
									{!contributor.crew && <>{t('global.unassigned')}</>}
								</Table.Cell>
								<Table.Cell>
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
						);
					})}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={2} />
						<Table.HeaderCell>
							{renderCritChance()}
						</Table.HeaderCell>
						{activeContest.skills.map(contestSkill => (
							<Table.HeaderCell
								key={contestSkill.skill}
								textAlign='center'
							>
								{renderTotalValue(contestSkill.skill)}
							</Table.HeaderCell>
						))}
					</Table.Row>
				</Table.Footer>
			</Table>
		</React.Fragment>
	);

	function getContributors(): IContributor[] {
		const targetSkills: string[] = activeContest.skills.map(skill => skill.skill);
		return encounter.contests.slice(0, activeContest.index + 1).map((contest, contestIndex) => {
			const contestId: string = contestIds[contestIndex];
			const active: boolean = contestIndex === activeContest.index;

			const exhaustedSkills: string[] = contest.skills.map(cs => cs.skill);
			const futureSkills: string[] = [];
			encounter.contests.forEach((contest, futureIndex) => {
				if (futureIndex > contestIndex) {
					contest.skills.forEach(cs => {
						if (!futureSkills.includes(cs.skill))
							futureSkills.push(cs.skill);
					});
				}
			});

			const assignment: IContestAssignment = assignments[contestId];
			const crew: PlayerCrew | undefined = assignment.crew;
			const boost: IChampionBoost | undefined = assignment.boost;

			const skills: IContributorSkills = {};

			targetSkills.forEach(targetSkill => {
				if (crew?.skills[targetSkill]) {
					// Crew cannot contribute to inactive skills
					if (!activeContest.champion.skills.map(cs => cs.skill).includes(targetSkill)) {
						skills[targetSkill] = {
							value: 0,
							status: SkillStatus.Wasted
						};
					}
					// Crew cannot contribute exhausted skills
					else if (!active && exhaustedSkills.includes(targetSkill)) {
						skills[targetSkill] = {
							value: 0,
							status: SkillStatus.Exhausted
						};
					}
					else {
						let crewRangeMin: number = crew.skills[targetSkill].range_min;
						let crewRangeMax: number = crew.skills[targetSkill].range_max;
						if (boost?.type === targetSkill) {
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
							value = getAddedValue(assignment.index + 1, targetSkill, crewRangeMin, crewRangeMax);
						}
						skills[targetSkill] = {
							value,
							status: SkillStatus.Available
						};
					}
				}
				// Crew is missing active skill
				else if (contestIndex === activeContest.index) {
					skills[targetSkill] = {
						value: 0,
						status: SkillStatus.Inactive
					};
				}
			});

			// Not relevant if crew has no relevant skills to contribute to active contest or no crew assigned
			const relevant: boolean = contestIndex === activeContest.index || targetSkills.reduce((prev, curr) =>
				prev + (skills[curr] ? skills[curr].value : 0)
			, 0) > 0;

			let effectiveness: Effectiveness = Effectiveness.Unboosted;
			if (boost) {
				effectiveness = Effectiveness.Ineffective;
				// Crew is boosting crit chance of this contest
				if (boost.type === 'voyage_crit_boost' && contestIndex === activeContest.index) {
					effectiveness = Effectiveness.RelevantCrit;
				}
				// Crew is boosting a relevant skill
				else if (targetSkills.includes(boost.type) && (contestIndex === activeContest.index || !exhaustedSkills.includes(boost.type))) {
					effectiveness = Effectiveness.RelevantSkill;
				}
				// Crew is boosting their own contest
				else if (boost.type === 'voyage_crit_boost' || exhaustedSkills.includes(boost.type)) {
					effectiveness = Effectiveness.Self;
				}
				// Crew is (likely) boosting later contests
				else if (!exhaustedSkills.includes(boost.type) && futureSkills.includes(boost.type)) {
					effectiveness = Effectiveness.Elsewhere;
				}
			}
			else {
				// Boost would have no effect on active contest (i.e. odds of winning already 100%)
				//	Note: this may not immediately catch a contest that just reached 100% after boosting a prior contest
				if (contestOdds[activeContest.id] === 1) {
					effectiveness = Effectiveness.Unneeded;
				}
			}

			return {
				index: contestIndex,
				crew,
				boost,
				skills,
				relevant,
				effectiveness
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

		const notes: JSX.Element[] = [];
		if (contributor.crew) {
			let effectiveness: string = '';
			let icon: SemanticICONS | undefined;
			let color: SemanticCOLORS | undefined;
			switch (contributor.effectiveness) {
				/* Boost has no effect to any contest */
				case Effectiveness.Ineffective:
					effectiveness = `Boost has no effect to any contest`;
					icon = 'exclamation triangle';
					color = 'red';
					break;
				/* CREW is boosting a skill that is relevant to their own contest */
				case Effectiveness.Self:
					effectiveness = `${contributor.crew.name} is boosting a skill that is relevant to their own contest`
					icon = 'arrow circle left';
					color = 'yellow';
					break;
				/* CREW is boosting a skill that may be relevant to later contests */
				case Effectiveness.Elsewhere:
					effectiveness = `${contributor.crew.name} is boosting a skill that may be relevant to later contests`
					icon = 'arrow circle right';
					color = 'yellow';
					break;
				/* A boost here will have no effect on this contest */
				case Effectiveness.Unneeded:
					effectiveness = `A boost here will have no effect on this contest`;
					icon = 'minus circle';
					break;
			}
			if (effectiveness !== '')
				notes.push(makeIconNote(effectiveness, icon, color));

			/* CREW has no relevant skills to contribute to this contest */
			if (!contributor.relevant) {
				notes.push(
					makeIconNote(
						`${contributor.crew.name} has no relevant skills to contribute to this contest`,
						'minus circle'
					)
				);
			}
		}

		const relevantSkills: string[] = Object.keys(contributor.skills).filter(skill =>
			contributor.skills[skill].value > 0
		);

		return (
			<div style={{ display: 'flex', alignItems: 'center', columnGap: '1em' }}>
				<BoostPicker
					assignedCrew={contributor.crew}
					assignedBoost={contributor.boost}
					relevant={{
						skills: relevantSkills,
						crit: contributor.index === activeContest.index
					}}
					onBoostSelected={(boost) => editBoost(contributor, boost)}
				/>
				{notes.length > 0 && (
					<div>
						{notes.map((note, noteIndex) => (
							<span key={noteIndex}>
								{note}
							</span>
						))}
					</div>
				)}
			</div>
		);
	}

	function renderContribution(contributor: IContributor, skill: string): JSX.Element {
		const contributorSkill: IContributorSkill | undefined = contributor.skills[skill];
		if (!contributorSkill) return <></>;

		const contestId: string = contestIds[contributor.index];
		const assignedCrew: PlayerCrew | undefined = assignments[contestId].crew;
		if (!assignedCrew) return <></>;

		let irrelevant: string = '';
		switch (contributorSkill.status) {
			/* No skill */
			case SkillStatus.Inactive:
				return <>{t('voyage.contests.no_skill')}</>;
			/* CREW cannot contribute exhausted skills */
			case SkillStatus.Exhausted:
				irrelevant = `${assignedCrew.name} cannot contribute exhausted skills`;
				break;
			/* CREW cannot contribute to inactive skills */
			case SkillStatus.Wasted:
				irrelevant = `${assignedCrew.name} cannot contribute to inactive skills`;
				break;
		}
		if (irrelevant !== '') return makeIconNote(irrelevant, 'minus circle');

		let effectiveness: JSX.Element | undefined;
		/* CREW is boosting their contribution to this contest skill */
		if (contributor.effectiveness === Effectiveness.RelevantSkill && contributor.boost?.type === skill) {
			effectiveness = makeIconNote(
				`${assignedCrew.name} is boosting their contribution to this contest skill`,
				'arrow circle up',
				'green'
			);
		}

		return (
			<div
				style={{
					display: 'flex',
					flexWrap: 'nowrap',
					justifyContent: 'center',
					alignItems: 'center',
					columnGap: '.3em'
				}}
			>
				<span>+{contributorSkill.value}</span>
				{effectiveness && (
					<span>
						{effectiveness}
					</span>
				)}
			</div>
		);
	}

	function renderCritChance(): JSX.Element {
		const isBoosted: boolean = assignments[activeContest.id].boost?.type === 'voyage_crit_boost';
		return (
			<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', columnGap: '.3em' }}>
				<span>
					<img
						src={`${process.env.GATSBY_ASSETS_URL}atlas/crit_icon_gauntlet.png`}
						style={{ height: '1.1em' }}
						className='invertibleIcon'
					/>
				</span>
				<span>{activeContest.champion.critChance}%</span>
				{isBoosted && (
					<span>
						{makeIconNote(
							`${activeContest.champion.crew.name} is boosting this contest's crit chance`,
							'arrow circle up',
							'green'
						)}
					</span>
				)}
			</div>
		);
	}

	function renderTotalValue(skill: string): JSX.Element {
		const total: number = contributors.reduce((prev, curr) => prev + (curr.skills[skill] ? curr.skills[skill].value : 0), 0);
		if (total === 0) return <></>;
		return <b>{total}</b>;
	}

	function makeIconNote(message: string, icon?: SemanticICONS, color?: SemanticCOLORS): JSX.Element {
		return (
			<Icon
				title={message}
				name={icon ?? 'info circle'}
				color={color ?? undefined}
			/>
		);
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
