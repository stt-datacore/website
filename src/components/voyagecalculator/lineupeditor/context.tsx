import React from 'react';

import { Estimate, IVoyageCrew } from '../../../model/voyage';
import { IProspectiveConfig, IProspectiveCrewSlot } from './model';

export interface ISpotReplacement {
	crew: IVoyageCrew,
	seat: string
}

export interface IEditorContext {
	id: string;
	prospectiveConfig: IProspectiveConfig;
	prospectiveEstimate: Estimate | undefined;
	sortedSkills: string[];
	replacement?: ISpotReplacement;
	setReplacement: (value?: ISpotReplacement) => void,
	getConfigFromCrewSlots: (crewSlots: IProspectiveCrewSlot[]) => IProspectiveConfig;
	getRuntimeDiff: (altRuntime: number) => number;
	editLineup: () => void;
	renderActions: () => JSX.Element;
	dismissEditor: () => void;
};

export const EditorContext = React.createContext<IEditorContext>({} as IEditorContext);
