import React from 'react';
import {
	Accordion,
	Button,
	Icon,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { PlayerCrew, Voyage } from '../../../../model/player';
import { VoyageRefreshData, VoyageRefreshEncounter } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';

import { IEncounter } from '../model';
import { EncounterContext, IEncounterContext } from './context';
import { getChampionCrewData, getDefaultAssignments, IChampionCrewData, IContestAssignments, makeContestId } from './championdata';
import { ChampionsTable } from './champions';
import { ContestsTable } from './contests';
import { EncounterImportComponent, getEncounterDataFromJson, serializeEncounter } from './encounterimporter';

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
	const { voyageConfig } = props;

	const [encounterData, setEncounterData] = React.useState<VoyageRefreshEncounter | undefined>(undefined);

	const voyageCrew = React.useMemo<PlayerCrew[]>(() => {
		return voyageConfig.crew_slots.map(cs => cs.crew);
	}, [voyageConfig]);

	const encounter = React.useMemo<IEncounter | undefined>(() => {
		if (!encounterData) return undefined;
		return serializeEncounter(encounterData);
	}, [encounterData]);

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
};

const Encounter = (props: EncounterProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyageCrew, encounter } = props;

	const [championData, setChampionData] = React.useState<IChampionCrewData[] | undefined>(undefined);
	const [assignments, setAssignments] = React.useState<IContestAssignments>(getDefaultAssignments(encounter.contests));
	const [targetSkills, setTargetSkills] = React.useState<string[]>([]);

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
		setAssignments
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
			/>
			<Button	/* Reset assignments */
				content={t('voyage.contests.reset_assignments')}
				onClick={() => setAssignments(getDefaultAssignments(encounter.contests))}
			/>
			<div ref={championsAnchor} />
			<ChampionsTable
				id={`champions/${encounter.id}`}
				targetSkills={targetSkills}
				setTargetSkills={setTargetSkills}
			/>
		</EncounterContext.Provider>
	);
};
