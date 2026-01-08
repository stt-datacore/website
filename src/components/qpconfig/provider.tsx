import React from "react";
import { useStateWithStorage } from "../../utils/storage";
import { PlayerCrew } from "../../model/player";
import { CrewMember, QuippedPower } from "../../model/crew";
import { IVoyageCalcConfig, IVoyageInputConfig } from "../../model/voyage";
import { applyCrewBuffs, oneCrewCopy, qbitsToSlots } from "../../utils/crewutils";
import { calcQLots } from "../../utils/equipment";
import { getItemWithBonus, ItemWithBonus } from "../../utils/itemutils";
import { BuffStatTable } from "../../utils/voyageutils";
import { GlobalContext } from "../../context/globalcontext";

export type QuipmentProspectMode = 'best' | 'best_2' | 'all';
export type VoyageSkillPreferenceMode = 'none' | 'voyage' | 'voyage_1' | 'voyage_2';

export interface IQPParams {
	voyageConfig?: IVoyageInputConfig;
	qpConfig: QuipmentProspectConfig;
};

export type QuipmentProspectConfig = {
    pageId: string;
	mode: QuipmentProspectMode;
	enabled: boolean;
	remove: boolean;
    current: boolean;
	voyage: VoyageSkillPreferenceMode;
    slots: number;
    calc: 'all' | 'core' | 'proficiency'
}

export const DefaultQuipmentConfig: QuipmentProspectConfig = {
    pageId: 'voyage',
	mode: 'best',
	voyage: 'voyage',
	current: false,
	enabled: false,
	remove: false,
	slots: 0,
	calc: 'all'
};

export interface IQPConfigContext {
    useQPConfig: () => [QuipmentProspectConfig, (value: QuipmentProspectConfig) => void, (crew: (PlayerCrew | CrewMember), voyageConfig?: IVoyageInputConfig) => (PlayerCrew | CrewMember)]
    //usePrepareRoster: (pageId: string) => ((crew: (PlayerCrew | CrewMember)[]) => (PlayerCrew | CrewMember)[])
}

const DefaultQPContextData: IQPConfigContext = {
    useQPConfig: () => false as any,
    //usePrepareRoster: () => false as any
}

export const QPContext = React.createContext(DefaultQPContextData);

interface QPConfigProps {
	pageId: string;
    children: JSX.Element
}

export const QPConfigProvider = (props: QPConfigProps) => {
    const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const dbidKey = playerData ? `${playerData.player.dbid}/` : '';
    const { children, pageId } = props;
    const quipment: ItemWithBonus[] = globalContext.core.items.filter(f => f.type === 14).map(m => getItemWithBonus(m));
	const [config, setConfig] = useStateWithStorage(`${pageId}/${dbidKey}qpConfig`, { ...DefaultQuipmentConfig, pageId } as QuipmentProspectConfig, { rememberForever: !!playerData });

	const applyQp = (crew: (PlayerCrew | CrewMember), voyageConfig?: IVoyageInputConfig): (PlayerCrew | CrewMember) => {
		return applyPageQp(config, crew, voyageConfig);
	}

    const data: IQPConfigContext = {
        ...DefaultQPContextData,
        useQPConfig
    }

    return (<QPContext.Provider value={data}>
        {children}
    </QPContext.Provider>)

    function useQPConfig(): [QuipmentProspectConfig, (value: QuipmentProspectConfig) => void, (crew: (PlayerCrew | CrewMember), voyageConfig?: IVoyageInputConfig) => (PlayerCrew | CrewMember)] {
		if (config.enabled && config.remove) config.remove = false;
		return [config, setConfig, applyQp];
    }

    function applyPageQp(config: QuipmentProspectConfig, crew: (PlayerCrew | CrewMember), voyageConfig?: IVoyageInputConfig) {
        return applyQuipmentProspect(
            crew as PlayerCrew,
            quipment,
            globalContext.player.buffConfig,
            {
                voyageConfig,
                qpConfig: config
            });
    }
}

export function applyQuipmentProspect(c: PlayerCrew, quipment: ItemWithBonus[], buffConfig: BuffStatTable | undefined, params: IQPParams) {
	const { voyageConfig, qpConfig } = params;
	if (qpConfig.enabled && c.immortal && c.q_bits >= 100) {
		if (qpConfig.current && c.kwipment.some(q => typeof q === 'number' ? q : q[1])) {
			return c;
		}
		let newcopy = oneCrewCopy(c);
		let oldorder = newcopy.skill_order;
		let order = [...oldorder];
		let nslots = qbitsToSlots(newcopy.q_bits);

		if (qpConfig.voyage !== 'none') {
			order.sort((a, b) => {
				if (voyageConfig && ['voyage', 'voyage_1'].includes(qpConfig.voyage)) {
					if (voyageConfig.skills.primary_skill === a) return -1;
					if (voyageConfig.skills.primary_skill === b) return 1;
				}
				if (voyageConfig && ['voyage', 'voyage_2'].includes(qpConfig.voyage)) {
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
			useQuipment = newcopy.best_quipment_3 || newcopy.best_quipment_1_2 || newcopy.best_quipment;
		}
		else if (qpConfig.mode === 'best') {
			useQuipment = newcopy.best_quipment;
		}
		else if (qpConfig.mode === 'best_2') {
			useQuipment = newcopy.best_quipment_1_2 || newcopy.best_quipment;
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
			newcopy.skills ??= {};
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
				newcopy.skills ??= {};
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
	else if (qpConfig.remove && c.q_bits >= 100) {
		let newcopy = oneCrewCopy(c);
		newcopy.kwipment = [0, 0, 0, 0];
		newcopy.kwipment_expiration = [0, 0, 0, 0];
		if (buffConfig) {
			newcopy.skills = applyCrewBuffs(newcopy, buffConfig)!
		}
		else {
			newcopy.skills = structuredClone(newcopy.base_skills);
		}
		return newcopy;
	}
	else {
		return c;
	}

}

