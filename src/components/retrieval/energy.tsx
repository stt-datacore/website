import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { TranslateMethod } from '../../model/player';

export const RetrievalEnergy = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
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

	let energyMessage = t('retrieval.energy.guaranteed_legendary');
	if (energy.quantity < qTarget) {
		const regenerationTime = getSecondsRemaining(qTarget, energy.quantity);
		energyMessage = t('retrieval.energy.quantum_regeneration', {
			target: `${qTarget}`,
			time: formatTime(regenerationTime, t)
		});
		let daysCanBoost = 0, qTotal = energy.quantity;
		while (qTotal < qTarget) {
			daysCanBoost++;
			qTotal += qPerBoost+qPerFullDay;
		}
		const timeBoosted = getSecondsRemaining(qTarget, energy.quantity+(daysCanBoost*qPerBoost));

		if (timeBoosted <= 0) {
			energyMessage += t('retrieval.energy.spend_90_immediately', {
				target: `${qTarget}`
			});
		}
		else if (daysCanBoost > 1) {
			energyMessage += t('retrieval.energy.spend_90_daily', {
				target: `${qTarget}`,
				time: formatTime(timeBoosted, t)
			});
		}
		else {
			energyMessage += t('retrieval.energy.spend_90', {
				target: `${qTarget}`,
				time: formatTime(timeBoosted, t)
			});
		}
	}

	return (
		<p>{t('global.item_types.quantum')}: <strong>{energy.quantity}</strong>. {energyMessage}</p>
	);

	function getSecondsRemaining(target: number, quantity: number): number {
		return ((target-quantity)*(energy.regeneration?.seconds ?? defaultSeconds))+energy.regenerated_at;
	}

	function formatTime(seconds: number, t?: TranslateMethod): string {
		let d = Math.floor(seconds/(3600*24)),
			h = Math.floor(seconds%(3600*24)/3600),
			m = Math.floor(seconds%3600/60);

		if (t) {
			if (d === 0) return `${t('duration.n_h', { hours: `${h}` })} ${t('duration.n_m', { minutes: `${m}` })}`;
			return `${t('duration.n_d', { days: `${d}` })} ${t('duration.n_h', { hours: `${h}` })} ${t('duration.n_m', { minutes: `${m}` })}`
		}
		else {
			if (d == 0) return `${h}h ${m}m`;
			return `${d}d ${h}h ${m}m`;
		}
	}
};
