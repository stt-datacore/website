import { BaseSkills } from '../../../model/crew';
import { PlayerCrew } from '../../../model/player';
import { Ship } from '../../../model/ship';
import { Estimate, IVoyageInputConfig } from '../../../model/voyage';
import { UnifiedWorker } from '../../../typings/worker';
import { calcVoyageVP } from '../../../utils/voyagevp';
import { getCrewTraitBonus, getCrewEventBonus, getShipTraitBonus } from '../utils';
import { IProspectiveConfig, IProspectiveCrewSlot } from './model';

export function getProspectiveConfig(voyageConfig: IVoyageInputConfig, ship: Ship | undefined, crewSlots: IProspectiveCrewSlot[]): IProspectiveConfig {
	const skillAggregates: BaseSkills = {
		command_skill: { skill: 'command_skill', core: 0, range_min: 0, range_max: 0 },
		diplomacy_skill: { skill: 'diplomacy_skill', core: 0, range_min: 0, range_max: 0 },
		security_skill: { skill: 'security_skill', core: 0, range_min: 0, range_max: 0 },
		engineering_skill: { skill: 'engineering_skill', core: 0, range_min: 0, range_max: 0 },
		science_skill: { skill: 'science_skill', core: 0, range_min: 0, range_max: 0 },
		medicine_skill: { skill: 'medicine_skill', core: 0, range_min: 0, range_max: 0 }
	};
	let crewBonus: number = 0;
	crewSlots.forEach(crewSlot => {
		let crew: PlayerCrew | undefined = crewSlot.crew;
		if (crew) {
			Object.keys(crew.skills).forEach(skill => {
				skillAggregates[skill].core += crew.skills[skill].core;
				skillAggregates[skill].range_min += crew.skills[skill].range_min;
				skillAggregates[skill].range_max += crew.skills[skill].range_max;
			});
			crewBonus += getCrewTraitBonus(voyageConfig, crew, crewSlot.trait);
		}
	});
	const shipBonus: number = ship ? getShipTraitBonus(voyageConfig, ship) : 0;
	return {
		...voyageConfig,
		max_hp: (ship?.antimatter ?? 0) + shipBonus + crewBonus,
		crew_slots: crewSlots,
		skill_aggregates: skillAggregates
	};
}

export function promiseEstimateFromConfig(voyageConfig: IProspectiveConfig, resolve: (estimate: Estimate) => void): void {
	const config = {
		startAm: voyageConfig.max_hp,
		ps: voyageConfig.skill_aggregates[voyageConfig.skills['primary_skill']],
		ss: voyageConfig.skill_aggregates[voyageConfig.skills['secondary_skill']],
		others: Object.values(voyageConfig.skill_aggregates).filter(s => !Object.values(voyageConfig.skills).includes(s.skill)),
		numSims: 5000
	};
	const VoyageEstConfig = {
		config,
		worker: 'voyageEstimate'
	};
	const worker = new UnifiedWorker();
	worker.addEventListener('message', message => {
		if (!message.data.inProgress) {
			const estimate: Estimate = message.data.result;
			if (voyageConfig.voyage_type === 'encounter') {
				const seconds: number = estimate.refills[0].result*60*60;
				const bonuses: number[] = [];
				voyageConfig.crew_slots.forEach(cs => {
					if (cs.crew) bonuses.push(getCrewEventBonus(voyageConfig, cs.crew));
				});
				estimate.vpDetails = calcVoyageVP(seconds, bonuses);
			}
			resolve(estimate);
		}
	});
	worker.postMessage(VoyageEstConfig);
}
