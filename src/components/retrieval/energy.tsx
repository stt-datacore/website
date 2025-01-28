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

	let energyMessage = 'You can guarantee a legendary crew retrieval now!';
	if (energy.quantity < qTarget) {
		const regenerationTime = getSecondsRemaining(qTarget, energy.quantity);
		energyMessage = `You will regenerate enough quantum to reach ${qTarget} in ${formatTime(regenerationTime, t)};`;
		let daysCanBoost = 0, qTotal = energy.quantity;
		while (qTotal < qTarget) {
			daysCanBoost++;
			qTotal += qPerBoost+qPerFullDay;
		}
		const timeBoosted = getSecondsRemaining(qTarget, energy.quantity+(daysCanBoost*qPerBoost));
		energyMessage += ` spend 90 dilithium ${daysCanBoost > 1 ? 'daily' : ''} to reach ${qTarget}`
			+ ` ${timeBoosted <= 0 ? 'immediately' : `in ${formatTime(timeBoosted, t)}`}.`;
	}

	return (
		<p>Quantum: <strong>{energy.quantity}</strong>. {energyMessage}</p>
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
