import React from 'react';
import {
	Button,
	Form,
	Header,
	Icon,
	Label
} from 'semantic-ui-react';

import { BaseSkills } from '../../../../model/crew';
import { PlayerCrew } from '../../../../model/player';
import { GlobalContext } from '../../../../context/globalcontext';
import { oneCrewCopy } from '../../../../utils/crewutils';

import CONFIG from '../../../CONFIG';
import { IDataTableColumn, IDataTableSetup, IEssentialData } from '../../../dataset_presenters/model';
import { DataTable } from '../../../dataset_presenters/datatable';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';
import { SkillToggler } from '../../../dataset_presenters/options/skilltoggler';
import { AvatarView } from '../../../item_presenters/avatarview';

import { IContestSkill, IEncounter } from '../model';
import { formatContestResult } from '../utils';
import { ProficiencyRanges } from '../common/ranges';
import { ContestSimulatorModal } from '../contestsimulator/modal';

import { IChampionCrewData, IChampionContest, IEndurableSkill, makeContestId, IContestAssignments, IContestAssignment, IUnusedSkills } from './championdata';

type ChampionsTableProps = {
	id: string;
	voyageCrew: PlayerCrew[];
	encounter: IEncounter;
	championData: IChampionCrewData[];
	assignments: IContestAssignments;
	setAssignments: (assignments: IContestAssignments) => void;
	targetSkills: string[];
	setTargetSkills: (targetSkills: string[]) => void;
};

export const ChampionsTable = (props: ChampionsTableProps) => {
	const { t, tfmt } = React.useContext(GlobalContext).localized;
	const { voyageCrew, encounter, championData, assignments, setAssignments, targetSkills, setTargetSkills } = props;

	const [simulatorTrigger, setSimulatorTrigger] = React.useState<IChampionContest | undefined>(undefined);

	const tableSetup = React.useMemo<IDataTableSetup>(() => {
		const columns: IDataTableColumn[] = [
			{	/* Crew */
				id: 'name',
				title: t('base.crew'),
				sortField: { id: 'name', stringValue: true },
				renderCell: (datum: IEssentialData) => renderCrewCell(datum as IChampionCrewData)
			},
			{	/* Starting Skills */
				id: 'skills',
				title: t('voyage.contests.starting_skills'),
				align: 'center',
				sortField: { id: 'best_proficiency', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => renderCrewSkills(datum as IChampionCrewData)
			},
			{	/* Crit Chance */
				id: 'crit_chance',
				title: t('voyage.contests.crit_chance'),
				align: 'center',
				sortField: { id: 'crit_chance', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => <>{(datum as IChampionCrewData).crit_chance}%</>
			}
		];
		encounter.contests.forEach((contest, contestIndex) => {
			const contestId: string = makeContestId(contest, contestIndex);
			columns.push(
				{
					id: `contests.${contestId}.odds`,
					title: renderContestColumnHeader(contest.skills, assignments[contestId]),
					align: 'center',
					sortField: {
						id: `contests.${contestId}.odds`,
						firstSort: 'descending',
						customSort: (a: IEssentialData, b: IEssentialData, sortDirection: 'ascending' | 'descending') => {
							const aContest: IChampionContest = (a as IChampionCrewData).contests[contestId];
							const bContest: IChampionContest = (b as IChampionCrewData).contests[contestId];
							return championContestSort(aContest, bContest, sortDirection);
						}
					},
					renderCell: (datum: IEssentialData) => (
						<ChampionContestCell
							contest={(datum as IChampionCrewData).contests[contestId]}
							assignments={assignments}
							assignCrew={assignCrewToContest}
							setSimulatorTrigger={setSimulatorTrigger}
						/>
					)
				}
			);
		});
		return {
			columns,
			rowsPerPage: 12
		};
	}, [championData, targetSkills]);

	const filteredData = React.useMemo<IChampionCrewData[]>(() => {
		return championData.filter(crewData =>
			targetSkills.length === 0 || Object.keys(crewData.skills).some(skill => targetSkills.includes(skill))
		);
	}, [championData, targetSkills]);

	return (
		<React.Fragment>
			<Header	/* Voyage Crew */
				as='h4'
			>
				{t('voyage.contests.champions_header')}
			</Header>
			<p>
				{tfmt('voyage.contests.champions_description', { icon: <Icon name='check circle outline' fitted /> })}
			</p>
			<Form>
				<Form.Group inline>
					<SkillToggler
						value={targetSkills}
						setValue={setTargetSkills}
						maxSkills={2}
					/>
					{targetSkills.length > 0 && (
						<Button	/* Reset */
							content={t('global.reset')}
							onClick={() => setTargetSkills([])}
							compact
						/>
					)}
				</Form.Group>
			</Form>
			<DataTable
				id={`${props.id}/datatable`}
				data={filteredData}
				setup={tableSetup}
			/>
			{simulatorTrigger && (
				<ChampionContestSimulator
					voyageCrew={voyageCrew}
					critTraits={encounter.critTraits}
					contest={simulatorTrigger}
					assignments={assignments}
					cancelTrigger={() => setSimulatorTrigger(undefined)}
				/>
			)}
		</React.Fragment>
	);

	function championContestSort(a: IChampionContest, b: IChampionContest, sortDirection: 'ascending' | 'descending'): number {
		const avgEndurable = (contest: IChampionContest) =>
			contest.endurable_skills.reduce((prev, curr) => prev + ((curr.range_min + curr.range_max) / 2), 0);
		if (a.odds === b.odds) {
			if (a.odds === 1) {
				const aEndurable: number = avgEndurable(a);
				const bEndurable: number = avgEndurable(b);
				return sortDirection === 'descending' ? bEndurable - aEndurable : aEndurable - bEndurable;
			}
			const aRoll: number = a.champion_roll.average;
			const bRoll: number = b.champion_roll.average;
			return sortDirection === 'descending' ? bRoll - aRoll : aRoll - bRoll;
		}
		return sortDirection === 'descending' ? b.odds - a.odds : a.odds - b.odds;
	}

	function renderContestColumnHeader(contestSkills: IContestSkill[], assignment: IContestAssignment): JSX.Element {
		const renderSkillIcon = (skill: string) => {
			return (
				<img
					src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
					style={{ height: '1.1em', verticalAlign: 'middle' }}
					className='invertibleIcon'
				/>
			);
		};
		const skillIcons: JSX.Element[] = contestSkills.map(cs => {
			if (targetSkills.includes(cs.skill)) {
				return (
					<Label key={cs.skill} circular color='blue'>
						<div>
							{renderSkillIcon(cs.skill)}
						</div>
					</Label>
				);
			}
			return (
				<span key={cs.skill}>
					{renderSkillIcon(cs.skill)}
				</span>
			);
		});
		if (assignment.crew) {
			return (
				<span	/* CREW_NAME is assigned to this contest */
					title={t('voyage.contests.assigned_to_crew', { crew: assignment.crew.name })}
					style={{ display: 'inline-flex', alignItems: 'center', columnGap: '.5em' }}
				>
					<span>{skillIcons}</span>
					<AvatarView mode='crew' item={assignment.crew} size={32} />
				</span>
			);
		}
		const assignedIds: number[] = Object.keys(assignments).map(contestId => assignments[contestId].crew?.id ?? -1);
		const viableChampions: number = voyageCrew.filter(crew =>
			contestSkills.some(contestSkill => Object.keys(crew.skills).includes(contestSkill.skill))
				&& !assignedIds.includes(crew.id)
		).length;
		return (
			<span	/* Your voyage has N viable crew for this contest */
				title={t('voyage.contests.n_viable_crew', { n: viableChampions })}
				style={{ display: 'inline-flex', alignItems: 'center', columnGap: '.5em' }}
			>
				<span>{skillIcons}</span>
				<span>({viableChampions})</span>
			</span>
		);
	}

	function renderCrewCell(datum: IChampionCrewData): JSX.Element {
		const assignedContest: string | undefined = getAssignedContest(assignments, datum.id);
		return (
			<React.Fragment>
				<CrewLabel crew={datum} />
				{assignedContest && (
					<Label	/* Assigned to Contest N */
						color='blue'
						style={{ marginTop: '1em' }}
					>
						{t('voyage.contests.assigned_to_n', { n: assignments[assignedContest].index + 1 })}
					</Label>
				)}
			</React.Fragment>
		);
	}

	function renderCrewSkills(crew: IChampionCrewData): JSX.Element {
		const skills = Object.keys(crew.skills).map(skill => {
			return {...crew.skills[skill], skill};
		});
		return <ProficiencyRanges skills={skills} sort />;
	}

	function assignCrewToContest(contest: IChampionContest | undefined, crew: PlayerCrew): void {
		// Remove crew from existing assignment, if necessary
		Object.keys(assignments).forEach(contestId => {
			if (assignments[contestId].crew?.id === crew.id)
				assignments[contestId].crew = undefined;
		});
		if (contest) assignments[contest.id].crew = crew;

		const unusedSkills: IUnusedSkills = {
			command_skill: { min: 0, max: 0 },
			diplomacy_skill: { min: 0, max: 0 },
			engineering_skill: { min: 0, max: 0 },
			medicine_skill: { min: 0, max: 0 },
			science_skill: { min: 0, max: 0 },
			security_skill: { min: 0, max: 0 }
		};

		encounter.contests.forEach((contest, contestIndex) => {
			const contestId: string = makeContestId(contest, contestIndex);
			const assignment: IContestAssignment = assignments[contestId];
			assignment.unusedSkills = structuredClone(unusedSkills);
			if (assignment.crew) {
				const crewSkills: BaseSkills = assignment.crew.skills;
				Object.keys(crewSkills).filter(skill =>
					!contest.skills.map(cs => cs.skill).includes(skill)
				).forEach(unusedSkill => {
					const min: number = unusedSkills[unusedSkill].min + crewSkills[unusedSkill].range_min;
					const max: number = unusedSkills[unusedSkill].max + crewSkills[unusedSkill].range_max;
					unusedSkills[unusedSkill].min += Math.floor(min / 2);
					unusedSkills[unusedSkill].max += Math.floor(max / 2);
				});
			}
		});

		setAssignments({...assignments});
	}
};

type ChampionContestCellProps = {
	contest: IChampionContest;
	assignments: IContestAssignments;
	assignCrew: (contest: IChampionContest | undefined, crew: PlayerCrew) => void;
	setSimulatorTrigger: (contest: IChampionContest) => void;
};

const ChampionContestCell = (props: ChampionContestCellProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { contest, assignments, assignCrew, setSimulatorTrigger } = props;

	if (contest.champion_roll.min === 0)
		return <></>;

	const assignedContest: string | undefined = getAssignedContest(assignments, contest.champion.crew.id);

	const crewIsAssigned: boolean = !!assignedContest;
	const crewIsAssignedHere: boolean = assignedContest === contest.id;
	const contestIsAssigned: boolean = !!assignments[contest.id].crew;

	const boostedSkills: number = Object.keys(assignments[contest.id].unusedSkills).filter(unusedSkill =>
		assignments[contest.id].unusedSkills[unusedSkill].min > 0 &&
			contest.skills.map(cs => cs.skill).includes(unusedSkill)
	).length;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', rowGap: '.5em' }}>
			<div>
				{!contest.result && <Icon loading name='spinner' />}
				{contest.result && (
					<Button.Group
						color={crewIsAssignedHere ? 'blue' : undefined}
						compact
					>
						<Button	/* Simulate contest */
							title={t('voyage.contests.simulate_contest')}
							onClick={() => setSimulatorTrigger(contest)}
						>
							{formatContestResult(contest.result)}
						</Button>
						<Button	/* Assign CHAMPION_NAME to this contest */
							title={t('voyage.contests.assign_crew', { crew: contest.champion.crew.name })}
							onClick={() => assignCrew(!crewIsAssignedHere ? contest : undefined, contest.champion.crew)}
							icon
						>
							{!crewIsAssigned && !contestIsAssigned && <Icon name='check circle outline' />}
							{crewIsAssignedHere && <Icon name='check circle' />}
							{((crewIsAssigned || contestIsAssigned) && !crewIsAssignedHere) && <Icon name='check circle outline' color='grey' />}
						</Button>
					</Button.Group>
				)}
			</div>
			<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
				<span	/* CREW_NAME's average score for this contest */
					title={t('voyage.contests.avg_of_crew', { crew: contest.champion.crew.name })}
				>
					{contest.result?.simulated?.a.average ?? contest.champion_roll.average}
				</span>
				{boostedSkills > 0 && (
					<span>
						<Icon name='arrow alternate circle up' color='green' fitted />
					</span>
				)}
				<span>
					vs
				</span>
				<span	/* Opponent's average score for this contest */
					title={t('voyage.contests.avg_of_opponent')}
				>
					{contest.result?.simulated?.b.average ?? contest.challenger_roll.average}
				</span>
			</div>
			{contest.endurable_skills.length > 0 && (
				<Label.Group>
					{contest.endurable_skills.map(es => renderEndurableSkill(es))}
				</Label.Group>
			)}
		</div>
	);

	function renderEndurableSkill(endurableSkill: IEndurableSkill): JSX.Element {
		const skill: string = endurableSkill.skill;
		const contests: number = endurableSkill.contests_boosted;
		const average: number = endurableSkill.range_min + Math.floor((endurableSkill.range_max - endurableSkill.range_min) / 2);
		const title: string = `If selected for this contest, ${contest.champion.crew.name}'s unused ${CONFIG.SKILLS[skill]} skill will boost ${contests} later contest${contests !== 1 ? 's' : ''} by +(${endurableSkill.range_min}-${endurableSkill.range_max}) per ${CONFIG.SKILLS[skill]} roll for an average total boost of +${average*3}${contests > 1 ? ' per contest' : ''}`;
		return (
			<Label key={skill} title={title}>
				<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
					<span>
						<img
							src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`}
							style={{ height: '1.1em', verticalAlign: 'middle' }}
							className='invertibleIcon'
						/>
					</span>
					<span>
						+{average*3}
					</span>
					{crewIsAssignedHere && (
						<span>
							<Icon name='arrow alternate circle right' color='green' />
						</span>
					)}
				</div>
			</Label>
		);
	}
};

type ChampionContestSimulatorProps = {
	voyageCrew: PlayerCrew[];
	critTraits: string[];
	contest: IChampionContest;
	assignments: IContestAssignments;
	cancelTrigger: () => void;
};

const ChampionContestSimulator = (props: ChampionContestSimulatorProps) => {
	const { voyageCrew, critTraits, contest, assignments, cancelTrigger } = props;

	const boostedPool = React.useMemo<PlayerCrew[]>(() => {
		const unusedSkills: IUnusedSkills = assignments[contest.id].unusedSkills;
		return voyageCrew.map(voyager => {
			const crew: PlayerCrew = oneCrewCopy(voyager) as PlayerCrew;
			Object.keys(crew.skills).forEach(skill => {
				if (contest.skills.map(cs => cs.skill).includes(skill)) {
					crew.skills[skill].range_min += unusedSkills[skill].min;
					crew.skills[skill].range_max += unusedSkills[skill].max;
				}
			});
			return crew;
		});
	}, [voyageCrew, contest, assignments]);

	return (
		<ContestSimulatorModal
			id='champions/contestsimulator'
			skills={contest.skills.map(cs => cs.skill)}
			traits={critTraits}
			a={contest.champion}
			aPool={boostedPool}
			b={contest.challenger}
			dismissSimulator={cancelTrigger}
		/>
	);
};

function getAssignedContest(assignments: IContestAssignments, crewId: number): string | undefined {
	let assignedContest: string | undefined;
	Object.keys(assignments).forEach(contestId => {
		if (assignments[contestId].crew?.id === crewId)
			assignedContest = contestId;
	});
	return assignedContest;
}
