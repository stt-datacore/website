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
import { EncounterStartingSkills, VoyageRefreshData } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';
import { IContest, IContestSkill, IEncounter } from '../model';
import { IContestAssignments } from './championdata';
import { ChampionsTable } from './champions';
import { ContestsTable } from './contests';
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
				{isActive && <EncounterHelper voyageConfig={voyageConfig} />}
			</Accordion.Content>
		</Accordion>
	);
};

export const EncounterHelper = (props: EncounterHelperProps) => {
	const { voyageConfig } = props;

	const [encounter, setEncounter] = React.useState<IEncounter | undefined>(undefined);
	const [assignments, setAssignments] = React.useState<IContestAssignments>({});

	React.useEffect(() => {
		setAssignments({});
	}, [encounter]);

	return (
		<React.Fragment>
			<EncounterImportComponent
				voyage={voyageConfig}
				setData={handleRefreshData}
				clearData={() => setEncounter(undefined)}
			/>
			{encounter && (
				<Segment key={encounter.id}>
					<EncounterCritTraits
						encounter={encounter}
					/>
					<ContestsTable
						encounter={encounter}
						assignments={assignments}
					/>
					<Button	/* Reset assignments */
						content='Reset assignments'
						onClick={() => setAssignments({})}
					/>
					<ChampionsTable
						id={`champions/${encounter.id}`}
						voyageConfig={voyageConfig}
						encounter={encounter}
						assignments={assignments}
						setAssignments={setAssignments}
					/>
				</Segment>
			)}
		</React.Fragment>
	);

	// Convert VoyageRefreshData to IEncounter
	function handleRefreshData(refreshData: VoyageRefreshData[] | undefined): void {
		if (!refreshData) return;
		let encounter: IEncounter | undefined;
		refreshData.forEach(rd => {
			rd.character?.voyage.forEach(voyage => {
				if (voyage.encounter) {
					const defaultSkills: EncounterStartingSkills = voyage.encounter.skills;
					const incrementProf: number = voyage.encounter.increment_prof;
					const traits: string[] = voyage.encounter.traits;
					const contests: IContest[] = [];
					voyage.encounter.contests_data.forEach((cd, contestIndex) => {
						const skills: IContestSkill[] = [];
						Object.keys(cd.skills).forEach(skillKey => {
							const skill: string = cd.skills[skillKey];
							skills.push({
								skill,
								range_min: defaultSkills[skill].min_prof,
								range_max: defaultSkills[skill].max_prof + (contestIndex * incrementProf)
							})
						});
						contests.push({ skills });
					});
					encounter = { id: voyage.encounter.id, critTraits: traits, contests };
				}
			});
		});
		setEncounter(encounter);
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
