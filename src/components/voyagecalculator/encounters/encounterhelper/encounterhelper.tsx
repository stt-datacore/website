import React from 'react';
import {
	Accordion,
	Button,
	Icon,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { EquipmentItem } from '../../../../model/equipment';
import { PlayerCrew, Voyage, VoyageDescription } from '../../../../model/player';
import { VoyageRefreshData, VoyageRefreshEncounter } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';
import { mergeItems } from '../../../../utils/itemutils';

import { IEncounter } from '../model';
import { DEFAULT_CRIT_CHANCES } from '../utils';
import { EncounterContext, IEncounterContext } from './context';
import { assignCrewToContest, getChampionCrewData, getDefaultAssignments, IChampionContest, IChampionContestResult, IChampionCrewData, IContestAssignment, IContestAssignments, makeContestId } from './championdata';
import { ChampionsTable } from './champions';
import { ContestsTable } from './contests';
import { EncounterImportComponent, getEncounterDataFromJson, serializeEncounter } from './encounterimporter';
import { ChampionSimulator } from './simulator';

type EncounterHelperProps = {
	voyageConfig: Voyage;
};

export const EncounterHelperAccordion = (props: EncounterHelperProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageConfig } = props;

	const [isActive, setIsActive] = React.useState<boolean>(false);

	return (
		<Accordion	/* Encounter helper */>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				{t('voyage.contests.encounter_helper_title')}
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && <EncounterHelper voyageConfig={voyageConfig} />}
			</Accordion.Content>
		</Accordion>
	);
};

export const EncounterHelper = (props: EncounterHelperProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;
	const { voyageConfig } = props;

	const [encounterData, setEncounterData] = React.useState<VoyageRefreshEncounter | undefined>(undefined);

	// Encounter crit_chances are only defined for pending voyages (i.e. type VoyageDescription),
	//	so we have to manually attach them (or default crit chances) to serialized encounter data
	const critChances = React.useMemo<number[]>(() => {
		let critChances: number[] = DEFAULT_CRIT_CHANCES;
		const description: VoyageDescription | undefined = ephemeral?.voyageDescriptions.find(voyage =>
			voyage.voyage_type === 'encounter'
		);
		if (description?.crit_chances) critChances = Object.values(description.crit_chances);
		return critChances;
	}, [ephemeral]);

	const voyageCrew = React.useMemo<PlayerCrew[]>(() => {
		return voyageConfig.crew_slots.map(cs => cs.crew);
	}, [voyageConfig]);

	const encounter = React.useMemo<IEncounter | undefined>(() => {
		if (!encounterData) return undefined;
		return serializeEncounter(encounterData, critChances);
	}, [encounterData]);

	const inventory = React.useMemo<EquipmentItem[]>(() => {
		if (!playerData) return [];
		return mergeItems(playerData.player.character.items, globalContext.core.items)
			.filter(item => item.type === 4 || item.type === 13);
	}, [playerData]);

	return (
		<React.Fragment>
			<EncounterImportComponent
				voyage={voyageConfig}
				data={encounterData}
				setData={handleRefreshData}
			/>
			{encounter && (
				<Segment key={encounter.id}>
					<Encounter
						voyageCrew={voyageCrew}
						encounter={encounter}
						inventory={inventory}
					/>
				</Segment>
			)}
		</React.Fragment>
	);

	function handleRefreshData(refreshData: VoyageRefreshData[] | undefined): void {
		if (!refreshData) return;
		const encounterData: VoyageRefreshEncounter | undefined = getEncounterDataFromJson(refreshData);
		setEncounterData(encounterData);
	}
};

type EncounterProps = {
	voyageCrew: PlayerCrew[];
	encounter: IEncounter;
	inventory: EquipmentItem[];
};

const Encounter = (props: EncounterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageCrew, encounter, inventory } = props;

	const [championData, setChampionData] = React.useState<IChampionCrewData[] | undefined>(undefined);
	const [assignments, setAssignments] = React.useState<IContestAssignments>(getDefaultAssignments(encounter.contests));
	const [targetSkills, setTargetSkills] = React.useState<string[]>([]);
	const [simulatorTrigger, setSimulatorTrigger] = React.useState<IChampionContest | undefined>(undefined);

	React.useEffect(() => {
		setAssignments(getDefaultAssignments(encounter.contests));
		setTargetSkills([]);
	}, [encounter]);

	React.useEffect(() => {
		getChampionCrewData(voyageCrew, encounter, assignments, championData).then(updatedData => {
			setChampionData(updatedData);
		});
	}, [voyageCrew, encounter, assignments]);

	const contestIds = React.useMemo<string[]>(() => {
		return encounter.contests.map((contest, contestIndex) =>
			makeContestId(contest, contestIndex)
		);
	}, [encounter]);

	// Scroll here when targeting skills from contests table
	const championsAnchor = React.useRef<HTMLDivElement>(null);

	if (!championData) return <></>;

	const encounterData: IEncounterContext = {
		voyageCrew,
		encounter,
		contestIds,
		championData,
		assignments,
		setAssignments,
		inventory
	};

	return (
		<EncounterContext.Provider value={encounterData}>
			<ContestsTable
				setTargetSkills={(skills: string[]) => {
					setTargetSkills(skills);
					if (!championsAnchor.current) return;
					championsAnchor.current.scrollIntoView({
						behavior: 'smooth'
					});
				}}
				openSimulator={setSimulatorTrigger}
			/>
			<Button	/* Reset assignments */
				content={t('voyage.contests.reset_assignments')}
				onClick={() => setAssignments(getDefaultAssignments(encounter.contests))}
				disabled={!Object.keys(assignments).some(contestId => assignments[contestId].crew)}
			/>
			<Button	/* Reset boosts */
				content={t('voyage.contests.reset_boosts')}
				onClick={resetBoosts}
				disabled={!Object.keys(assignments).some(contestId => assignments[contestId].boost)}
			/>
			<div ref={championsAnchor} />
			<ChampionsTable
				id={`champions/${encounter.id}`}
				targetSkills={targetSkills}
				setTargetSkills={setTargetSkills}
				openSimulator={setSimulatorTrigger}
			/>
			{simulatorTrigger && (
				<ChampionSimulator
					activeContest={simulatorTrigger}
					updateData={updateData}
					cancelTrigger={() => setSimulatorTrigger(undefined)}
				/>
			)}
		</EncounterContext.Provider>
	);

	function updateData(result: IChampionContestResult, assignments?: IContestAssignments): void {
		// Update assignments by request
		if (assignments) setAssignments(assignments);
		// Replace previous contest results with new simulation results
		//	Do after updating assignments to avoid better results being replace by weaker results
		if (championData) {
			setTimeout(() => {
				setChampionData(championData => {
					if (!championData) return undefined;
					const crewData: IChampionCrewData | undefined = championData.find(crewData =>
						crewData.id === result.crewId
					);
					if (crewData) crewData.contests[result.contestId].result = result;
					return [...championData];
				});
			}, 0);
		}
	}

	function resetBoosts(): void {
		Object.keys(assignments).forEach(contestId => {
			const assignment: IContestAssignment = assignments[contestId];
			if (assignment.crew) {
				assignCrewToContest(
					encounter,
					assignments,
					contestId,
					assignment.crew
				);
			}
		});
		setAssignments({...assignments});
	}
};
