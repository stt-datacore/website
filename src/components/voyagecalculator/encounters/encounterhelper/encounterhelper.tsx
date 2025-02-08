import React from 'react';
import {
	Accordion,
	Button,
	Icon,
	Label,
	Message,
	Segment,
	SemanticICONS
} from 'semantic-ui-react';

import { PlayerCrew, Voyage } from '../../../../model/player';
import { EncounterStartingSkills, VoyageRefreshData } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';

import { IContest, IContestSkill, IEncounter } from '../model';

import { getChampionCrewData, IChampionCrewData, IContestAssignments, IUnusedSkills, makeContestId } from './championdata';
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
	const [errorMessage, setErrorMessage] = React.useState<number>(0);

	const voyageCrew = React.useMemo<PlayerCrew[]>(() => {
		return voyageConfig.crew_slots.map(cs => cs.crew);
	}, [voyageConfig]);

	return (
		<React.Fragment>
			<EncounterImportComponent
				voyage={voyageConfig}
				setData={handleRefreshData}
				clearData={() => setEncounter(undefined)}
			/>
			{encounter && (
				<Segment key={encounter.id}>
					<Encounter
						voyageCrew={voyageCrew}
						encounter={encounter}
					/>
				</Segment>
			)}
			{errorMessage > 0 && (
				<Message>
					{errorMessage === 1 && (
						<span	/* No encounter data found. Please try again when your voyage has reached an encounter. */>
							No encounter data found. Please try again when your voyage has reached an encounter.
						</span>
					)}
					{errorMessage === 400 && (
						<span	/* The imported data is not valid. Please confirm the voyage data link is correct and try again. */>
							The imported data is not valid. Please confirm the voyage data link is correct and try again.
						</span>
					)}
				</Message>
			)}
		</React.Fragment>
	);

	// Convert VoyageRefreshData to IEncounter
	function handleRefreshData(refreshData: VoyageRefreshData[] | undefined): void {
		if (!refreshData) return;
		let encounter: IEncounter | undefined;
		try {
			refreshData.forEach(rd => {
				rd.character?.voyage.forEach(voyage => {
					if (voyage.encounter) {
						const startingSkills: EncounterStartingSkills = voyage.encounter.skills;
						const incrementProf: number = voyage.encounter.increment_prof;
						const traits: string[] = voyage.encounter.traits;
						const contests: IContest[] = [];
						voyage.encounter.contests_data.forEach((cd, contestIndex) => {
							const skills: IContestSkill[] = [];
							const critChance: number = cd.boss_crit_chance ?? 0;
							Object.keys(cd.skills).forEach(skillKey => {
								const skill: string = cd.skills[skillKey];
								skills.push({
									skill,
									range_min: cd.boss_min_prof ?? startingSkills[skill].min_prof,
									range_max: cd.boss_max_prof ?? startingSkills[skill].max_prof + (contestIndex * incrementProf)
								})
							});
							contests.push({ skills, critChance });
						});
						encounter = { id: voyage.encounter.id, critTraits: traits, contests };
					}
				});
			});
			setEncounter(encounter);
			setErrorMessage(!!encounter ? 0 : 1);
		}
		catch (e) {
			console.log(e);
			setErrorMessage(400);
		}
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
