import CONFIG from '../components/CONFIG';
import { CrewMember, BaseSkills, Skill } from '../model/crew';
import { AllBuffsCapHash, Player, PlayerCrew, TranslateMethod } from '../model/player';
import { AntimatterSeatMap } from '../model/voyage';
import { Estimate } from "../model/voyage";

export const formatTime = (time: number, t?: TranslateMethod, zeroMin = true): string => {

	let hours = Math.floor(time);
	let minutes = Math.floor((time-hours)*60);
	if (zeroMin || minutes) {
		if (t) {
			return `${t('duration.n_h_compact', { hours: `${hours}` })} ${t('duration.n_m_compact', { minutes: `${minutes}` })}`;
		}
		else {
			return hours+"h " +minutes+"m";
		}
	}
	else {
		if (t) {
			return `${t('duration.n_h_compact', { hours: `${hours}` })}`;
		}
		else {
			return hours+"h";
		}
	}
};

export const flattenEstimate = (estimate: Estimate): any => {
	const extent = estimate.refills[0];
	const flatEstimate = {
		median: extent.result,
		minimum: extent.saferResult,
		moonshot: extent.moonshotResult,
		dilemma: {
			hour: extent.lastDil,
			chance: extent.dilChance
		}
	};
	return flatEstimate;
};

/* TODO: move IBuffStat, calculateBuffConfig to crewutils.ts (currently not used by voyage calculator) */
export interface IBuffStat {
	multiplier: number;
	percent_increase: number;
}

export interface BuffStatTable {
	[key: string]: IBuffStat;
}

export function calculateMaxBuffs(allBuffs: AllBuffsCapHash): BuffStatTable {
	let result: BuffStatTable = {};

	const parseBuff = (value: string) => {
		let i = value.indexOf(",");
		if (i !== -1) {
			let skill = value.slice(0, i);
			let type =  value.slice(i+1);

			return {
				skill,
				type
			};
		}
		return undefined;
	};

	Object.keys(allBuffs)
		.filter(z => z.includes("skill") || z.includes("ship"))
		.forEach(buff => {
			let p = parseBuff(buff);
			if (p) result[p.skill] = {} as IBuffStat;
			if (p && p.type === 'percent_increase') {
				result[p.skill].multiplier = 1;
				result[p.skill].percent_increase = allBuffs[buff];
			}
			else if (p && p.type === 'multiplier') {
				result[p.skill].multiplier = allBuffs[buff];
			}
		});

	return result;
}

export function calculateBuffConfig(playerData: Player): BuffStatTable {
	const skills = ['command_skill', 'science_skill', 'security_skill', 'engineering_skill', 'diplomacy_skill', 'medicine_skill'];
	const buffs = ['core', 'range_min', 'range_max'];

	const buffConfig: BuffStatTable = {};

	for (let skill of skills) {
		for (let buff of buffs) {
			buffConfig[`${skill}_${buff}`] = {
				multiplier: 1,
				percent_increase: 0
			};
		}
	}

	for (let buff of playerData.character.crew_collection_buffs.concat(playerData.character.starbase_buffs)) {
		if (buffConfig[buff.stat]) {
			if (buff.operator === 'percent_increase') {
				buffConfig[buff.stat].percent_increase += buff.value;
			} else if (buff.operator === 'multiplier') {
				buffConfig[buff.stat].multiplier = buff.value;
			} else {
				console.warn(`Unknown buff operator '${buff.operator}' for '${buff.stat}'.`);
			}
		}
	}

	playerData.character.captains_bridge_buffs.forEach((buff) => {
		buffConfig[buff.stat] = {
			multiplier: 1,
			percent_increase: buff.value
		}
	});

	return buffConfig;
}

/* TODO: move remapSkills, formatCrewStats to crewpopup.tsx (only used in that component) */
// 	When is remapSkills needed?
const remapSkills = skills =>
	Object.fromEntries(Object.entries(skills)
		.map(([key, value]) =>
			[{core: 'core', min: 'range_min', max: 'range_max'}[key], value]));

export function formatCrewStats(crew: PlayerCrew, use_base:boolean = false): string {
	let result = '';

	for (let skillName in CONFIG.SKILLS) {
		let skill = use_base ? crew.base_skills[skillName] : crew.skills[skillName];

		if (skill && skill.core && (skill.core > 0)) {
			result += `${CONFIG.SKILLS_SHORT.find(c => c.name === skillName)?.short} (${Math.floor(skill.core + (skill.range_min + skill.range_max) / 2)}) `;
		}
	}
	return result;
}


export interface RawVoyageRecord {
    estimatedDuration?: number;
    voyageDate: Date;
    crew: string[];
    createdAt: Date;
    am_traits?: string[];
    primary_skill?: string;
    secondary_skill?: string;
    ship_trait?: string;
    extra_stats?: any
}

export function guessSkillsFromCrew<T extends CrewMember>(voyage: RawVoyageRecord, crew: T[]) {

    let sk = {} as BaseSkills;
    let voycrew = crew.filter(f => voyage.crew.includes(f.symbol));
    voycrew.forEach((c) => {
        Object.keys(c.base_skills).forEach((skill) => {
            sk[skill] ??= {
                core: 0,
                range_min: 0,
                range_max: 0,
                skill
            }
            sk[skill].core += c.base_skills[skill].core;
            sk[skill].range_max += c.base_skills[skill].range_max;
            sk[skill].range_min += c.base_skills[skill].range_min;
        })
    });

    let skills = Object.values(sk) as Skill[];
    skills.sort((a, b) => {
        return (b.core + (b.range_max * 0.10) + (b.range_min * 0.10)) - (a.core + (a.range_max * 0.10) + (a.range_min * 0.10))
    })

    return skills.slice(0, 2).map(sk => sk.skill as string);
}

export function lookupAMSeatsByTrait(trait: string) {
    for (let ln of AntimatterSeatMap) {
        if (ln.name == trait) {
            return ln.skills;
        }
    }
    return [];
}

export function lookupAMTraitsBySeat(skill: string) {
    const results = [] as string[];
	for (let ln of AntimatterSeatMap) {
		if (ln.skills.includes(skill)) {
			results.push(ln.name);
		}
	}
	return results;
}
