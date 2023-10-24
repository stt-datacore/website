import React from 'react';

import { IVoyageHistory } from '../../model/voyage';

export interface IHistoryContext {
	history: IVoyageHistory;
	setHistory: (history: IVoyageHistory) => void;
	activeVoyageId: number;
	dbid?: number;
	telemetryOptIn: boolean;
};

export const HistoryContext = React.createContext<IHistoryContext>({} as IHistoryContext);