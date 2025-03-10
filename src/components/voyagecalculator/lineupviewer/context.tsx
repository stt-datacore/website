import React from 'react';

import { Voyage } from '../../../model/player';
import { Ship } from '../../../model/ship';
import { IVoyageCalcConfig } from '../../../model/voyage';
import { IShipData, IAssignment } from './model';
import { ILineupEditorTrigger } from '../lineupeditor/lineupeditor';

export interface IViewerContext {
	configSource?: 'player' | 'custom';
	voyageConfig: IVoyageCalcConfig | Voyage;
	rosterType?: 'allCrew' | 'myCrew';
	ship?: Ship;
	shipData: IShipData;
	assignments: IAssignment[];
	highlightedSkills?: string[];
	launchLineupEditor?: (trigger: ILineupEditorTrigger) => void;
};

export const ViewerContext = React.createContext<IViewerContext>({} as IViewerContext);

export interface ILayoutContext {
	layout: string;
	setLayout: (layout: string) => void;
};

export const LayoutContext = React.createContext<ILayoutContext>({} as ILayoutContext);
