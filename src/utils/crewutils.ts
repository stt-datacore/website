import { simplejson2csv, ExportField } from './misc';
import { BuffStatTable, calculateBuffConfig } from './voyageutils';

import CONFIG from '../components/CONFIG';
import { CompletionState, PlayerCrew, PlayerData } from '../model/player';
import { ComputedBuff, CrewMember, Skill } from '../model/crew';

export function exportCrewFields(): ExportField[] {
	return [
		{
			label: 'Name',
			value: (row: PlayerCrew) => row.name
		},
		{
			label: 'Have',
			value: (row: PlayerCrew) => row.have
		},
		{
			label: 'Short name',
			value: (row: PlayerCrew) => row.short_name
		},
		{
			label: 'Max rarity',
			value: (row: PlayerCrew) => row.max_rarity
		},
		{
			label: 'Rarity',
			value: (row: PlayerCrew) => row.rarity
		},
		{
			label: 'Level',
			value: (row: PlayerCrew) => row.level
		},
		{
			label: 'Immortal',
			value: (row: PlayerCrew) => row.immortal
		},
		{
			label: 'Equipment',
			value: (row: PlayerCrew) => row.equipment.join(' ')
		},
		{
			label: 'Tier',
			value: (row: PlayerCrew) => row.bigbook_tier
		},
		{
			label: 'In portal',
			value: (row: PlayerCrew) => (row.in_portal === undefined ? 'N/A' : row.in_portal)
		},
		{
			label: 'Collections',
			value: (row: PlayerCrew) => row.collections.map(c => c.replace(/,/g, '')).join(', ')
		},
		{
			label: 'Voyage rank',
			value: (row: PlayerCrew) => row.ranks.voyRank
		},
		{
			label: 'Gauntlet rank',
			value: (row: PlayerCrew) => row.ranks.gauntletRank
		},
		{
			label: 'Command core',
			value: (row: PlayerCrew) => row.base_skills?.command_skill?.core
		},
		{
			label: 'Command min',
			value: (row: PlayerCrew) => row.base_skills?.command_skill?.range_min
		},
		{
			label: 'Command max',
			value: (row: PlayerCrew) => row.base_skills?.command_skill?.range_max
		},
		{
			label: 'Diplomacy core',
			value: (row: PlayerCrew) => row.base_skills?.diplomacy_skill?.core
		},
		{
			label: 'Diplomacy min',
			value: (row: PlayerCrew) => row.base_skills?.diplomacy_skill?.range_min
		},
		{
			label: 'Diplomacy max',
			value: (row: PlayerCrew) => row.base_skills?.diplomacy_skill?.range_max
		},
		{
			label: 'Engineering core',
			value: (row: PlayerCrew) => row.base_skills?.engineering_skill?.core
		},
		{
			label: 'Engineering min',
			value: (row: PlayerCrew) => row.base_skills?.engineering_skill?.range_min
		},
		{
			label: 'Engineering max',
			value: (row: PlayerCrew) => row.base_skills?.engineering_skill?.range_max
		},
		{
			label: 'Medicine core',
			value: (row: PlayerCrew) => row.base_skills?.medicine_skill?.core
		},
		{
			label: 'Medicine min',
			value: (row: PlayerCrew) => row.base_skills?.medicine_skill?.range_min
		},
		{
			label: 'Medicine max',
			value: (row: PlayerCrew) => row.base_skills?.medicine_skill?.range_max
		},
		{
			label: 'Science core',
			value: (row: PlayerCrew) => row.base_skills?.science_skill?.core
		},
		{
			label: 'Science min',
			value: (row: PlayerCrew) => row.base_skills?.science_skill?.range_min
		},
		{
			label: 'Science max',
			value: (row: PlayerCrew) => row.base_skills?.science_skill?.range_max
		},
		{
			label: 'Security core',
			value: (row: PlayerCrew) => row.base_skills?.security_skill?.core
		},
		{
			label: 'Security min',
			value: (row: PlayerCrew) => row.base_skills?.security_skill?.range_min
		},
		{
			label: 'Security max',
			value: (row: PlayerCrew) => row.base_skills?.security_skill?.range_max
		},
		{
			label: 'Traits',
			value: (row: PlayerCrew) => row.traits_named.concat(row.traits_hidden)
		},
		{
			label: 'Action name',
			value: (row: PlayerCrew) => row.action.name
		},
		{
			label: 'Boosts',
			value: (row: PlayerCrew) => CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[row.action.bonus_type]
		},
		{
			label: 'Amount',
			value: (row: PlayerCrew) => row.action.bonus_amount
		},
		{
			label: 'Initialize',
			value: (row: PlayerCrew) => row.action.initial_cooldown
		},
		{
			label: 'Duration',
			value: (row: PlayerCrew) => row.action.duration
		},
		{
			label: 'Cooldown',
			value: (row: PlayerCrew) => row.action.cooldown
		},
		{
			label: 'Bonus Ability',
			value: (row: PlayerCrew) =>
				(row.action.ability ? getShipBonus(row) : '')
		},
		{
			label: 'Trigger',
			value: (row: PlayerCrew) =>
				(row.action.ability ? CONFIG.CREW_SHIP_BATTLE_TRIGGER[row.action.ability.condition] : '')
		},
		{
			label: 'Uses per Battle',
			value: (row: PlayerCrew) => row.action.limit || ''
		},
		{
			label: 'Handicap Type',
			value: (row: PlayerCrew) => (row.action.penalty ? CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[row.action.penalty.type] : '')
		},
		{
			label: 'Handicap Amount',
			value: (row: PlayerCrew) => (row.action.penalty ? row.action.penalty.amount : '')
		},
		{
			label: 'Accuracy',
			value: (row: PlayerCrew) => row.ship_battle.accuracy || ''
		},
		{
			label: 'Crit Bonus',
			value: (row: PlayerCrew) => row.ship_battle.crit_bonus || ''
		},
		{
			label: 'Crit Rating',
			value: (row: PlayerCrew) => row.ship_battle.crit_chance || ''
		},
		{
			label: 'Evasion',
			value: (row: PlayerCrew) => row.ship_battle.evasion || ''
		},
		{
			label: 'Charge Phases',
			value: (row: PlayerCrew) => (row.action.charge_phases ? getShipChargePhases(row).join('; ') : '')
		},
		{
			label: 'Symbol',
			value: (row: PlayerCrew) => row.symbol
		}
	];
}

export function exportCrew(crew: PlayerCrew[] | CrewMember[], delimeter = ','): string {
	return simplejson2csv(crew, exportCrewFields(), delimeter);
}

export function applyCrewBuffs(crew: PlayerCrew | CrewMember, buffConfig: BuffStatTable) {
	const getMultiplier = (skill: string, stat: string) => {
		return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
	};

	for (let skill in CONFIG.SKILLS) {
		crew[skill] = { core: 0, min: 0, max: 0 };
	}

	// Apply buffs
	for (let skill in crew.base_skills) {
		crew[skill] = {
			core: Math.round(crew.base_skills[skill].core * getMultiplier(skill, 'core')),
			min: Math.round(crew.base_skills[skill].range_min * getMultiplier(skill, 'range_min')),
			max: Math.round(crew.base_skills[skill].range_max * getMultiplier(skill, 'range_max'))
		};
	}
}

export function downloadData(dataUrl: string | URL, name: string): void {
	let pom = document.createElement('a');
	pom.setAttribute('href', `${dataUrl}`);
	pom.setAttribute('download', name);

	if (document.createEvent) {
		let event = document.createEvent('MouseEvents');
		event.initEvent('click', true, true);
		pom.dispatchEvent(event);
	} else {
		pom.click();
	}
}

export function download(filename, text) {
    let extension = filename.split('.').pop();
    let mimeType = '';
    let isText = true;
    if (extension === 'csv') {
        mimeType = 'text/csv;charset=utf-8';
    } else if (extension === 'xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        isText = false;
    } else if (extension === 'json') {
        mimeType = 'text/json;charset=utf-8';
    } else if (extension === 'html') {
        mimeType = 'text/html;charset=utf-8';
    }

    if (isText) {
        downloadData(`data:${mimeType},${encodeURIComponent(text)}`, filename);
    } else {
        var a = new FileReader();
        a.onload = (e) => {
			if (e.target && e.target.result) downloadData(e.target.result as string, filename);
        };
        a.readAsDataURL(text);
    }
}

/**
 * Returns true if the crew member is immortalized
 * @param crew 
 * @returns 
 */
export function isImmortal(crew: PlayerCrew): boolean {
	return crew.level === 100 && crew.rarity === crew.max_rarity && (crew.equipment?.length === 4 || !crew.equipment)
}

export function prepareProfileData(caller: string, allcrew: CrewMember[], playerData: PlayerData, lastModified) {
	console.log("prepareProfileData enter...");
	console.log("Caller: " + caller);

	let numImmortals = new Set(playerData.player.character.c_stored_immortals);

	playerData.player.character.stored_immortals.map(si => si.id).forEach(item => numImmortals.add(item));
	playerData.player.character.crew.forEach(crew => {
		if (crew.level === 100 && crew.equipment.length === 4) {
			numImmortals.add(crew.archetype_id);
		}
	});
	
	playerData.calc = {
		numImmortals: numImmortals?.size ?? 0,
		lastModified
	};

	let buffConfig = calculateBuffConfig(playerData.player);

	// Merge with player crew
	let ownedCrew = [] as PlayerCrew[];
	let unOwnedCrew = [] as PlayerCrew[];
	for (let oricrew of allcrew) {
		// Create a copy of crew instead of directly modifying the source (allcrew)
		let crew = JSON.parse(JSON.stringify(oricrew)) as PlayerCrew;
		crew.rarity = crew.max_rarity;
		crew.level = 100;
		crew.have = false;
		//crew.equipment = [0, 1, 2, 3];
		crew.favorite = false;

		if (playerData.player.character.c_stored_immortals?.includes(crew.archetype_id)) {
			crew.immortal = CompletionState.Frozen;
		} else {
			let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
			crew.immortal = immortal ? immortal.quantity : CompletionState.NotComplete;
		}
		if (crew.immortal !== 0) {
			crew.have = true;
			applyCrewBuffs(crew, buffConfig);
			ownedCrew.push(JSON.parse(JSON.stringify(crew)));
		}
		else {
			let inroster = playerData.player.character.crew.filter(c => c.archetype_id === crew.archetype_id);
			inroster.forEach(owned => {
				crew.rarity = owned.rarity;
				crew.base_skills = owned.base_skills;
				crew.level = owned.level;
				crew.have = true;
				crew.favorite = owned.favorite;
				crew.equipment = owned.equipment;
				if (owned.action) crew.action.bonus_amount = owned.action.bonus_amount;
				if (owned.ship_battle) crew.ship_battle = owned.ship_battle;
				// Use skills directly from player data when possible
				if (owned.skills) {
					for (let skill in CONFIG.SKILLS) {
						crew[skill] = { core: 0, min: 0, max: 0 };
					}
					for (let skill in owned.skills) {
						crew[skill] = {
							core: owned.skills[skill].core,
							min: owned.skills[skill].range_min,
							max: owned.skills[skill].range_max
						};
					}
				}
				// Otherwise apply buffs to base_skills
				else {
					applyCrewBuffs(crew, buffConfig);
				}

				crew.immortal = isImmortal(crew) ? CompletionState.Immortalized : CompletionState.NotComplete;
				ownedCrew.push(JSON.parse(JSON.stringify(crew)));
			});
		}
		if (!crew.have) {
			// Crew is not immortal or in the active roster
			applyCrewBuffs(crew, buffConfig);
			// Add a copy to the list
			unOwnedCrew.push(JSON.parse(JSON.stringify(crew)));
		}
		// else {
		// 	if (crew.immortal === CompletionState.Immortalized) {
		// 		console.log(crew.name + ": Immortalized");
		// 	}
		// 	else if (crew.immortal === CompletionState.Frozen) {
		// 		console.log(crew.name + ": Frozen");
		// 	}
		// 	else if (crew.immortal > 1) {
		// 		console.log(crew.name + ": Frozen (" + crew.immortal + " copies)");
		// 	}
		// 	else {
		// 		console.log(crew.name + ": In Progress (Level " + crew.level + "; " + crew.rarity + " / " + crew.max_rarity + " Stars; " + (crew.equipment?.length ?? 0) + " / 4 Equipment)");
		// 	}
		// }
	}

	playerData.player.character.crew = ownedCrew;
	playerData.player.character.unOwnedCrew = unOwnedCrew;
}

export function formatTierLabel(crew: PlayerCrew | CrewMember): string {
	if (!crew.in_portal && crew.obtained === "WebStore") {
		return '$';
	}
	if (!crew.bigbook_tier || crew.bigbook_tier === -1) {
		return 'none';
	}
	return `${crew.bigbook_tier}`;
}

export function getShipBonus(crew: PlayerCrew | CrewMember): string {
	if (!crew.action || !crew.action.ability) return "";
	let bonusText = CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type];
	if (crew.action.ability.type === 0)
		bonusText = bonusText.replace('bonus boost by', `${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]} boost to`);
	const bonusVal = crew.action.ability.type === 0
		? crew.action.bonus_amount+crew.action.ability.amount
		: crew.action.ability.amount;
	bonusText = bonusText.replace('%VAL%', `${bonusVal}`);
	return bonusText;
}

export function getShipChargePhases(crew: PlayerCrew | CrewMember): string[] {
	const phases = [] as string[];
	let charge_time = 0;
	console.log(crew.action);
	if (!crew.action || !crew.action.bonus_type || !crew.action.charge_phases) return phases;
	crew.action.charge_phases.forEach(cp => {
		charge_time += cp.charge_time;
		let phaseDescription = `After ${charge_time}s`;

		if (cp.ability_amount && crew?.action?.ability) {
			phaseDescription += ', '+CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', `${cp.ability_amount}`);
		}

		if (cp.bonus_amount) {
			phaseDescription += `, +${cp.bonus_amount} to ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]}`;
		}

		if (cp.duration) {
			phaseDescription += `, +${cp.duration-crew.action.duration}s duration`;
		}

		if (cp.cooldown) {
			phaseDescription += `, +${cp.cooldown-crew.action.cooldown}s cooldown`;
		}

		phases.push(phaseDescription);
	});
	return phases;
}

export function gradeToColor(grade: string): string | null {
	switch(grade) {
		case "A":
		case "A-":
		case "A+":
			return "lightgreen";

		case "B":
		case "B-":
		case "B+":
			return "aquamarine";

		case "C":
		case "C-":
		case "C+":
			return "yellow";

		case "D":
		case "D-":
		case "D+":
			return "orange";

		case "E":
		case "E-":
		case "E+":
			return "tomato";

		case "F":
		case "F-":
		case "F+":
			return "tomato";

					
	}
	return null;
}

export function applySkillBuff(buffConfig: BuffStatTable, skill: string, base_skill: Skill): ComputedBuff {
	const getMultiplier = (skill: string, stat: string) => {
		let buffkey = `${skill}_${stat}`;
		if (buffkey in buffConfig) {
			return buffConfig[buffkey].multiplier + buffConfig[buffkey].percent_increase;
		}
		else {
			return 0;
		}		
	};

	return {
		core: Math.round(base_skill.core*getMultiplier(skill, 'core')),
		min: Math.round(base_skill.range_min*getMultiplier(skill, 'range_min')),
		max: Math.round(base_skill.range_max*getMultiplier(skill, 'range_max'))
	};
}

