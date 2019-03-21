// This code is heavily inspired from IAmPicard's work and released under the GPL-V3 license. Huge thanks for all his contributions!
import CONFIG from '../components/CONFIG';

import ComputeWorker from 'worker-loader!../wasm/wasmWorker';

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

export function formatCrewStats(crew: any): string {
	let result = '';
	for (let skillName in CONFIG.SKILLS) {
		let skill = crew.skills[skillName];
		
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

export class BonusCrew {
	eventName: string = '';
	eventCrew: { [index: string]: any } = {};
}

export function bonusCrewForCurrentEvent(playerData: any): BonusCrew | undefined {
	let result = new BonusCrew();

	if (playerData.character.events && playerData.character.events.length > 0) {
		let activeEvent = playerData.character.events[0];
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

		/*for (let symbol in eventCrew) {
            let foundCrew = roster.find((crew: any) => crew.symbol === symbol);
            if (foundCrew) {
                result.crewIds.push(foundCrew.crew_id || foundCrew.id);
            }
        }*/

		result.eventCrew = eventCrew;

		return result;
	}

	return undefined;
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
	score: number;
	entries: {
		slotId: number;
		choice: number;
	}[];
}
function parseResults(result: Uint8Array): ICalcResult {
	let dv = new DataView(result.buffer);

	let score = dv.getFloat32(0, true);

	let entries = [];
	for (let i = 0; i < 12; i++) {
		let crewId = dv.getUint32(4 + i * 4, true);

		let entry = {
			slotId: i,
			choice: crewId
		};
		entries.push(entry);
	}

	return { entries, score };
}

export function exportVoyageData(options) {
	let dataToExport = {
		// These values get filled in the following code
		crew: [],
		binaryConfig: undefined
	};

	let binaryConfigBuffer = new ArrayBuffer(34);
	let binaryConfig = new DataView(binaryConfigBuffer);
	binaryConfig.setUint8(0, options.searchDepth);
	binaryConfig.setUint8(1, options.extendsTarget);
	binaryConfig.setUint16(2, options.shipAM, true);
	binaryConfig.setFloat32(4, options.skillPrimaryMultiplier, true);
	binaryConfig.setFloat32(8, options.skillSecondaryMultiplier, true);
	binaryConfig.setFloat32(12, options.skillMatchingMultiplier, true);
	binaryConfig.setUint16(16, options.traitScoreBoost, true);

	// 18 is primary_skill
	// 19 is secondary_skill
	// 20 - 32 is voyage_crew_slots

	binaryConfig.setUint16(32, 0 /*crew.size*/, true);

	let voyage_description = options.voyage_description;
	const SLOT_COUNT = voyage_description.crew_slots.length;
	console.assert(SLOT_COUNT === 12, 'Ooops, voyages have more than 12 slots !? The algorithm needs changes.');

	// Find unique traits used in the voyage slots
	let setTraits = new Set();
	voyage_description.crew_slots.forEach(slot => {
		setTraits.add(slot.trait);
	});

	let arrTraits = Array.from(setTraits);
	let skills = Object.keys(CONFIG.SKILLS);

	// Replace traits and skills with their id
	let slotTraitIds = [];
	for (let i = 0; i < voyage_description.crew_slots.length; i++) {
		let slot = voyage_description.crew_slots[i];

		binaryConfig.setUint8(20 + i, skills.indexOf(slot.skill));
		slotTraitIds[i] = arrTraits.indexOf(slot.trait);
	}

	binaryConfig.setUint8(18, skills.indexOf(voyage_description.skills.primary_skill));
	binaryConfig.setUint8(19, skills.indexOf(voyage_description.skills.secondary_skill));

	options.roster.forEach(crew => {
		let traitIds = [];
		crew.traits.forEach(trait => {
			if (arrTraits.indexOf(trait) >= 0) {
				traitIds.push(arrTraits.indexOf(trait));
			}
		});

		let traitBitMask = 0;
		for (let nFlag = 0; nFlag < SLOT_COUNT; traitBitMask |= (traitIds.indexOf(slotTraitIds[nFlag]) !== -1 ? 1 : 0) << nFlag++);

		// We store traits in the first 12 bits, using the next few for flags
		traitBitMask |= (crew.frozen > 0 ? 1 : 0) << SLOT_COUNT;
		traitBitMask |= (crew.active_id && crew.active_id > 0 ? 1 : 0) << (SLOT_COUNT + 1);
		traitBitMask |= (crew.level == 100 && crew.rarity == crew.max_rarity ? 1 : 0) << (SLOT_COUNT + 2); // ff100

		// Replace skill data with a binary blob
		let buffer = new ArrayBuffer(6 /*number of skills */ * 3 /*values per skill*/ * 2 /*we need 2 bytes per value*/);
		let skillData = new Uint16Array(buffer);
		for (let i = 0; i < skills.length; i++) {
			if (!crew.skills[skills[i]]) {
				skillData[i * 3] = 0;
				skillData[i * 3 + 1] = 0;
				skillData[i * 3 + 2] = 0;
			} else {
				let skill = crew.skills[skills[i]];
				skillData[i * 3] = skill.core;
				skillData[i * 3 + 1] = skill.range_min;
				skillData[i * 3 + 2] = skill.range_max;
			}
		}

		// This won't be necessary once we switch away from Json to pure binary for native invocation
		let newCrew = {
			id: crew.crew_id ? crew.crew_id : crew.id,
			name: crew.name.replace(/[^\x00-\x7F]/g, ''),
			traitBitMask: traitBitMask,
			max_rarity: crew.max_rarity,
			skillData: Array.from(skillData)
		};

		dataToExport.crew.push(newCrew);
	});

	binaryConfig.setUint16(32, dataToExport.crew.length, true);

	dataToExport.binaryConfig = Array.from(new Uint8Array(binaryConfigBuffer));

	return dataToExport;
}

export function calculateVoyage(options, progressCallback: (result: ICalcResult) => void, doneCallback: (result: ICalcResult) => void) {
	let dataToExport = exportVoyageData(options);

	const worker = new ComputeWorker();
	worker.addEventListener('message', message => {
		if (message.data.progressResult) {
			progressCallback(parseResults(Uint8Array.from(message.data.progressResult)));
		} else if (message.data.result) {
			doneCallback(parseResults(Uint8Array.from(message.data.result)));
		}
	});

	worker.postMessage(dataToExport);
}
