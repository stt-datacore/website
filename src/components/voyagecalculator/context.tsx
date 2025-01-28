import React from 'react';

import { IEventData } from '../../model/events';
import { Ship } from '../../model/ship';
import { IVoyageCrew } from '../../model/voyage';

export interface ICalculatorContext {
	rosterType: 'allCrew' | 'myCrew';
	crew: IVoyageCrew[];
	ships: Ship[];
	events: IEventData[];
	activeVoyageId: number;
	voySymbol: string;
};

export const CalculatorContext = React.createContext<ICalculatorContext>({} as ICalculatorContext);