import React from 'react';

import { IEventData } from '../../model/events';
import { Ship } from '../../model/ship';
import { IVoyageCrew, IVoyageInputConfig } from '../../model/voyage';

export interface ICalculatorContext {
	configSource: 'player' | 'custom';
	voyageConfig: IVoyageInputConfig;
	rosterType: 'allCrew' | 'myCrew';
	crew: IVoyageCrew[];
	ships: Ship[];
	events: IEventData[];
};

export const CalculatorContext = React.createContext<ICalculatorContext>({} as ICalculatorContext);