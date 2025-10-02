import React from 'react';
import {
	Button,
	Dimmer,
	Loader
} from 'semantic-ui-react';

import { Ship } from '../../../model/ship';
import { Estimate, IVoyageCalcConfig, IVoyageCrew } from '../../../model/voyage';
import { GlobalContext } from '../../../context/globalcontext';

import CONFIG from '../../CONFIG';

import { CalculatorContext } from '../context';

import { IControlVoyage, IProspectiveConfig, IProspectiveCrewSlot } from './model';
import { EditorContext, IEditorContext } from './context';
import { AlternateCrewPicker } from './crewpicker';
import { AlternateSlotPicker } from './slotpicker';
import { ProspectiveSummary } from './summary';
import { getProspectiveConfig, promiseEstimateFromConfig } from './utils';

type LineupEditorViews = 'crewpicker' | 'slotpicker' | 'summary';

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
	const { t } = globalContext.localized;

	const { voyageConfig } = React.useContext(CalculatorContext);
	const { trigger, cancelTrigger, ship, roster, control, commitVoyage } = props;

	const [prospectiveCrewSlots, setProspectiveCrewSlots] = React.useState<IProspectiveCrewSlot[] | undefined>(control?.config.crew_slots);
	const [prospectiveEstimate, setProspectiveEstimate] = React.useState<Estimate | undefined>(control?.estimate);

	const [activeView, setActiveView] = React.useState<LineupEditorViews | undefined>(undefined);

	const [slotTarget, setSlotTarget] = React.useState<IProspectiveCrewSlot | undefined>(undefined);
	const [alternateCrew, setAlternateCrew] = React.useState<IVoyageCrew | undefined>(undefined);

	React.useEffect(() => {
		setActiveView(trigger?.view);
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
		getConfigFromCrewSlots,
		getRuntimeDiff,
		seekAlternateCrew,
		renderActions,
		dismissEditor
	};

	return (
		<EditorContext.Provider value={editorContext}>
			<React.Fragment>
				{activeView === 'crewpicker' && (
					<AlternateCrewPicker
						roster={roster}
						targeting={slotTarget ? { slot: slotTarget, cancel: () => setSlotTarget(undefined) } : undefined}
						setAlternate={seekSlotForAlternate}
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
						roster={roster}
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

	function renderActions(): React.JSX.Element {
		return (
			<React.Fragment>
				{activeView !== 'summary' && (
					<Button	/* View prospective voyage */
						title={t('voyage.editor.view_voyage')}
						icon='vcard'
						onClick={() => {
							setSlotTarget(undefined);
							setAlternateCrew(undefined);
							setActiveView('summary');
						}}
					/>
				)}
				{activeView !== 'crewpicker' && (
					<Button	/* Search for alternate crew */
						title={t('voyage.editor.search_for_alternates')}
						icon='search'
						onClick={() => {
							setSlotTarget(undefined);
							setAlternateCrew(undefined);
							setActiveView('crewpicker');
						}}
					/>
				)}
				<Button	/* Close */
					content={t('global.close')}
					onClick={dismissEditor}
				/>
			</React.Fragment>
		);
	}

	function dismissEditor(): void {
		setActiveView(undefined);
		setSlotTarget(undefined);
		setAlternateCrew(undefined);
		cancelTrigger();
	}

	function seekAlternateCrew(crewSlot?: IProspectiveCrewSlot): void {
		setSlotTarget(crewSlot);
		setActiveView('crewpicker');
	}

	function seekSlotForAlternate(alternateCrew: IVoyageCrew): void {
		if (slotTarget) {
			const altCrewSlots: IProspectiveCrewSlot[] = structuredClone(prospectiveCrewSlots) as IProspectiveCrewSlot[];
			// Unseat alternate crew from current seat first, if already seated
			const currentSlot: IProspectiveCrewSlot | undefined = altCrewSlots.find(cs => cs.crew?.id === alternateCrew.id);
			if (currentSlot) currentSlot.crew = undefined;
			const altCrewSlot: IProspectiveCrewSlot | undefined = altCrewSlots.find(cs => cs.symbol === slotTarget.symbol);
			if (altCrewSlot) altCrewSlot.crew = alternateCrew;
			const altConfig: IProspectiveConfig = getConfigFromCrewSlots(altCrewSlots);
			promiseEstimateFromConfig(
				altConfig,
				(estimate: Estimate) => {
					updateProspectiveVoyage(altConfig, estimate);
				}
			);
			setActiveView(undefined);
		}
		else {
			setAlternateCrew(alternateCrew);
			setActiveView('slotpicker');
		}
	}

	function updateProspectiveVoyage(config: IProspectiveConfig, estimate: Estimate): void {
		setProspectiveCrewSlots(config.crew_slots);
		setProspectiveEstimate(estimate);
		setSlotTarget(undefined);
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
