import React from 'react';

import { Voyage } from '../../../../model/player';
import { EncounterStartingSkills, VoyageRefreshData } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';
import { JsonInputForm } from '../../../base/jsoninputform';
import { Notification } from '../../../page/notification';
import { IContest, IContestSkill, IEncounter } from '../model';

export interface EncounterImportProps {
	voyage: Voyage
	setData: (value?: VoyageRefreshData[]) => void;
	currentHasRemote: boolean;
};

export const EncounterImportComponent = (props: EncounterImportProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { voyage, setData, currentHasRemote } = props;

	const [collapsed, setCollapsed] = React.useState<boolean>(false);

	return (
		<React.Fragment>
			{!currentHasRemote && (
				<Notification
					header='Additional Data Required'
					content={renderImportMessage()}
					icon='database'
					warning
				/>
			)}
			{currentHasRemote && (
				<Notification
					header='Encounter Data Loaded!'
					content={renderUpdateMessage()}
					icon='database'
					color='blue'
					onClick={() => setCollapsed(false)}
				/>
			)}
			{(!collapsed || !currentHasRemote) && renderInputForm()}
		</React.Fragment>
	);

	function renderImportMessage(): JSX.Element {
		return (
			<p>
				The Encounter Helper requires additional data that is not present in your player data. You can access and import the required data by following the instructions below.
			</p>
		);
	}

	function renderUpdateMessage(): JSX.Element {
		return (
			<p>
				{collapsed && <>View your best crew for this encounter below or tap here to update your encounter data.</>}
				{!collapsed && <>Follow the instructions below to update your encounter data.</>}
			</p>
		);
	}

	function renderInputForm(): JSX.Element {
		const DATALINK: string = 'https://app.startrektimelines.com/voyage/refresh';
		return (
			<JsonInputForm
				requestDismiss={currentHasRemote ? () => setCollapsed(!collapsed) : undefined}
				config={{
					postValues: {
						'voyage_status_id': voyage.id,
						'new_only': true,
						'client_api': 25
					},
					pasteInMobile: true,
					dataUrl: DATALINK,
					dataName: 'voyage data',
					jsonHint: '[{"action":"update","character":',
					androidFileHint: 'refresh_customization.json',
					iOSFileHint: 'status?id'
				}}
				validateInput={validateJson}
				setValidInput={(json) => {
					setData(json);
					setCollapsed(true);
				}}
			/>
		);
	}

	function validateJson(json: VoyageRefreshData[]): true | string {
		if (!json) return ('No data');

		let encounter: IEncounter | undefined;

		try {
			encounter = getEncounterFromJson(json);
		}
		catch (e) {	/* The imported data is not valid. Please confirm the voyage data link is correct and try again. */
			console.log(e);
			return 'The imported data is not valid. Please confirm the voyage data link is correct and try again.';
		}

		if (!encounter) {
			/* No encounter data found. Please try again when your voyage has reached an encounter. */
			return 'No encounter data found. Please try again when your voyage has reached an encounter.';
		}

		return true;
	}
};

// Convert VoyageRefreshData to IEncounter
export function getEncounterFromJson(voyageRefresh: VoyageRefreshData[]): IEncounter | undefined {
	let encounter: IEncounter | undefined;
	voyageRefresh.forEach(refresh => {
		refresh.character?.voyage.forEach(voyage => {
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
	return encounter;
}
