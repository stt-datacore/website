import React from 'react';
import {
	Button,
	Checkbox,
	Dimmer,
	Loader
} from 'semantic-ui-react';

import { PlayerCrew } from '../../../model/player';
import { Ship } from '../../../model/ship';
import { Estimate, IVoyageCalcConfig, IVoyageCrew } from '../../../model/voyage';

import CONFIG from '../../CONFIG';

import { CalculatorContext } from '../context';

import { IControlVoyage, IProspectiveConfig, IProspectiveCrewSlot } from './model';
import { EditorContext, IEditorContext, ISpotReplacement, LineupEditorViews } from './context';
import { AlternateCrewPicker } from './crewpicker';
import { AlternateSlotPicker } from './slotpicker';
import { ProspectiveSummary } from './summary';
import { getProspectiveConfig } from './utils';
import { useStateWithStorage } from '../../../utils/storage';
import { GlobalContext } from '../../../context/globalcontext';

export interface ILineupEditorTrigger {
	view: LineupEditorViews;
};

type LineupEditorProps = {
	id: string;
	trigger: ILineupEditorTrigger | undefined;
	cancelTrigger: () => void;
	ship?: Ship;
	roster: IVoyageCrew[];
	control?: IControlVoyage;
	commitVoyage: (config: IVoyageCalcConfig, estimate: Estimate) => void;
};

export const LineupEditor = (props: LineupEditorProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { t } = globalContext.localized;

	const dbidPrefix = (() => {
		if (playerData) {
			return playerData.player.dbid.toString() + "/";
		}
		return '/';
	})();

	const { voyageConfig } = React.useContext(CalculatorContext);
	const { trigger, cancelTrigger, ship, roster, control, commitVoyage } = props;

	const [prospectiveCrewSlots, setProspectiveCrewSlots] = React.useState<IProspectiveCrewSlot[] | undefined>(control?.config.crew_slots);
	const [prospectiveEstimate, setProspectiveEstimate] = React.useState<Estimate | undefined>(control?.estimate);

	const [activeView, setActiveView] = React.useState<LineupEditorViews | undefined>(undefined);
	const [defaultView, setDefaultView] = useStateWithStorage<LineupEditorViews | undefined>(`${dbidPrefix}/default_voyage_editor_view`, undefined, { rememberForever: !!dbidPrefix });

	const [replacement, setReplacement] = React.useState<ISpotReplacement | undefined>(undefined);
	const [alternateCrew, setAlternateCrew] = React.useState<PlayerCrew | undefined>(undefined);

	React.useEffect(() => {
		setReplacement(undefined);
		setActiveView(defaultView || trigger?.view);
	}, [trigger]);

	const prospectiveConfig = React.useMemo<IProspectiveConfig>(() => {
		if (prospectiveCrewSlots)
			return getConfigFromCrewSlots(prospectiveCrewSlots);

		const crewSlots: IProspectiveCrewSlot[] = [];
		voyageConfig.crew_slots.forEach(cs => {
			crewSlots.push({...cs, crew: undefined});
		});
		return getConfigFromCrewSlots(crewSlots);
	}, [voyageConfig, prospectiveCrewSlots]);

	const sortedSkills = React.useMemo<string[]>(() => {
		const sortedSkills: string[] = [
			voyageConfig.skills.primary_skill,
			voyageConfig.skills.secondary_skill
		];
		Object.keys(CONFIG.SKILLS).filter(skill =>
			skill !== voyageConfig.skills.primary_skill
				&& skill !== voyageConfig.skills.secondary_skill
		).forEach(otherSkill => {
			sortedSkills.push(otherSkill);
		});
		return sortedSkills;
	}, [voyageConfig]);

	if (!trigger) return <></>;

	const editorContext: IEditorContext = {
		id: props.id,
		prospectiveConfig,
		prospectiveEstimate,
		sortedSkills,
		replacement,
		defaultView,
		setReplacement,
		getConfigFromCrewSlots,
		getRuntimeDiff,
		editLineup: () => setActiveView('crewpicker'),
		renderActions,
		dismissEditor,
		setDefaultView
	};

	return (
		<EditorContext.Provider value={editorContext}>
			<React.Fragment>
				{activeView === 'crewpicker' && (
					<AlternateCrewPicker
						roster={roster}
						setAlternate={seekSeatForAlternate}
					/>
				)}
				{activeView === 'slotpicker' && alternateCrew && (
					<AlternateSlotPicker
						alternateCrew={alternateCrew}
						setAlternateVoyage={updateProspectiveVoyage}
					/>
				)}
				{activeView === 'summary' && (
					<ProspectiveSummary
						control={control}
						saveVoyage={saveVoyage}
						resetVoyage={resetVoyage}
					/>
				)}
				{!activeView && (
					<Dimmer active page>
						<Loader indeterminate />
					</Dimmer>
				)}
			</React.Fragment>
		</EditorContext.Provider>
	);

	function getConfigFromCrewSlots(crewSlots: IProspectiveCrewSlot[]): IProspectiveConfig {
		return getProspectiveConfig(voyageConfig, ship, crewSlots);
	}

	function getRuntimeDiff(altRuntime: number): number {
		if (!prospectiveEstimate) return 0;
		return altRuntime - prospectiveEstimate.refills[0].result;
	}

	function renderActions(): JSX.Element {
		return (
			<React.Fragment>
				<Checkbox
					style={{margin: "0 1em"}}
					checked={defaultView === activeView}
					onChange={(e, { checked }) => {
						if (checked) {
							setDefaultView(activeView);
						}
						else {
							setDefaultView(undefined);
						}
					}}
					label={t('global.set_as_default_view')}
					/>
				{activeView !== 'summary' && (
					<Button	/* View prospective voyage */
						title='View prospective voyage'
						icon='vcard'
						onClick={() => {
							setAlternateCrew(undefined);
							setActiveView('summary');
						}}
					/>
				)}
				{activeView !== 'crewpicker' && (
					<Button	/* Search for alternate crew */
						title='Search for alternate crew'
						icon='search'
						onClick={() => {
							setAlternateCrew(undefined);
							setActiveView('crewpicker');
						}}
					/>
				)}
				<Button	/* Close */
					content='Close'
					onClick={dismissEditor}
				/>
			</React.Fragment>
		);
	}

	function dismissEditor(): void {
		setActiveView(undefined);
		setAlternateCrew(undefined);
		cancelTrigger();
	}

	function seekSeatForAlternate(alternateCrew: PlayerCrew): void {
		setAlternateCrew(alternateCrew);
		setActiveView('slotpicker');
	}

	function updateProspectiveVoyage(config: IProspectiveConfig, estimate: Estimate): void {
		setProspectiveCrewSlots(config.crew_slots);
		setProspectiveEstimate(estimate);
		setAlternateCrew(undefined);
		setActiveView('summary');
	}

	function saveVoyage(): void {
		if (!prospectiveEstimate) return;
		commitVoyage(prospectiveConfig as IVoyageCalcConfig, prospectiveEstimate);
		resetVoyage();
		dismissEditor();
	}

	function resetVoyage(): void {
		if (!control) return;
		setProspectiveCrewSlots(control.config.crew_slots);
		setProspectiveEstimate(control.estimate);
	}
};
