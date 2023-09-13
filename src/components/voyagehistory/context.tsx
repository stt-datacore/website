import React from 'react';

import { IVoyageHistory } from '../../model/voyage';

export interface IHistoryContext {
	history: IVoyageHistory;
	setHistory: (history: IVoyageHistory) => void;
};

export const HistoryContext = React.createContext<IHistoryContext>({} as IHistoryContext);