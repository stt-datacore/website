import { simplejson2csv, ExportField } from './misc';
import { BuffStatTable, calculateBuffConfig } from './voyageutils';

import CONFIG from '../components/CONFIG';
import { CompactCrew, CompletionState, Player, PlayerCrew, PlayerData } from '../model/player';
import { BaseSkills, ComputedBuff, CrewMember, IntermediateSkillData, Skill } from '../model/crew';
import { TinyStore } from "./tiny";
import { Ability, ChargePhase, Ship, ShipAction } from '../model/ship';
import { ObjectNumberSortConfig, StatsSorter } from './statssorter';
import { navigate } from 'gatsby';

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
			value: (row: PlayerCrew) => Math.max(row.immortal, 0)
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
			value: (row: PlayerCrew) => row.command_skill?.core ?? 0
		},
		{
			label: 'Command min',
			value: (row: PlayerCrew) => row.command_skill?.min ?? 0
		},
		{
			label: 'Command max',
			value: (row: PlayerCrew) => row.command_skill?.max ?? 0
		},
		{
			label: 'Diplomacy core',
			value: (row: PlayerCrew) => row.diplomacy_skill?.core ?? 0
		},
		{
			label: 'Diplomacy min',
			value: (row: PlayerCrew) => row.diplomacy_skill?.min ?? 0
		},
		{
			label: 'Diplomacy max',
			value: (row: PlayerCrew) => row.diplomacy_skill?.max ?? 0
		},
		{
			label: 'Engineering core',
			value: (row: PlayerCrew) => row.engineering_skill?.core ?? 0
		},
		{
			label: 'Engineering min',
			value: (row: PlayerCrew) => row.engineering_skill?.min ?? 0
		},
		{
			label: 'Engineering max',
			value: (row: PlayerCrew) => row.engineering_skill?.max ?? 0
		},
		{
			label: 'Medicine core',
			value: (row: PlayerCrew) => row.medicine_skill?.core ?? 0
		},
		{
			label: 'Medicine min',
			value: (row: PlayerCrew) => row.medicine_skill?.min ?? 0
		},
		{
			label: 'Medicine max',
			value: (row: PlayerCrew) => row.medicine_skill?.max ?? 0
		},
		{
			label: 'Science core',
			value: (row: PlayerCrew) => row.science_skill?.core ?? 0
		},
		{
			label: 'Science min',
			value: (row: PlayerCrew) => row.science_skill?.min ?? 0
		},
		{
			label: 'Science max',
			value: (row: PlayerCrew) => row.science_skill?.max ?? 0
		},
		{
			label: 'Security core',
			value: (row: PlayerCrew) => row.security_skill?.core ?? 0
		},
		{
			label: 'Security min',
			value: (row: PlayerCrew) => row.security_skill?.min ?? 0
		},
		{
			label: 'Security max',
			value: (row: PlayerCrew) => row.security_skill?.max ?? 0
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

export function exportCrew(crew: (CrewMember | PlayerCrew)[], delimeter = ','): string {
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

export function prepareOne(oricrew: CrewMember, playerData?: PlayerData, buffConfig?: BuffStatTable, rarity?: number): PlayerCrew[] {
	// Create a copy of crew instead of directly modifying the source (allcrew)
	let crew = JSON.parse(JSON.stringify(oricrew)) as PlayerCrew;
	let outputcrew = [] as PlayerCrew[];

	crew.rarity = crew.max_rarity;
	crew.level = 100;
	crew.have = false;
	crew.equipment = [0, 1, 2, 3];
	crew.favorite = false;
	crew.immortal = playerData ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;

	if (typeof crew.date_added === 'string') {
		crew.date_added = new Date(crew.date_added);
	}

	if (playerData) {
		if (playerData.player.character.c_stored_immortals?.includes(crew.archetype_id)) {
			crew.immortal = CompletionState.Frozen;
		} else {
			let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
			crew.immortal = immortal ? immortal.quantity : CompletionState.NotComplete;
		}
		if (crew.immortal !== 0) {
			if (buffConfig) applyCrewBuffs(crew, buffConfig);
			crew.have = true;
		}
	}

	if (crew.immortal < 1) {
		let inroster = playerData?.player.character.crew.filter(c => c.archetype_id === crew.archetype_id);

		inroster?.forEach(owned => {
			
			let workitem: PlayerCrew;
			
			if (!rarity || rarity >= crew.rarity || rarity < 1) {
				workitem = owned;
			}
			else {
				rarity--;
				workitem = { ...owned, ...crew.intermediate_skill_data[rarity] };
			}
	
			crew.rarity = workitem.rarity;
			crew.base_skills = workitem.base_skills;
			crew.level = workitem.level;
			crew.have = true;
			crew.favorite = workitem.favorite;
			crew.equipment = workitem.equipment;
			if (workitem.action) crew.action.bonus_amount = workitem.action.bonus_amount;
			if (workitem.ship_battle) crew.ship_battle = workitem.ship_battle;
	
			// Use skills directly from player data when possible
	
			if (workitem.skills) {
				for (let skill in CONFIG.SKILLS) {
					crew[skill] = { core: 0, min: 0, max: 0 } as ComputedBuff;
				}
				for (let skill in workitem.skills) {
					crew[skill] = {
						core: workitem.skills[skill].core,
						min: workitem.skills[skill].range_min,
						max: workitem.skills[skill].range_max
					} as ComputedBuff;
				}
			}
			// Otherwise apply buffs to base_skills
			else if (buffConfig) {
				 applyCrewBuffs(crew, buffConfig);
			}
	
			crew.immortal = isImmortal(crew) ? CompletionState.Immortalized : CompletionState.NotComplete;
			outputcrew.push(JSON.parse(JSON.stringify(crew)));
		});
	}

	if (!crew.have || crew.immortal > 0) {
		if (crew.immortal <= 0 && rarity && rarity < crew.max_rarity && rarity > 0) {
			crew = JSON.parse(JSON.stringify({ ... crew, ... crew.intermediate_skill_data[rarity] }));
		}
		outputcrew.push(crew);
	}

	return outputcrew;
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
		for (let newcrew of prepareOne(oricrew, playerData, buffConfig)) {
			if (newcrew.have) {
				ownedCrew.push(newcrew);
			}
			else {
				unOwnedCrew.push(newcrew);
			}
		}
	}
	
	playerData.stripped = false;
	playerData.player.character.crew = ownedCrew;
	playerData.player.character.unOwnedCrew = unOwnedCrew;
}

// export function prepareProfileData(caller: string, allcrew: CrewMember[], playerData: PlayerData, lastModified) {
// 	console.log("prepareProfileData enter...");
// 	console.log("Caller: " + caller);

// 	let numImmortals = new Set(playerData.player.character.c_stored_immortals);

// 	playerData.player.character.stored_immortals.map(si => si.id).forEach(item => numImmortals.add(item));
// 	playerData.player.character.crew.forEach(crew => {
// 		if (crew.level === 100 && crew.equipment.length === 4) {
// 			numImmortals.add(crew.archetype_id);
// 		}
// 	});

// 	playerData.calc = {
// 		numImmortals: numImmortals?.size ?? 0,
// 		lastModified
// 	};

// 	let buffConfig = calculateBuffConfig(playerData.player);

// 	// Merge with player crew
// 	let ownedCrew = [] as PlayerCrew[];
// 	let unOwnedCrew = [] as PlayerCrew[];

// 	for (let oricrew of allcrew) {
// 		// Create a copy of crew instead of directly modifying the source (allcrew)
// 		let crew = JSON.parse(JSON.stringify(oricrew)) as PlayerCrew;
// 		crew.rarity = crew.max_rarity;
// 		crew.level = 100;
// 		crew.have = false;
// 		crew.equipment = [0, 1, 2, 3];
// 		crew.favorite = false;

// 		if (typeof crew.date_added === 'string') {
// 			crew.date_added = new Date(crew.date_added);
// 		}

// 		if (playerData.player.character.c_stored_immortals?.includes(crew.archetype_id)) {
// 			crew.immortal = CompletionState.Frozen;
// 		} else {
// 			let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
// 			crew.immortal = immortal ? immortal.quantity : CompletionState.NotComplete;
// 		}
// 		if (crew.immortal !== 0) {
// 			crew.have = true;
// 			applyCrewBuffs(crew, buffConfig);
// 			ownedCrew.push(JSON.parse(JSON.stringify(crew)));
// 		}

// 		let inroster = playerData.player.character.crew.filter(c => c.archetype_id === crew.archetype_id);
// 		inroster.forEach(owned => {
// 			crew.rarity = owned.rarity;
// 			crew.base_skills = owned.base_skills;
// 			crew.level = owned.level;
// 			crew.have = true;
// 			crew.favorite = owned.favorite;
// 			crew.equipment = owned.equipment;
// 			if (owned.action) crew.action.bonus_amount = owned.action.bonus_amount;
// 			if (owned.ship_battle) crew.ship_battle = owned.ship_battle;
// 			// Use skills directly from player data when possible
// 			if (owned.skills) {
// 				for (let skill in CONFIG.SKILLS) {
// 					crew[skill] = { core: 0, min: 0, max: 0 } as ComputedBuff;
// 				}
// 				for (let skill in owned.skills) {
// 					crew[skill] = {
// 						core: owned.skills[skill].core,
// 						min: owned.skills[skill].range_min,
// 						max: owned.skills[skill].range_max
// 					} as ComputedBuff;
// 				}
// 			}
// 			// Otherwise apply buffs to base_skills
// 			else {
// 				applyCrewBuffs(crew, buffConfig);
// 			}

// 			crew.immortal = isImmortal(crew) ? CompletionState.Immortalized : CompletionState.NotComplete;
// 			ownedCrew.push(JSON.parse(JSON.stringify(crew)));
// 		});

// 		if (!crew.have) {
// 			// Crew is not immortal or in the active roster
// 			applyCrewBuffs(crew, buffConfig);
// 			// Add a copy to the list
// 			unOwnedCrew.push(JSON.parse(JSON.stringify(crew)));
// 		}
// 		// else {
// 		// 	if (crew.immortal === CompletionState.Immortalized) {
// 		// 		console.log(crew.name + ": Immortalized");
// 		// 	}
// 		// 	else if (crew.immortal === CompletionState.Frozen) {
// 		// 		console.log(crew.name + ": Frozen");
// 		// 	}
// 		// 	else if (crew.immortal > 1) {
// 		// 		console.log(crew.name + ": Frozen (" + crew.immortal + " copies)");
// 		// 	}
// 		// 	else {
// 		// 		console.log(crew.name + ": In Progress (Level " + crew.level + "; " + crew.rarity + " / " + crew.max_rarity + " Stars; " + (crew.equipment?.length ?? 0) + " / 4 Equipment)");
// 		// 	}
// 		// }
// 	}

// 	playerData.player.character.crew = ownedCrew;
// 	playerData.player.character.unOwnedCrew = unOwnedCrew;
// }

export function formatTierLabel(crew: PlayerCrew | CrewMember): string {
	if (!crew.in_portal && crew.obtained === "WebStore") {
		return '$';
	}
	if (!crew.bigbook_tier || crew.bigbook_tier === -1) {
		return 'none';
	}
	return `${crew.bigbook_tier}`;
}

export function getActionFromItem(item?: PlayerCrew | CrewMember | ShipAction | Ship, index?: number) {
	let actionIn: ShipAction;

	if (!item) return undefined;

	if ("bonus_type" in item) {
		actionIn = item;
	}
	else if ("actions" in item) {
		if (!item.actions?.length) return undefined;
		index ??= 0;
		actionIn = item.actions[index];
	}
	else if ("action" in item) {
		if (!item.action) return undefined;
		actionIn = item.action;
	}
	else {
		return undefined;
	}

	return actionIn;
}

export function getShipBonus(item?: PlayerCrew | CrewMember | ShipAction | Ship, index?: number): string {
	if (!item) return "";
	let actionIn = getActionFromItem(item, index);
	if (!actionIn) return "";
	const action = actionIn;
	if (!action || !action.ability) return "";
	let bonusText = CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[action.ability.type];
	if (action.ability.type === 0)
		bonusText = bonusText.replace('bonus boost by', `${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[action.bonus_type]} boost to`);
	const bonusVal = action.ability.type === 0
		? action.bonus_amount+action.ability.amount
		: action.ability.amount;
	bonusText = bonusText?.replace('%VAL%', `${bonusVal}`);
	return bonusText;
}

export function getShipChargePhases(item?: PlayerCrew | CrewMember | ShipAction | Ship, index?: number): string[] {
	const phases = [] as string[];
	let charge_time = 0;

	if (!item) return phases;
	let actionIn = getActionFromItem(item, index);
	if (!actionIn) return phases;

	const action = actionIn;

	if (!action || !action.charge_phases) return phases;
	action.charge_phases.forEach(cp => {
		charge_time += cp.charge_time;
		let phaseDescription = `After ${charge_time}s`;

		if (cp.ability_amount && action?.ability) {
			phaseDescription += ', '+CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[action.ability.type].replace('%VAL%', `${cp.ability_amount}`);
		}

		if (cp.bonus_amount) {
			phaseDescription += `, +${cp.bonus_amount} to ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[action.bonus_type]}`;
		}

		if (cp.duration) {
			phaseDescription += `, +${cp.duration-action.duration}s duration`;
		}

		if (cp.cooldown) {
			phaseDescription += `, +${cp.cooldown-action.cooldown}s cooldown`;
		}

		phases.push(phaseDescription);
	});
	return phases;
}

export function gradeToColor(grade: string | number): string | null {
	switch(grade) {
		case "A":
		case "A-":
		case "A+":
		case 1:
		case 2:
			return "lightgreen";

		case "B":
		case "B-":
		case "B+":
		case 3:
		case 4:
			return "aquamarine";

		case "C":
		case "C-":
		case "C+":
		case 5:
		case 6:
			return "yellow";

		case "D":
		case "D-":
		case "D+":
		case 7:
		case 8:
			return "orange";

		case "E":
		case "E-":
		case "E+":
		case 9:
		case 10:
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

export function getVariantTraits(crew: PlayerCrew | CrewMember): string[] {
	const series = ['tos', 'tas', 'tng', 'ds9', 'voy', 'ent', 'dsc', 'pic', 'low', 'snw'];
	const ignore = [
		'female', 'male',
		'artificial_life', 'nonhuman', 'organic', 'species_8472',
		'admiral', 'captain', 'commander', 'lieutenant_commander', 'lieutenant', 'ensign', 'general', 'nagus', 'first_officer',
		'ageofsail', 'bridge_crew', 'evsuit', 'gauntlet_jackpot', 'mirror', 'niners', 'original', 'crewman',
		'crew_max_rarity_5', 'crew_max_rarity_4', 'crew_max_rarity_3', 'crew_max_rarity_2', 'crew_max_rarity_1'
	];
	const ignoreRe = [
		/^exclusive_/,		/* exclusive_ crew, e.g. bridge, collection, fusion, gauntlet, honorhall, voyage */
		/^[a-z]{3}\d{4}$/	/* mega crew, e.g. feb2023 and apr2023 */
	];
	const variantTraits = [] as string[];
	crew.traits_hidden.forEach(trait => {
		if (!series.includes(trait) && !ignore.includes(trait) && !ignoreRe.reduce((prev, curr) => prev || curr.test(trait), false)) {
			variantTraits.push(trait);
		}
	});
	return variantTraits;
}

/**
 * Navigate to the crew page, sending over information about owned variants and fusables.
 * Any missing information is simply ignored.
 * @param crew The crew member to navigate to
 * @param ownedCrew Your owned crew
 * @param buffs Your active buffs
 * @param allCrew All crew
 */
export function navToCrewPage(crew: PlayerCrew | CrewMember, ownedCrew: (CrewMember | PlayerCrew)[] | undefined = undefined, buffs: BuffStatTable | undefined = undefined, allCrew: (CrewMember | PlayerCrew)[] | undefined = undefined) {
	// let stash = TinyStore.getStore('staticStash', false, true);	
	
	// if (stash) {
	// 	if (ownedCrew) {
	// 		let variantTraits = getVariantTraits(crew);
	// 		if (variantTraits && variantTraits.length >= 1) {
	// 			let filteredOwnedCrew = ownedCrew.filter(item => item.traits_hidden.some(trait => variantTraits.includes(trait)))
	// 			let finalResult = [ ...filteredOwnedCrew ];
	// 			let filteredAllCrew = allCrew?.filter(item => item.traits_hidden.some(trait => variantTraits.includes(trait)))

	// 			// We're going to iterate, once, into the variants
	// 			// because some of them are fusion crew, and we want to capture those, too,
	// 			// because if they keep navigating to variants in the crew page, we'd
	// 			// like to give them as far to go as possible without losing state data.
	// 			// Since they can only navigate either back to crew tools or on to other variants from the
	// 			// crew page, this covers all bases.

	// 			for (let post of filteredOwnedCrew) {
	// 				let traits2 = getVariantTraits(post);
	// 				let ownedfiltered2 = ownedCrew.filter(item => item.traits_hidden.some(trait => traits2.includes(trait)))
	// 				let allfiltered2 = allCrew?.filter(item => item.traits_hidden.some(trait => traits2.includes(trait)))

	// 				for (let varItem of ownedfiltered2 ?? []) {
	// 					if (!finalResult.some(tItem => tItem.symbol === varItem.symbol)) {
	// 						finalResult.push(varItem);
	// 					}
	// 				}

	// 				for (let varItem of allfiltered2 ?? []) {
	// 					if (!finalResult.some(tItem => tItem.symbol === varItem.symbol)) {
	// 						finalResult.push(varItem);
	// 					}
	// 				}
	// 			}

	// 			if (filteredAllCrew) {
	// 				for (let post of filteredAllCrew) {
	// 					let traits2 = getVariantTraits(post);
	// 					let ownedfiltered2 = ownedCrew.filter(item => item.traits_hidden.some(trait => traits2.includes(trait)))
	// 					let allfiltered2 = allCrew?.filter(item => item.traits_hidden.some(trait => traits2.includes(trait)))

	// 					for (let varItem of ownedfiltered2 ?? []) {
	// 						if (!finalResult.some(tItem => tItem.symbol === varItem.symbol)) {
	// 							finalResult.push(varItem);
	// 						}
	// 					}
	// 					for (let varItem of allfiltered2 ?? []) {
	// 						if (!finalResult.some(tItem => tItem.symbol === varItem.symbol)) {
	// 							finalResult.push(varItem);
	// 						}
	// 					}
	// 				}
	// 			}

	// 			console.log(finalResult);
	// 			stash.setValue('owned', finalResult);
	// 		}
	// 	}
	// 	if (buffs) {
	// 		stash.setValue('buffs', buffs);
	// 	}
	// }

	navigate('/crew/' + crew.symbol);
}

export function printImmoText(immo: number | CompletionState, item?: string, immoText?: string) {
	item ??= "Crew";
	immoText ??= "Immortalized";

	if (immo === -1) return `${item} Is ${immoText}`;
	else if (immo === -5) return `${item} Is Shown ${immoText} (No Player Data)`;
	else if (immo === -3) return `${item} Is Shown ${immoText} (Unowned)`;
	else if (immo === -4) return `${item} Is Shown ${immoText} (Owned)`;
	else if (immo === -2) return `${item} Is Shown ${immoText}`;
	else if (immo >= 1) return `${item} Is Frozen (` + (immo === 1 ? "1 copy" : immo.toString() + " copies") + ")";
	else return `${item} Is Not ${immoText}`;
}

export function getSkills(item: PlayerCrew | CrewMember | CompactCrew | BaseSkills): string[] {
	let sk: string[] = [];

	let bskills: BaseSkills | undefined = undefined;

	if ("symbol" in item) {
		bskills = item.base_skills;
	}
	else {
		bskills = item;
	}

	if (bskills?.command_skill !== undefined && bskills.command_skill.core > 0) sk.push("command_skill");
	if (bskills?.science_skill !== undefined && bskills.science_skill.core > 0) sk.push("science_skill");
	if (bskills?.security_skill !== undefined && bskills.security_skill.core > 0) sk.push("security_skill");
	if (bskills?.engineering_skill !== undefined && bskills.engineering_skill.core > 0) sk.push("engineering_skill");
	if (bskills?.diplomacy_skill !== undefined && bskills.diplomacy_skill.core > 0) sk.push("diplomacy_skill");
	if (bskills?.medicine_skill !== undefined && bskills.medicine_skill.core > 0) sk.push("medicine_skill");
	return sk;
}



export interface AbilityRanking {
	ability: Ability;
	rank: number;
	crew_symbols: string[];
	init: number;
	duration?: number;
	cooldown?: number;
	charge_phases?: ChargePhase[];
}

export interface BonusRanking {
	bonus: number;
	type: number;
	crew_symbols: string[];
	rank: number;
	init: number;
	duration?: number;
	cooldown?: number;
}

export interface CrewShipRankings {
	abilities: AbilityRanking[];
	bonuses: BonusRanking[];
}

export interface ActionRanking {
    action: ShipAction;
    rank?: number;
    crew_symbols?: string[];
}

function compCharge(a: ChargePhase, b: ChargePhase) {
	let r: number = 0;

	if (a.ability_amount && b.ability_amount) {
		r = b.ability_amount - a.ability_amount;
		if (r) return r;
	}

	if (a.bonus_amount && b.bonus_amount) {
		r = b.bonus_amount - a.bonus_amount;
		if (r) return r;
	}

	if (a.charge_time != b.charge_time) {
		return a.charge_time - b.charge_time;
	}

	if (a.duration && b.duration){
		r = b.duration - a.duration;
		if (r) return r;
	}

	if (a.cooldown && b.cooldown) {
		r = a.cooldown - b.cooldown;
	}

	return r;
}

function compChargeArray(cp1: ChargePhase[] | undefined, cp2: ChargePhase[] | undefined) {

	if (!cp1 && !cp2) return 0;
	else if (cp1 && !cp2) return 1;
	else if (!cp1 && cp2) return -1;
	else if (cp1 && cp2) {
		if (cp1.length > cp2.length) return 1;
		else if (cp1.length < cp2.length) return -1;
		else {
			let c = cp1.length;
			for (let i = 0; i < c; i++) {
				let x = compCharge(cp1[i], cp2[i]);
				if (x) return x;
			}
		}
	}

	return 0;
}

export const shipStatSortConfig: ObjectNumberSortConfig = {
    props: [
        {
            props: "action/ability/condition",
            direction: 'ascending',
            nullDirection: 'descending',
        },
        {
            props: "action/ability/amount",
            direction: 'descending',
            nullDirection: 'descending',
        },
        {
            props: "action/bonus_amount",
            direction: 'descending',
            nullDirection: 'descending',
        },
        {
            props: "action/initial_cooldown",
            direction: 'ascending',
            nullDirection: 'descending',
        },
        {
            props: "action/duration",
            direction: 'descending',
            nullDirection: 'descending',
        },
        {
            props: "action/limit",
            direction: 'descending',
            nullDirection: 'ascending',
        },
        {
            props: "action/penalty/amount",
            direction: 'ascending',
            nullDirection: 'ascending',
        },
        {
            props: "ship_battle/crit_bonus",
            direction: 'descending',
            nullDirection: 'descending',
        },
        {
            props: "ship_battle/crit_chance",
            direction: 'descending',
            nullDirection: 'descending',
        },
        {
            props: "ship_battle/accuracy",
            direction: 'descending',
            nullDirection: 'descending',
        },
        {
            props: "ship_battle/evasion",
            direction: 'descending',
            nullDirection: 'descending',
        },
        {
            props: "action/ability/type",
            direction: 'ascending',
            nullDirection: 'descending',
        },
        {
            props: "action/bonus_type",
            direction: 'ascending',
            nullDirection: 'descending',
        },
        {
            props: "action/status",
            direction: 'ascending',
            nullDirection: 'descending',
        },
        {
            props: "action/penalty/type",
            direction: 'ascending',
            nullDirection: 'descending',
        },
        {
            props: "action/charge_phases",
			customComp: compChargeArray
        },
    ]
}

export interface ShipSkillRanking {
	type: number;
	rank: number;
	value: number;
	crew_symbols: string[];
	key: string;
}

/**
 * Map the master ability rankings map to a rankings array
 * @param map The ability map
 * @param abilities Optional specific abilities to return
 * @returns An array sorted by rank ascending.
 */
export function mapToRankings(map: { [key: string]: { [key: string]: (PlayerCrew | CrewMember)[] }}, abilities?: number[] | number): ShipSkillRanking[] {
	let result = [] as ShipSkillRanking[];
	let ableSet = [] as number[];

	if (typeof abilities === 'number') {
		ableSet.push(abilities);
	}
	else if (abilities !== undefined) {
		ableSet = [...abilities];
	}
	else {
		ableSet = Object.keys(map).map(key => Number.parseInt(key));
	}

	for (var ability of ableSet) {
		let currmap = map[ability];
		if (currmap) {
			for (var stat in currmap) {
				let value = Number.parseInt(stat);
				let actions = currmap[stat];
				if (actions) {
					result.push({
						rank: 0,
						type: ability,
						value: value,
						crew_symbols: actions.map(action => action.symbol),
						key: `${ability}_${value}`
					});
				}
			}
		}
	}

	result.sort((a, b) => {
		let r = b.value - a.value;
		if (!r) r = a.type - b.type;
		return r;
	});

	let ranks = {} as { [key: string]: number };

	for (let res of result) {
		if (`${res.type}` in ranks) {
			ranks[`${res.type}`]++;
		}
		else {
			ranks[`${res.type}`] = 1;
		}
		res.rank = ranks[res.type];
	}

	result.sort((a, b) => {
		let r = a.rank - b.rank;
		if (!r) r = b.value - a.value;
		if (!r) r = a.type - b.type;
		return r;
	});

	return result;
}

export interface ShipStatMap { [key: string]: { [key: string]: (PlayerCrew | CrewMember)[] }}

/**
 * Sort the crew according to the preferences map and return the crew broken down into tiers such
 * that each action is mapped to an ability amount, which is in turn mapped to the ability.
 * @param allCrew All crew you wish to sort.
 * @param config The optional configuration file to use. Default settings are used, otherwise.
 * @returns
 */
export function createShipStatMap(allCrew: (CrewMember | PlayerCrew)[], config?: ObjectNumberSortConfig): ShipStatMap {
	let sc = new StatsSorter({ objectConfig: config ?? shipStatSortConfig });
	let actions = allCrew;

	let types = sc.groupBy(actions, "action/ability/type", "no_ability");
	// Create the tiers...

	let tiers = {} as { [key: string]: { [key: string]: (PlayerCrew | CrewMember)[] }};
	for (let key of Object.keys(types)) {
		if (!(key in types) || types[key] === undefined) continue;
		else {
			tiers[key] = sc.groupBy(types[key], "action/ability/amount");
		}
	}
	if ("no_ability" in types && types["no_ability"] !== undefined) {
		tiers["no_ability"] = sc.groupBy(types["no_ability"], "action/bonus_amount");
	}
	return tiers ?? {};
}


