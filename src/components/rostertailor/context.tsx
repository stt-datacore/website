import React from 'react';

import { IEventData } from '../../model/events';
import { PlayerCrew } from '../../model/player';

export interface ITailorContext {
	rosterType: string;
	rosterCrew: PlayerCrew[];
	events: IEventData[];
	excludedCrewIds: Set<number>;
	setExcludedCrewIds: (crewIds: Set<number>) => void;
};

const defaultContext = {

} as ITailorContext;

export const TailorContext = React.createContext<ITailorContext>(defaultContext);
