import React from 'react';
import {
	Button,
	Header,
	Icon,
	Label
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../../model/player';
import { IVoyageCalcConfig } from '../../../../model/voyage';
import { oneCrewCopy } from '../../../../utils/crewutils';

import CONFIG from '../../../CONFIG';
import { IDataTableColumn, IDataTableSetup, IEssentialData } from '../../../dataset_presenters/model';
import { DataTable } from '../../../dataset_presenters/datatable';
import { CrewLabel } from '../../../dataset_presenters/elements/crewlabel';

import { IContestSkill, IEncounter } from '../model';
import { formatContestResult } from '../utils';
import { ProficiencyRanges } from '../common/ranges';
import { ContestSimulatorModal } from '../contestsimulator/modal';

import { IChampion, IChampionCrewData, IChampionContest, IEndurableSkill, getChampionCrewData, makeContestId, IContestAssignments } from './championdata';

type ChampionsTableProps = {
	id: string;
	voyageConfig: IVoyageCalcConfig;
	encounter: IEncounter;
	assignments: IContestAssignments;
	setAssignments: (assignments: IContestAssignments) => void;
};

export const ChampionsTable = (props: ChampionsTableProps) => {
	const { voyageConfig, encounter, assignments, setAssignments } = props;

	const [data, setData] = React.useState<IChampionCrewData[] | undefined>(undefined);
	const [simulatorTrigger, setSimulatorTrigger] = React.useState<IChampionContest | undefined>(undefined);

	React.useEffect(() => {
		getChampionCrewData(voyageConfig, encounter, assignments, data).then(updatedData => {
			setData(updatedData);
		});
	}, [voyageConfig, encounter, assignments]);

	const tableSetup = React.useMemo<IDataTableSetup>(() => {
		const columns: IDataTableColumn[] = [
			{	/* Crew */
				id: 'name',
				title: 'Crew',
				sortField: { id: 'name', stringValue: true },
				renderCell: (datum: IEssentialData) => <CrewLabel crew={datum as IChampionCrewData} />
			},
			{	/* Starting Skills */
				id: 'skills',
				title: 'Starting Skills',
				align: 'center',
				sortField: { id: 'best_proficiency', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => renderCrewSkills(datum as IChampionCrewData)
			},
			{	/* Crit Chance */
				id: 'crit_chance',
				title: 'Crit Chance',
				align: 'center',
				sortField: { id: 'crit_chance', firstSort: 'descending' },
				renderCell: (datum: IEssentialData) => <>{(datum as IChampionCrewData).crit_chance * 100}%</>
			}
		];
		encounter.contests.forEach((contest, contestIndex) => {
			const contestId: string = makeContestId(contest, contestIndex);
			const viableChampions: number = voyageConfig.crew_slots.filter(crewSlot =>
				contest.skills.some(contestSkill => Object.keys(crewSlot.crew.skills).includes(contestSkill.skill))
			).length;
			columns.push(
				{
					id: `contests.${contestId}.odds`,
					title: renderContestColumnHeader(contest.skills, viableChampions),
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
							assignedChampion={assignments[contestId]?.champion}
							assignContestChampion={assignContestChampion}
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
	}, [voyageConfig, encounter, assignments]);

	return (
		<React.Fragment>
			<Header as='h4'>
				Voyage Crew
			</Header>
			<p>Your crew's expected odds of winning each contest are listed below. Tap the odds to simulate that contest with higher confidence. Tap <Icon name='check circle outline' fitted /> to assign the crew to that contest.</p>
			{data && (
				<React.Fragment>
					<DataTable
						id={`${props.id}/datatable`}
						data={data}
						setup={tableSetup}
					/>
					{simulatorTrigger && (
						<ChampionContestSimulator
							voyageConfig={voyageConfig}
							critTraits={encounter.critTraits}
							contest={simulatorTrigger}
							assignments={assignments}
							cancelTrigger={() => setSimulatorTrigger(undefined)}
						/>
					)}
				</React.Fragment>
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

	function renderContestColumnHeader(contestSkills: IContestSkill[], viableChampions: number): JSX.Element {
		return (
			<span title={`Your voyage has ${viableChampions} viable crew for this contest`}>
				{contestSkills.map(cs => (
					<img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${cs.skill}.png`} style={{ height: '1.1em', verticalAlign: 'middle' }} className='invertibleIcon' />
				))}
				{` `}({viableChampions})
			</span>
		);
	}

	function renderCrewSkills(crew: IChampionCrewData): JSX.Element {
		const skills = Object.keys(crew.skills).map(skill => {
			return {...crew.skills[skill], skill};
		});
		return <ProficiencyRanges skills={skills} sort />;
	}

	function assignContestChampion(contest: IChampionContest | undefined, champion: IChampion): void {
		// Remove from existing assignment, if necessary
		let existingContestId: string | undefined;
		Object.keys(assignments).forEach(contestId => {
			if (assignments[contestId].champion.crew.id === champion.crew.id)
				existingContestId = contestId;
		});
		if (existingContestId) delete assignments[existingContestId];
		if (contest) assignments[contest.id] = contest;
		setAssignments({...assignments});
	}
};

type ChampionContestCellProps = {
	contest: IChampionContest;
	assignedChampion: IChampion | undefined;
	assignContestChampion: (contest: IChampionContest | undefined, champion: IChampion) => void;
	setSimulatorTrigger: (contest: IChampionContest) => void;
};

const ChampionContestCell = (props: ChampionContestCellProps) => {
	const { contest, assignedChampion, assignContestChampion, setSimulatorTrigger } = props;

	if (contest.champion_roll.min === 0)
		return <></>;

	const isAssigned: boolean = !!assignedChampion && (assignedChampion.crew.id === contest.champion.crew.id);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', rowGap: '.5em' }}>
			<div>
				{!contest.result && <Icon loading name='spinner' />}
				{contest.result && (
					<Button.Group
						color={isAssigned ? 'blue' : undefined}
						compact
					>
						<Button	/* Simulate contest */
							title='Simulate contest'
							onClick={() => setSimulatorTrigger(contest)}
						>
							{formatContestResult(contest.result)}
						</Button>
						<Button	/* Assign CHAMPION_NAME to this contest */
							title={`Assign ${contest.champion.crew.name} to this contest`}
							onClick={() => assignContestChampion(!isAssigned ? contest : undefined, contest.champion)}
							icon={isAssigned ? 'check circle' : 'check circle outline'}
						/>
					</Button.Group>
				)}
			</div>
			<div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', columnGap: '.3em' }}>
				<span title={`${contest.champion.crew.name}'s expected score for this contest (without critical rolls)`}>
					{contest.champion_roll.average}
				</span>
				{contest.boosted_skills.length > 0 && (
					<span>
						<Icon name='arrow alternate circle up' color='green' fitted />
					</span>
				)}
				<span>
					vs
				</span>
				<span title={`Opponent's expected score for this contest`}>
					{contest.challenger_roll.average}
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
		const title: string = `If selected for this contest, ${contest.champion.crew.name}'s unused ${CONFIG.SKILLS[skill]} skill will boost ${contests} later contest${contests !== 1 ? 's' : ''} by ${endurableSkill.range_min}-${endurableSkill.range_max} per ${CONFIG.SKILLS[skill]} roll for an expected total boost of +${average*3}${contests > 1 ? ' per contest' : ''}`;
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
					{isAssigned && (
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
	voyageConfig: IVoyageCalcConfig;
	critTraits: string[];
	contest: IChampionContest;
	assignments: IContestAssignments;
	cancelTrigger: () => void;
};

const ChampionContestSimulator = (props: ChampionContestSimulatorProps) => {
	const { voyageConfig, critTraits, contest, assignments, cancelTrigger } = props;

	const boostedPool = React.useMemo<PlayerCrew[]>(() => {
		return voyageConfig.crew_slots.map(cs => {
			const crew: PlayerCrew = oneCrewCopy(cs.crew) as PlayerCrew;
			Object.keys(assignments).forEach(contestId => {
				const assignedContest: IChampionContest | undefined = assignments[contestId];
				if (assignedContest && assignedContest.index < contest.index && assignedContest.champion.crew.id !== crew.id) {
					assignedContest.champion.enduring_skills.forEach(es => {
						if (Object.keys(crew.skills).includes(es.skill)) {
							crew.skills[es.skill].range_min += es.range_min;
							crew.skills[es.skill].range_max += es.range_max;
						}
					});
				}
			});
			return crew;
		});
	}, [voyageConfig, contest, assignments]);

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
