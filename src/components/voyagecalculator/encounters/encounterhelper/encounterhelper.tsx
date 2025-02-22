import React from 'react';
import {
	Accordion,
	Button,
	Icon,
	Label,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { PlayerCrew, Voyage } from '../../../../model/player';
import { VoyageRefreshData } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';

import { IEncounter } from '../model';

import { getChampionCrewData, IChampionCrewData, IContestAssignments, IUnusedSkills, makeContestId } from './championdata';
import { ChampionsTable } from './champions';
import { ContestsTable } from './contests';
import { EncounterImportComponent, getEncounterFromJson } from './encounterimporter';

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
				Encounter helper (Experimental)
			</Accordion.Title>
			<Accordion.Content active={isActive}>
				{isActive && <EncounterHelper voyageConfig={voyageConfig} />}
			</Accordion.Content>
		</Accordion>
	);
};

export const EncounterHelper = (props: EncounterHelperProps) => {
	const { voyageConfig } = props;

	const [encounter, setEncounter] = React.useState<IEncounter | undefined>(undefined);

	const voyageCrew = React.useMemo<PlayerCrew[]>(() => {
		return voyageConfig.crew_slots.map(cs => cs.crew);
	}, [voyageConfig]);

	return (
		<React.Fragment>
			<EncounterImportComponent
				voyage={voyageConfig}
				setData={handleRefreshData}
				currentHasRemote={!!encounter}
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
		const encounter: IEncounter | undefined = getEncounterFromJson(refreshData);
		setEncounter(encounter);
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

	React.useEffect(() => {
		setAssignments(getDefaultAssignments());
	}, [encounter]);

	React.useEffect(() => {
		getChampionCrewData(voyageCrew, encounter, assignments, championData).then(updatedData => {
			setChampionData(updatedData);
		});
	}, [voyageCrew, encounter, assignments]);

	if (!championData) return <></>;

	return (
		<React.Fragment>
			<EncounterCritTraits
				encounter={encounter}
			/>
			<ContestsTable
				encounter={encounter}
				championData={championData}
				assignments={assignments}
			/>
			<Button	/* Reset assignments */
				content='Reset assignments'
				onClick={() => setAssignments(getDefaultAssignments())}
			/>
			<ChampionsTable
				id={`champions/${encounter.id}`}
				voyageCrew={voyageCrew}
				encounter={encounter}
				championData={championData}
				assignments={assignments}
				setAssignments={setAssignments}
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

type EncounterCritTraitsProps = {
	encounter: IEncounter;
};

const EncounterCritTraits = (props: EncounterCritTraitsProps) => {
	const { TRAIT_NAMES } = React.useContext(GlobalContext).localized;
	const { encounter } = props;
	return (
		<Label.Group>
			{encounter?.critTraits?.sort((a, b) => TRAIT_NAMES[a].localeCompare(TRAIT_NAMES[b])).map(critTrait => (
				<Label key={critTrait} content={TRAIT_NAMES[critTrait]} />
			))}
		</Label.Group>
	);
};
