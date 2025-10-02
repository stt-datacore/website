import React from 'react';

import { Voyage } from '../../../../model/player';
import { EncounterStartingSkills, VoyageRefreshData, VoyageRefreshEncounter } from '../../../../model/voyage';
import { GlobalContext } from '../../../../context/globalcontext';
import { JsonInputForm } from '../../../base/jsoninputform';
import { Notification } from '../../../page/notification';
import { IContest, IContestSkill, IEncounter } from '../model';
import { EncounterCard } from './encountercard';

export interface EncounterImportProps {
	voyage: Voyage;
	data: VoyageRefreshEncounter | undefined;
	setData: (value?: VoyageRefreshData[]) => void;
};

export const EncounterImportComponent = (props: EncounterImportProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { voyage, data, setData } = props;

	const [collapsed, setCollapsed] = React.useState<boolean>(false);

	const showInputForm: boolean = !collapsed || !data;

	return (
		<React.Fragment>
			{!data && (
				<Notification	/* Additional Data Required */
					header={t('voyage.contests.importer.data_required')}
					content={renderImportMessage()}
					icon='database'
					warning
				/>
			)}
			{!!data && (
				<Notification	/* Encounter Data Loaded! */
					header={t('voyage.contests.improter.data_loaded')}
					content={renderUpdateMessage()}
					icon='database'
					color='blue'
					onClick={() => setCollapsed(false)}
				/>
			)}
			{showInputForm && renderInputForm()}
			{!!data && !showInputForm && <EncounterCard encounterData={data} />}
		</React.Fragment>
	);

	function renderImportMessage(): React.JSX.Element {
		return (
			<p>
				{t('voyage.contests.importer.description')}
			</p>
		);
	}

	function renderUpdateMessage(): React.JSX.Element {
		return (
			<p>
				{collapsed && <>{t('voyage.contests.importer.tap_to_open')}</>}
				{!collapsed && <>{t('voyage.contests.importer.follow_instructions')}</>}
			</p>
		);
	}

	function renderInputForm(): React.JSX.Element {
		const DATALINK: string = 'https://app.startrektimelines.com/voyage/refresh';
		return (
			<JsonInputForm
				requestDismiss={!!data ? () => setCollapsed(!collapsed) : undefined}
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

		let encounterData: VoyageRefreshEncounter | undefined;

		try {
			encounterData = getEncounterDataFromJson(json);
		}
		catch (e) {	/* The imported data is not valid. Please confirm the voyage data link is correct and try again. */
			console.log(e);
			return 'The imported data is not valid. Please confirm the voyage data link is correct and try again.';
		}

		if (!encounterData) {
			/* No encounter data found. Please try again when your voyage has reached an encounter. */
			return 'No encounter data found. Please try again when your voyage has reached an encounter.';
		}

		return true;
	}
};

// Extract copy of VoyageRefreshEncounter from VoyageRefreshData
export function getEncounterDataFromJson(voyageRefresh: VoyageRefreshData[]): VoyageRefreshEncounter | undefined {
	let encounterData: VoyageRefreshEncounter | undefined;
	voyageRefresh.forEach(refresh => {
		refresh.character?.voyage.forEach(voyage => {
			if (voyage.encounter) encounterData = structuredClone(voyage.encounter);
		});
	});
	return encounterData;
}

// Serialize IEncounter object from VoyageRefreshEncounter
export function serializeEncounter(encounterData: VoyageRefreshEncounter, critChances: number[]): IEncounter | undefined {
	let encounter: IEncounter | undefined;
	const startingSkills: EncounterStartingSkills = encounterData.skills;
	const incrementProf: number = encounterData.increment_prof;
	const traits: string[] = encounterData.traits;
	const contests: IContest[] = [];
	encounterData.contests_data.forEach((cd, contestIndex) => {
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
		encounter = {
			id: encounterData.id,
			critTraits: traits,
			critChances,
			contests

		};
	});
	return encounter;
}
