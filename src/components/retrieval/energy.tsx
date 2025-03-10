import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { TranslateMethod } from '../../model/player';
import { printQuantum } from './context';
import { OptionsPanelFlexRow } from '../stats/utils';

export const RetrievalEnergy = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData } = globalContext.player;

	if (!playerData) return <></>;

	const defaultSeconds = 1800;
	interface CraftingEnergy {
		id: number;
		quantity: number;
		regenerated_at: number;
		regeneration?: {
			increment: number;
			seconds: number;
			amount: number;
		};
		coupons: number;
	};
	const energy: CraftingEnergy = playerData.crew_crafting_root!.energy as CraftingEnergy;

	const qTarget = 900;
	const qPerFullDay = (24*60*60)/(energy.regeneration?.seconds ?? defaultSeconds); // 48
	const qPerBoost = 50;
	let energyMessage = [] as JSX.Element[];
	energyMessage.push(tfmt('retrieval.energy.guaranteed_legendary'));
	if (energy.quantity < qTarget) {
		const regenerationTime = getSecondsRemaining(qTarget, energy.quantity);
		energyMessage[0] = tfmt('retrieval.energy.quantum_regeneration', {
			target: printQuantum(qTarget),
			time: formatTime(regenerationTime, t, true)
		});
		let daysCanBoost = 0, qTotal = energy.quantity;
		while (qTotal < qTarget) {
			daysCanBoost++;
			qTotal += qPerBoost+qPerFullDay;
		}
		const timeBoosted = getSecondsRemaining(qTarget, energy.quantity+(daysCanBoost*qPerBoost));

		if (timeBoosted <= 0) {
			energyMessage.push(tfmt('retrieval.energy.spend_90_immediately', {
				target: printQuantum(qTarget)
			}));
		}
		else if (daysCanBoost > 1) {
			energyMessage.push(tfmt('retrieval.energy.spend_90_daily', {
				target: printQuantum(qTarget),
				time: formatTime(timeBoosted, t, true)
			}));
		}
		else {
			energyMessage.push(tfmt('retrieval.energy.spend_90', {
				target: printQuantum(qTarget),
				time: formatTime(timeBoosted, t, true)
			}));
		}
	}
	const flexRow = OptionsPanelFlexRow;
	return (
		<div style={{...flexRow, flexWrap: 'wrap', justifyContent: 'flex-start', gap: '0.25em'}}><div style={{...flexRow, flexWrap: 'nowrap', justifyContent: 'flex-start', gap: '0em'}}>{t('global.item_types.quantum')}:&nbsp;<strong>{printQuantum(energy.quantity)}</strong>.&nbsp;</div> {energyMessage}</div>
	);

	function getSecondsRemaining(target: number, quantity: number): number {
		return ((target-quantity)*(energy.regeneration?.seconds ?? defaultSeconds))+energy.regenerated_at;
	}

	function formatTime(seconds: number, t?: TranslateMethod, compact?: boolean): string {
		let d = Math.floor(seconds/(3600*24)),
			h = Math.floor(seconds%(3600*24)/3600),
			m = Math.floor(seconds%3600/60);
		const cpt = compact ? '_compact' : '';
		if (t) {
			if (d === 0) return `${t(`duration.n_h${cpt}`, { hours: `${h}` })} ${t(`duration.n_m${cpt}`, { minutes: `${m}` })}`;
			return `${t(`duration.n_d${cpt}`, { days: `${d}` })} ${t(`duration.n_h${cpt}`, { hours: `${h}` })} ${t(`duration.n_m${cpt}`, { minutes: `${m}` })}`
		}
		else {
			if (d == 0) return `${h}h ${m}m`;
			return `${d}d ${h}h ${m}m`;
		}
	}
};
