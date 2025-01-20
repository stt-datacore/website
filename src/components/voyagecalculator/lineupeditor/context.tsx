import React from 'react';

import { Estimate, IVoyageCrew } from '../../../model/voyage';
import { IProspectiveConfig, IProspectiveCrewSlot } from './model';

export type LineupEditorViews = 'crewpicker' | 'slotpicker' | 'summary';

export interface ISpotReplacement {
	crew?: IVoyageCrew,
	seat: string
}

export interface IEditorContext {
	id: string;
	prospectiveConfig: IProspectiveConfig;
	prospectiveEstimate: Estimate | undefined;
	sortedSkills: string[];
	replacement?: ISpotReplacement;
	defaultView?: LineupEditorViews;
	setReplacement: (value?: ISpotReplacement) => void,
	setDefaultView: (value?: LineupEditorViews) => void,
	getConfigFromCrewSlots: (crewSlots: IProspectiveCrewSlot[]) => IProspectiveConfig;
	getRuntimeDiff: (altRuntime: number) => number;
	editLineup: () => void;
	renderActions: () => JSX.Element;
	dismissEditor: () => void;

};

export const EditorContext = React.createContext<IEditorContext>({} as IEditorContext);
