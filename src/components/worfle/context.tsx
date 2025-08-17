import React from 'react';

import { IRosterCrew, ITraitMap, IVariantMap } from './model';

export interface IWorfleContext {
	roster: IRosterCrew[];
	variantMap: IVariantMap;
	traitMap: ITraitMap;
};

export const WorfleContext = React.createContext<IWorfleContext>({} as IWorfleContext);
