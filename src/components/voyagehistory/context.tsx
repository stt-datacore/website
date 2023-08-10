import React from 'react';

import { IHistoryContext } from './model';

export const HistoryContext = React.createContext<IHistoryContext>({} as IHistoryContext);