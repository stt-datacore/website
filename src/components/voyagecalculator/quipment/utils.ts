import { QuippedPower } from '../../../model/crew';
import { PlayerCrew } from '../../../model/player';
import { IVoyageInputConfig } from '../../../model/voyage';
import { oneCrewCopy, qbitsToSlots } from '../../../utils/crewutils';
import { calcQLots } from '../../../utils/equipment';
import { ItemWithBonus } from '../../../utils/itemutils';
import { BuffStatTable } from '../../../utils/voyageutils';
import { QuipmentProspectConfig } from './options';

interface IQPParams {
	voyageConfig: IVoyageInputConfig;
	qpConfig: QuipmentProspectConfig;
};

export function applyQuipmentProspect(c: PlayerCrew, quipment: ItemWithBonus[], buffConfig: BuffStatTable | undefined, params: IQPParams) {
	const { voyageConfig, qpConfig } = params;

	if (qpConfig.enabled && c.immortal === -1 && c.q_bits >= 100) {
		if (qpConfig.current && c.kwipment.some(q => typeof q === 'number' ? q : q[1])) {
			return c;
		}
		let newcopy = oneCrewCopy(c);
		let oldorder = newcopy.skill_order;
		let order = [...oldorder];
		let nslots = qbitsToSlots(newcopy.q_bits);

		if (qpConfig.voyage !== 'none') {
			order.sort((a, b) => {
				if (['voyage', 'voyage_1'].includes(qpConfig.voyage)) {
					if (voyageConfig.skills.primary_skill === a) return -1;
					if (voyageConfig.skills.primary_skill === b) return 1;
				}
				if (['voyage', 'voyage_2'].includes(qpConfig.voyage)) {
					if (voyageConfig.skills.secondary_skill === a) return -1;
					if (voyageConfig.skills.secondary_skill === b) return 1;
				}
				return oldorder.indexOf(a) - oldorder.indexOf(b);
			});
		}

		newcopy.skill_order = order;

		if (qpConfig.slots && qpConfig.slots < nslots) nslots = qpConfig.slots;

		calcQLots(newcopy, quipment, buffConfig, false, nslots, qpConfig.calc);

		newcopy.skill_order = oldorder;

		let useQuipment: QuippedPower | undefined = undefined;
		if (qpConfig.mode === 'all') {
			useQuipment = newcopy.best_quipment_3!;
		}
		else if (qpConfig.mode === 'best') {
			useQuipment = newcopy.best_quipment!;
		}
		else if (qpConfig.mode === 'best_2') {
			useQuipment = newcopy.best_quipment_1_2!;
		}
		if (!useQuipment) return c;


		if (qpConfig.mode === 'best') {
			newcopy.kwipment = Object.values(useQuipment.skill_quipment[order[0]]).map(q => Number(q.kwipment_id));
			let skill = useQuipment.skills_hash[order[0]];
			newcopy[skill.skill] = {
				core: skill.core,
				min: skill.range_min,
				max: skill.range_max
			}
			newcopy.skills[skill.skill] = {
				...skill
			}
		}
		else {
			newcopy.kwipment = Object.entries(useQuipment.skill_quipment).map(([skill, quip]) => quip.map(q => Number(q.kwipment_id))).flat();
			Object.entries(useQuipment.skills_hash).forEach(([key, skill]) => {
				newcopy[key] = {
					core: skill.core,
					min: skill.range_min,
					max: skill.range_max
				}
				newcopy.skills[key] = {
					...skill
				}
			});
		}


		while (newcopy.kwipment.length < 4) newcopy.kwipment.push(0);
		newcopy.kwipment_expiration = [0, 0, 0, 0];
		newcopy.kwipment_prospects = true;
		return newcopy;
	}
	else {
		return c;
	}
}
