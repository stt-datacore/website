import React from 'react';

import { IVoyageHistory } from '../../model/voyage';
import { InitState, SyncState } from './utils';

export interface IHistoryContext {
	dbid: string;
	history: IVoyageHistory;
	setHistory: (history: IVoyageHistory) => void;
	syncState: SyncState;
	messageId: string;
	setMessageId: (messageId: string) => void;
	historyInitState: InitState;
	setHistoryInitState: (initState: InitState) => void;
};

export const HistoryContext = React.createContext<IHistoryContext>({} as IHistoryContext);