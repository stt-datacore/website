import React from 'react';

import { IKeystone, IPolestarTailors, IRosterCrew, CrewFilterField } from './model';
import { MarketAggregation } from '../../model/celestial';
import { TranslateMethod } from '../../model/player';
import { KeystoneBase } from '../../model/game-elements';

export interface IRetrievalContext {
	allKeystones: IKeystone[];	// All keystones (i.e. constellations AND polestars) with quantity owned and polestar odds
	autoWishes: string[];
	market: MarketAggregation
	rosterCrew: IRosterCrew[];
	setRosterCrew: (rosterCrew: IRosterCrew[]) => void;
	polestarTailors: IPolestarTailors;
	setPolestarTailors: (polestarTailors: IPolestarTailors) => void;
	getCrewFilter: (field: CrewFilterField) => any;
	setCrewFilter: (field: CrewFilterField, value: any) => void;
	resetForm: () => void;
	wishlist: string[];
	setWishlist: (wishlist: string[]) => void;
	reloadMarket: () => void;
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

export function printCredits(quantity: number, t?: TranslateMethod, printCredits?: boolean) {
	const img = `${process.env.GATSBY_ASSETS_URL}atlas/soft_currency_icon.png`;

	return <div
		title={t ? t('global.item_types.credits') : ''}
		style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
		<img src={img} style={{height: '1.5em'}} />
		<span>{quantity.toLocaleString()} {t && printCredits ? t('global.item_types.credits') : ''}</span>
	</div>
}

export function printChrons(quantity: number, t?: TranslateMethod, printChrons?: boolean) {
	const img = `${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`;

	return <div
		title={t ? t('global.item_types.chronitons') : ''}
		style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
		<img src={img} style={{height: '1.5em'}} />
		<span>{quantity.toLocaleString()} {t && printChrons ? t('global.item_types.chronitons') : ''}</span>
	</div>
}


export function printQuantum(quantity: number, t?: TranslateMethod, printQuantum?: boolean) {
	const img = `${process.env.GATSBY_ASSETS_URL}atlas/crew_crafting_energy_detailed_icon.png`;

	return <div
		title={t ? t('global.item_types.quantum') : ''}
		style={{display: 'flex', alignItems: 'center', gap: '0.5em'}}>
		<img src={img} style={{height: '1.5em'}} />
		<span>{quantity.toLocaleString()} {t && printQuantum ? t('global.item_types.quantum') : ''}</span>
	</div>
}


export function getComboCost(combo: string[], allKeystones: IKeystone[], market: MarketAggregation, unowned_only = true) {
	let ps = combo.map(cb => allKeystones.find(f => f.symbol === cb || f.symbol === cb + "_keystone")).filter(f => !!f);
	let total = ps.map(cb => cb.owned && unowned_only ? 0 : (market[cb.id]?.low ?? 0)).reduce((p, n) => p + n, 0);
	let sell_count = ps.map(cb => cb.owned && unowned_only ? 0 : (market[cb.id]?.sell_count ?? 0)).reduce((p, n) => p + n, 0);
	return { total, sell_count };
}

export function sortCombosByCost(combos: string[][], allKeystones: IKeystone[], market: MarketAggregation, unowned_only = true, direction: 'ascending' | 'descending' = 'ascending', fallBack?: (a: string[], b: string[]) => number) {
	let pricemap = [] as { total: number, sell_count: number, combo: string[] }[];
	let mul = direction === 'ascending' ? 1 : -1;
	combos.forEach((combo) => {
		pricemap.push({ ... getComboCost(combo, allKeystones, market, unowned_only), combo });
	});
	pricemap.sort((a, b) => {
		let r = (a.total - b.total) * mul;
		if (r === 0 && fallBack) r = fallBack(a.combo, b.combo);
		return r;
	});
	combos.sort((a, b) => pricemap.findIndex(ap => ap.combo === a) - pricemap.findIndex(bp => bp.combo === b));
}

export function sortCombosBySellCount(combos: string[][], allKeystones: IKeystone[], market: MarketAggregation, unowned_only = true, direction: 'ascending' | 'descending' = 'ascending', fallBack?: (a: string[], b: string[]) => number) {
	let pricemap = [] as { total: number, sell_count: number, combo: string[] }[];
	let mul = direction === 'ascending' ? 1 : -1;
	combos.forEach((combo) => {
		pricemap.push({ ... getComboCost(combo, allKeystones, market, unowned_only), combo });
	});
	pricemap.sort((a, b) => {
		let r = (a.sell_count - b.sell_count) * mul;
		if (r === 0 && fallBack) r = fallBack(a.combo, b.combo);
		return r;
	});
	combos.sort((a, b) => pricemap.findIndex(ap => ap.combo === a) - pricemap.findIndex(bp => bp.combo === b));
}


export const RetrievalContext = React.createContext<IRetrievalContext>({} as IRetrievalContext);
