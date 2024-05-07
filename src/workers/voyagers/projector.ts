import { IVoyageInputConfig } from '../../model/voyage';

import { IProjection } from './model';
import { VoyagersLineup } from './lineup';

// Use skill check fail points to project runtime (in ticks, i.e. 3 ticks per minute)
export const projectLineup = (voyage: IVoyageInputConfig, shipAntimatter: number, lineup: VoyagersLineup): IProjection => {
	interface IFailpoint {
		skill: string;
		time: number;
	};

	const failpoints: IFailpoint[] = Object.keys(lineup.skills).map(skill => {
		const time: number = ((0.0449*lineup.skills[skill].voyage)+34.399)*60;	// In seconds
		return {
			skill, time
		}
	}).sort((a, b) => a.time - b.time);

	let ticks: number = 0, amBalance: number = shipAntimatter + lineup.antimatter;
	let prevTickTime: number = 0, prevHazardTime: number = 0;
	let prevHazardSuccessRate: number = 1, prevFailPointSkillChance: number = 0;

	while (amBalance > 0 && failpoints.length > 0) {
		const failpoint: IFailpoint | undefined = failpoints.shift();
		if (!failpoint) continue;

		// 1 tick every 20 seconds
		const finalTickTime: number = failpoint.time - (failpoint.time % 20);
		const interimTicks: number = (finalTickTime - prevTickTime) / 20;
		const amLossTicks: number = -1 * interimTicks;

		// 1 hazard every 80 seconds
		const finalHazardTime: number = failpoint.time - (failpoint.time % 80);
		const interimHazards: number = (finalHazardTime - prevHazardTime) / 80;
		const hazardSuccessRate: number = prevHazardSuccessRate - prevFailPointSkillChance;
		const hazardFailureRate: number = 1 - hazardSuccessRate;
		const amGainHazards: number = interimHazards * hazardSuccessRate * 5;
		const amLossHazards: number = interimHazards * hazardFailureRate * -30;

		if (amBalance + amLossTicks + amGainHazards + amLossHazards < 0) {
			let testBalance: number = amBalance;
			let testTicks: number = ticks;
			let testTime: number = prevTickTime;
			while (testBalance > 0) {
				testTicks++;
				testTime += 20;
				testBalance--;
				if (testTime % 80 === 0) {
					testBalance += hazardSuccessRate * 5;
					testBalance += hazardFailureRate * -30;
				}
			}
			ticks = testTicks;
			amBalance = testBalance;
		}
		else {
			ticks += interimTicks;
			amBalance += amLossTicks + amGainHazards + amLossHazards;
		}

		prevTickTime = finalTickTime;
		prevHazardTime = finalHazardTime;
		prevHazardSuccessRate = hazardSuccessRate;
		if (failpoint.skill === voyage.skills.primary_skill)
			prevFailPointSkillChance = 0.35;
		else if (failpoint.skill === voyage.skills.secondary_skill)
			prevFailPointSkillChance = 0.25;
		else
			prevFailPointSkillChance = 0.1;
	}

	return {
		ticks, amBalance
	};
};
