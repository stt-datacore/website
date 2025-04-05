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

import { IEncounter } from '../model';

import { getChampionCrewData, IChampionCrewData, IContestAssignments, IUnusedSkills, makeContestId } from './championdata';
import { ChampionsTable } from './champions';
import { ContestsTable } from './contests';
import { EncounterImportComponent, getEncounterDataFromJson, serializeEncounter } from './encounterimporter';

type EncounterHelperProps = {
	voyageConfig: Voyage;
};

export const EncounterHelperAccordion = (props: EncounterHelperProps) => {
	const { voyageConfig } = props;

	const [isActive, setIsActive] = React.useState<boolean>(false);

	return (
		<Accordion>
			<Accordion.Title
				active={isActive}
				onClick={() => setIsActive(!isActive)}
			>
				<Icon name={isActive ? 'caret down' : 'caret right' as SemanticICONS} />
				Encounter helper
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
	const { voyageCrew, encounter } = props;

	const [championData, setChampionData] = React.useState<IChampionCrewData[] | undefined>(undefined);
	const [assignments, setAssignments] = React.useState<IContestAssignments>(getDefaultAssignments());
	const [targetSkills, setTargetSkills] = React.useState<string[]>([]);

	React.useEffect(() => {
		setAssignments(getDefaultAssignments());
		setTargetSkills([]);
	}, [encounter]);

	React.useEffect(() => {
		getChampionCrewData(voyageCrew, encounter, assignments, championData).then(updatedData => {
			setChampionData(updatedData);
		});
	}, [voyageCrew, encounter, assignments]);

	// Scroll here when targeting skills from contests table
	const championsAnchor = React.useRef<HTMLDivElement>(null);

	if (!championData) return <></>;

	return (
		<React.Fragment>
			<ContestsTable
				encounter={encounter}
				championData={championData}
				assignments={assignments}
				setTargetSkills={(skills: string[]) => {
					setTargetSkills(skills);
					if (!championsAnchor.current) return;
					championsAnchor.current.scrollIntoView({
						behavior: 'smooth'
					});
				}}
			/>
			<Button	/* Reset assignments */
				content='Reset assignments'
				onClick={() => setAssignments(getDefaultAssignments())}
			/>
			<div ref={championsAnchor} />
			<ChampionsTable
				id={`champions/${encounter.id}`}
				voyageCrew={voyageCrew}
				encounter={encounter}
				championData={championData}
				assignments={assignments}
				setAssignments={setAssignments}
				targetSkills={targetSkills}
				setTargetSkills={setTargetSkills}
			/>
		</React.Fragment>
	);

	function getDefaultAssignments(): IContestAssignments {
		const assignments: IContestAssignments = {};
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
			assignments[contestId] = {
				index: contestIndex,
				unusedSkills
			};
		});
		return assignments;
	}
};
