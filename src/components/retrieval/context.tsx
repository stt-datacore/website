import React from 'react';

import { IKeystone, IPolestarTailors, IRosterCrew, CrewFilterField } from './model';
import { MarketAggregation } from '../../model/celestial';
import { TranslateMethod } from '../../model/player';

export interface IRetrievalContext {
	allKeystones: IKeystone[];	// All keystones (i.e. constellations AND polestars) with quantity owned and polestar odds
	market?: MarketAggregation
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

export function printISM(quantity: number, t?: TranslateMethod, printISM?: boolean) {
	const img = `${process.env.GATSBY_ASSETS_URL}atlas/managed_game_coin_detailed_icon.png`;

	return <div
		title={t ? t('global.item_types.interstellar_medium') : ''}
		style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
		<img src={img} style={{height: '1.5em'}} />
		<span>{quantity.toLocaleString()} {t && printISM ? t('global.item_types.ism') : ''}</span>
	</div>
}

export const RetrievalContext = React.createContext<IRetrievalContext>({} as IRetrievalContext);
