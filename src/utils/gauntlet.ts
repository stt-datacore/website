
import { CrewMember, Skill } from "../model/crew";
import { Gauntlet } from "../model/gauntlets";
import { PlayerCrew } from "../model/player";
import { getPlayerPairs } from "./crewutils";



export interface InternalSettings {    
    crit5: number | string;
    crit25: number | string;
    crit45: number | string;
    crit65: number | string;
    minWeight: number | string;
    maxWeight: number | string;
    linearSkillIncidenceWeightPrimary: number | string;
    linearSkillIndexWeightPrimary: number | string;
    linearSkillIncidenceWeightSecondary: number | string;
    linearSkillIndexWeightSecondary: number | string;
    linearSkillIncidenceWeightTertiary: number | string;
    linearSkillIndexWeightTertiary: number | string;
}

export interface GauntletSettings extends InternalSettings {    
    crit5: number;
    crit25: number;
    crit45: number;
    crit65: number;
    minWeight: number;
    maxWeight: number;
    linearSkillIncidenceWeightPrimary: number;
    linearSkillIndexWeightPrimary: number;
    linearSkillIncidenceWeightSecondary: number;
    linearSkillIndexWeightSecondary: number;
    linearSkillIncidenceWeightTertiary: number;
    linearSkillIndexWeightTertiary: number;
}

export interface GauntletSettingsConfig {
	current: GauntletSettings;
	setCurrent: (value: GauntletSettings) => void;
	defaultOptions: GauntletSettings;
}

export interface GauntletSettingsProps {	
    config: GauntletSettingsConfig;    
	renderTrigger?: () => JSX.Element;
	setIsOpen: (value: boolean) => void;
	isOpen: boolean;
};

export const crit65 = 2;
export const crit45 = 1.85;
export const crit25 = 1.45;
export const crit5 = 1;

export const defaultSettings = {
	crit5,
	crit25,
	crit45,
	crit65,
	minWeight: 1,
	maxWeight: 1,
    linearSkillIncidenceWeightPrimary: 1.25,
    linearSkillIndexWeightPrimary: 0.75,
    linearSkillIncidenceWeightSecondary: 1.1,
    linearSkillIndexWeightSecondary: 0.9,
    linearSkillIncidenceWeightTertiary: 1.05,
    linearSkillIndexWeightTertiary: 0.95,
} as GauntletSettings;



export function getBernardsNumber(a: PlayerCrew | CrewMember, gauntlet?: Gauntlet, apairs?: Skill[][] | Skill[], settings?: GauntletSettings) {
	let atrait = gauntlet?.prettyTraits?.filter(t => a.traits_named.includes(t)).length ?? 0;
	settings ??= defaultSettings;

	if (atrait >= 3) atrait = settings.crit65;
	else if (atrait >= 2) atrait = settings.crit45;
	else if (atrait >= 1) atrait = settings.crit25;
	else atrait = settings.crit5;
	
	apairs ??= getPlayerPairs(a, atrait, settings.minWeight, settings.maxWeight);
	
	let cn = 0;
	let w = 0;

	if (apairs?.length && ("length" in apairs[0])) {
		const skills = [apairs[0][0], apairs[0][1], apairs.length > 1 ? apairs[1][1] : { core: 0, range_min: 0, range_max: 0 }];

		for (let skill of skills) {
			if (skill.range_max === 0) continue;
			let dn = (skill.range_max + skill.range_min) / 2;
			if (dn) {
				cn += dn;
				w++;
			}
		}
		if (apairs.length === 1) cn /= 2;
	}	
	else if (apairs?.length && !("length" in apairs[0])) {
		for (let skill of apairs as Skill[]) {
			if (skill.range_max === 0) continue;
			let dn = (skill.range_max + skill.range_min) / 2;
			if (dn) {
				cn += dn;
				w++;
			}
		}		
	}

	//cn /= w;

	return cn;
}
