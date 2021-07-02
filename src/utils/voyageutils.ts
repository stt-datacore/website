// This code is heavily inspired from IAmPicard's work and released under the GPL-V3 license. Huge thanks for all his contributions!
import CONFIG from '../components/CONFIG';

import ComputeWorker from 'worker-loader!../workers/unifiedWorker';

export interface IBuffStat {
	multiplier: number;
	percent_increase: number;
}

export function calculateBuffConfig(playerData: any): { [index: string]: IBuffStat } {
	const skills = ['command_skill', 'science_skill', 'security_skill', 'engineering_skill', 'diplomacy_skill', 'medicine_skill'];
	const buffs = ['core', 'range_min', 'range_max'];

	const buffConfig: { [index: string]: IBuffStat } = {};

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

	return buffConfig;
}

/// Takes the raw stats from a crew and applies the current player buff config (useful for frozen crew)
export function applyBuffConfig(buffConfig: { [index: string]: IBuffStat }, crew: any): void {
	const getMultiplier = (skill: string, stat: string) => {
		return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
	};

	for (let skill in crew.base_skills) {
		crew.skills[skill].core = Math.round(crew.base_skills[skill].core * getMultiplier(skill, 'core'));
		crew.skills[skill].range_min = Math.round(crew.base_skills[skill].range_min * getMultiplier(skill, 'range_min'));
		crew.skills[skill].range_max = Math.round(crew.base_skills[skill].range_max * getMultiplier(skill, 'range_max'));
	}
}

const remapSkills = skills =>
	Object.fromEntries(Object.entries(skills)
		.map(([key, value]) =>
			[{core: 'core', min: 'range_min', max: 'range_max'}[key], value]));
export function formatCrewStats(crew: any, use_base:boolean = false): string {
	let result = '';
	for (let skillName in CONFIG.SKILLS) {
		let skill = use_base ? crew.base_skills[skillName]
												 : remapSkills(crew[skillName]);

		if (skill && skill.core && (skill.core > 0)) {
			result += `${CONFIG.SKILLS_SHORT.find(c => c.name === skillName).short} (${Math.floor(skill.core + (skill.range_min + skill.range_max) / 2)}) `;
		}
	}
	return result;
}

export function formatTimeSeconds(seconds: number, showSeconds: boolean = false): string {
    let h = Math.floor(seconds / 3600);
    let d = Math.floor(h / 24);
    h = h - d*24;
    let m = Math.floor(seconds % 3600 / 60);
    let s = Math.floor(seconds % 3600 % 60);

    let parts = [];

    if (d > 0) {
        parts.push(d + 'D');
    }

    if (h > 0) {
        parts.push(h + 'H');
    }

    if (m > 0) {
        parts.push(m + 'M');
    }

    if ((s > 0) && (showSeconds || (seconds < 60))) {
        parts.push(s + 'S');
    }

    if (parts.length === 0) {
        return '0S';
    } else {
        return parts.join(' ');
    }
}

export function bestVoyageShip(playerData: any): any[] {
	let voyage = playerData.character.voyage_descriptions[0];

	let consideredShips: any[] = [];
	playerData.character.ships.forEach((ship: any) => {
		if (ship.id > 0) {
			let entry = {
				ship: ship,
				score: ship.antimatter
			};

			if (ship.traits.find((trait: any) => trait == voyage.ship_trait)) {
				entry.score += 150; // TODO: where is this constant coming from (Config)?
			}

			consideredShips.push(entry);
		}
	});

	consideredShips = consideredShips.sort((a, b) => b.score - a.score);

	return consideredShips;
}

export interface ICalcResult {
	name: string;
	estimate: any;
	entries: {
		slotId: number;
		choice: any;
		hasTrait: boolean;
	}[];
	aggregates: any;
	startAM: number;
}


var iap_worker = null;
export function calculateVoyage(options, progressCallback: (result: ICalcResult) => void, doneCallback: (result: ICalcResult) => void) {
	iap_worker = new ComputeWorker();
	iap_worker.addEventListener('message', message => {
		if (message.data.progressResult) {
			progressCallback({name: options.name, ...message.data.progressResult });
		} else if (message.data.result) {
			doneCallback({name: options.name, ...message.data.result});
		}
	});

	iap_worker.postMessage(options);
}

export function abortVoyageCalculation() {
	if(iap_worker) iap_worker.terminate();
}

export class BonusCrew {
    eventName: string = '';
    crewIds: number[] = [];
};

export function bonusCrewForCurrentEvent(playerData: any, crewlist: any[]): BonusCrew | undefined {
    let result = new BonusCrew();

    if (playerData.character.events && playerData.character.events.length > 0) {
        let activeEvent = playerData.character.events
          .filter((ev) => (ev.seconds_to_end > 0))
          .sort((a, b) => (a.seconds_to_start - b.seconds_to_start))
          [0];
        result.eventName = activeEvent.name;

        let eventCrew: { [index: string]: any } = {};
        if (activeEvent.content) {
            if (activeEvent.content.crew_bonuses) {
                for (let symbol in activeEvent.content.crew_bonuses) {
                    eventCrew[symbol] = activeEvent.content.crew_bonuses[symbol];
                }
            }

            // For skirmish events
            if (activeEvent.content.bonus_crew) {
                for (let symbol in activeEvent.content.bonus_crew) {
                    eventCrew[symbol] = activeEvent.content.bonus_crew[symbol];
                }
            }

            // For expedition events
            if (activeEvent.content.special_crew) {
                activeEvent.content.special_crew.forEach((symbol: string) => {
                    eventCrew[symbol] = symbol;
                });
            }

            // TODO: there's also bonus_traits; should we bother selecting crew with those? It looks like you can use voyage crew in skirmish events, so it probably doesn't matter
            if (activeEvent.content.shuttles) {
                activeEvent.content.shuttles.forEach((shuttle: any) => {
                    for (let symbol in shuttle.crew_bonuses) {
                        eventCrew[symbol] = shuttle.crew_bonuses[symbol];
                    }
                });
            }
        }

        for (let symbol in eventCrew) {
            let foundCrew = crewlist.find((crew: any) => crew.have && (crew.symbol === symbol));
            if (foundCrew) {
                result.crewIds.push(foundCrew.crew_id || foundCrew.id);
            }
        }

        return result;
    }

    return undefined;
}
