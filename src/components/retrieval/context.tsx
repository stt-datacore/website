import React from 'react';

import { IKeystone, IPolestarTailors, IRosterCrew, CrewFilterField } from './model';

export interface IRetrievalContext {
	allKeystones: IKeystone[];	// All keystones (i.e. constellations AND polestars) with quantity owned and polestar odds
	rosterCrew: IRosterCrew[];
	setRosterCrew: (rosterCrew: IRosterCrew[]) => void;
	polestarTailors: IPolestarTailors;
	setPolestarTailors: (polestarTailors: IPolestarTailors) => void;
	getCrewFilter: (field: CrewFilterField) => any;
	setCrewFilter: (field: CrewFilterField, value: any) => void;
	resetForm: () => void;
	wishlist: string[];
	setWishlist: (wishlist: string[]) => void;
};

export const RetrievalContext = React.createContext<IRetrievalContext>({} as IRetrievalContext);
