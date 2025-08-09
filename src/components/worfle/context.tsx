import React from 'react';

import { IRosterCrew } from './model';

export interface IWorfleContext {
	roster: IRosterCrew[];
};

export const WorfleContext = React.createContext<IWorfleContext>({} as IWorfleContext);
