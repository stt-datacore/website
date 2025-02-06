import React from 'react';
import {
	Accordion,
	Button,
	Icon,
	Label,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { Voyage } from '../../../../model/player';
import { VoyageRefreshData } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';
import { IEncounter } from '../model';
import { IContestAssignments } from './championdata';
import { ChampionsTable } from './champions';
import { ContestsTable } from './contests';
import { EncounterEditor } from './encountereditor';
import { EncounterImportComponent } from './encounterimporter';

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
				{isActive && renderContent()}
			</Accordion.Content>
		</Accordion>
	);

	function renderContent(): JSX.Element {
		return (
			<Segment>
				<EncounterHelper voyageConfig={voyageConfig} />
			</Segment>
		);
	}
};

export const EncounterHelper = (props: EncounterHelperProps) => {
	const { voyageConfig } = props;

	const [refreshData, setRefreshData] = React.useState<VoyageRefreshData[] | undefined>(undefined);

	const [encounter, setEncounter] = React.useState<IEncounter | undefined>(undefined);
	const [assignments, setAssignments] = React.useState<IContestAssignments>({});

	React.useEffect(() => {
		setAssignments({});
	}, [encounter]);

	if (!encounter) return renderEditorTrigger();

	return (
		<React.Fragment>
			<div style={{ display: 'flex', alignItems: 'center' }}>
				<EncounterCritTraits
					encounter={encounter}
				/>
				{renderEditorTrigger()}
			</div>
			<ContestsTable
				encounter={encounter}
				assignments={assignments}
			/>
			<Button	/* Reset assignments */
				content='Reset assignments'
				onClick={() => setAssignments({})}
			/>
			<ChampionsTable
				voyageConfig={voyageConfig}
				encounter={encounter}
				assignments={assignments}
				setAssignments={setAssignments}
			/>
		</React.Fragment>
	);

	function renderEditorTrigger(): JSX.Element {
		return (
			<React.Fragment>
				<EncounterEditor
					traitPool={voyageConfig.event_content?.encounter_traits}
					encounter={encounter}
				/>

				<EncounterImportComponent
					voyage={voyageConfig}
					setData={handleRefreshData}
					clearData={() => setEncounter(undefined)}
					data={refreshData}
				/>
			</React.Fragment>
		);
	}

	function handleRefreshData(refreshData: VoyageRefreshData[] | undefined): void {
		// TODO: validate encounter in refresh data
		setRefreshData(refreshData);
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
