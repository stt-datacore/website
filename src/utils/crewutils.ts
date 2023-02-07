import { simplejson2csv, ExportField } from './misc';
import { calculateBuffConfig } from './voyageutils';

import CONFIG from '../components/CONFIG';

export function exportCrewFields(): ExportField[] {
	return [
		{
			label: 'Name',
			value: (row: any) => row.name
		},
		{
			label: 'Have',
			value: (row: any) => row.have
		},
		{
			label: 'Short name',
			value: (row: any) => row.short_name
		},
		{
			label: 'Max rarity',
			value: (row: any) => row.max_rarity
		},
		{
			label: 'Rarity',
			value: (row: any) => row.rarity
		},
		{
			label: 'Level',
			value: (row: any) => row.level
		},
		{
			label: 'Immortal',
			value: (row: any) => row.immortal
		},
		{
			label: 'Equipment',
			value: (row: any) => row.equipment.join(' ')
		},
		{
			label: 'Tier',
			value: (row: any) => row.bigbook_tier
		},
		{
			label: 'In portal',
			value: (row: any) => (row.in_portal === undefined ? 'N/A' : row.in_portal)
		},
		{
			label: 'Collections',
			value: (row: any) => row.collections.map(c => c.replace(/,/g, '')).join(', ')
		},
		{
			label: 'Voyage rank',
			value: (row: any) => row.ranks.voyRank
		},
		{
			label: 'Gauntlet rank',
			value: (row: any) => row.ranks.gauntletRank
		},
		{
			label: 'Command core',
			value: (row: any) => row.command_skill.core
		},
		{
			label: 'Command min',
			value: (row: any) => row.command_skill.min
		},
		{
			label: 'Command max',
			value: (row: any) => row.command_skill.max
		},
		{
			label: 'Diplomacy core',
			value: (row: any) => row.diplomacy_skill.core
		},
		{
			label: 'Diplomacy min',
			value: (row: any) => row.diplomacy_skill.min
		},
		{
			label: 'Diplomacy max',
			value: (row: any) => row.diplomacy_skill.max
		},
		{
			label: 'Engineering core',
			value: (row: any) => row.engineering_skill.core
		},
		{
			label: 'Engineering min',
			value: (row: any) => row.engineering_skill.min
		},
		{
			label: 'Engineering max',
			value: (row: any) => row.engineering_skill.max
		},
		{
			label: 'Medicine core',
			value: (row: any) => row.medicine_skill.core
		},
		{
			label: 'Medicine min',
			value: (row: any) => row.medicine_skill.min
		},
		{
			label: 'Medicine max',
			value: (row: any) => row.medicine_skill.max
		},
		{
			label: 'Science core',
			value: (row: any) => row.science_skill.core
		},
		{
			label: 'Science min',
			value: (row: any) => row.science_skill.min
		},
		{
			label: 'Science max',
			value: (row: any) => row.science_skill.max
		},
		{
			label: 'Security core',
			value: (row: any) => row.security_skill.core
		},
		{
			label: 'Security min',
			value: (row: any) => row.security_skill.min
		},
		{
			label: 'Security max',
			value: (row: any) => row.security_skill.max
		},
		{
			label: 'Traits',
			value: (row: any) => row.traits_named.concat(row.traits_hidden)
		},
		{
			label: 'Action name',
			value: (row: any) => row.action.name
		},
		{
			label: 'Boosts',
			value: (row: any) => CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[row.action.bonus_type]
		},
		{
			label: 'Amount',
			value: (row: any) => row.action.bonus_amount
		},
		{
			label: 'Initialize',
			value: (row: any) => row.action.initial_cooldown
		},
		{
			label: 'Duration',
			value: (row: any) => row.action.duration
		},
		{
			label: 'Cooldown',
			value: (row: any) => row.action.cooldown
		},
		{
			label: 'Bonus Ability',
			value: (row: any) =>
				(row.action.ability ? getShipBonus(row) : '')
		},
		{
			label: 'Trigger',
			value: (row: any) =>
				(row.action.ability ? CONFIG.CREW_SHIP_BATTLE_TRIGGER[row.action.ability.condition] : '')
		},
		{
			label: 'Uses per Battle',
			value: (row: any) => row.action.limit || ''
		},
		{
			label: 'Handicap Type',
			value: (row: any) => (row.action.penalty ? CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[row.action.penalty.type] : '')
		},
		{
			label: 'Handicap Amount',
			value: (row: any) => (row.action.penalty ? row.action.penalty.amount : '')
		},
		{
			label: 'Accuracy',
			value: (row: any) => row.ship_battle.accuracy || ''
		},
		{
			label: 'Crit Bonus',
			value: (row: any) => row.ship_battle.crit_bonus || ''
		},
		{
			label: 'Crit Rating',
			value: (row: any) => row.ship_battle.crit_chance || ''
		},
		{
			label: 'Evasion',
			value: (row: any) => row.ship_battle.evasion || ''
		},
		{
			label: 'Charge Phases',
			value: (row: any) => (row.action.charge_phases ? getShipChargePhases(row).join('; ') : '')
		},
		{
			label: 'Symbol',
			value: (row: any) => row.symbol
		}
	];
}

export function exportCrew(crew, delimeter = ','): string {
	return simplejson2csv(crew, exportCrewFields(), delimeter);
}

export function applyCrewBuffs(crew: any, buffConfig: any) {
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

export function downloadData(dataUrl, name: string) {
	let pom = document.createElement('a');
	pom.setAttribute('href', dataUrl);
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
            downloadData(e.target.result, filename);
        };
        a.readAsDataURL(text);
    }
}

export function prepareProfileData(allcrew, playerData, lastModified) {
	let numImmortals = new Set(playerData.player.character.c_stored_immortals);

	playerData.player.character.stored_immortals.map(si => si.id).forEach(item => numImmortals.add(item));

	playerData.player.character.crew.forEach(crew => {
		if (crew.level === 100 && crew.equipment.length === 4) {
			numImmortals.add(crew.archetype_id);
		}
	});

	playerData.calc = {
		numImmortals: numImmortals.size,
		lastModified
	};

	let buffConfig = calculateBuffConfig(playerData.player);

	// Merge with player crew
	let ownedCrew = [];
	let unOwnedCrew = [];
	for (let oricrew of allcrew) {
		// Create a copy of crew instead of directly modifying the source (allcrew)
		let crew = JSON.parse(JSON.stringify(oricrew));
		crew.rarity = crew.max_rarity;
		crew.level = 100;
		crew.have = false;
		crew.equipment = [0, 1, 2, 3];
		crew.favorite = false;

		if (playerData.player.character.c_stored_immortals.includes(crew.archetype_id)) {
			crew.immortal = 1;
		} else {
			let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
			crew.immortal = immortal ? immortal.quantity : 0;
		}
		if (crew.immortal > 0) {
			crew.have = true;
			applyCrewBuffs(crew, buffConfig);
			ownedCrew.push(JSON.parse(JSON.stringify(crew)));
		}

		let inroster = playerData.player.character.crew.filter(c => c.archetype_id === crew.archetype_id);
		inroster.forEach(owned => {
			crew.immortal = 0;
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
			ownedCrew.push(JSON.parse(JSON.stringify(crew)));
		});

		if (!crew.have) {
			// Crew is not immortal or in the active roster
			applyCrewBuffs(crew, buffConfig);
			// Add a copy to the list
			unOwnedCrew.push(JSON.parse(JSON.stringify(crew)));
		}
	}

	playerData.player.character.crew = ownedCrew;
	playerData.player.character.unOwnedCrew = unOwnedCrew;
}

export function formatTierLabel(crew) {
	if (!crew.in_portal && crew.obtained === "WebStore") {
		return '$';
	}
	if (!crew.bigbook_tier || crew.bigbook_tier === -1) {
		return 'none';
	}
	return `${crew.bigbook_tier}`;
}

export function getShipBonus(crew: any): string {
	let bonusText = CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type];
	if (crew.action.ability.type === 0)
		bonusText = bonusText.replace('bonus boost by', `${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]} boost to`);
	const bonusVal = crew.action.ability.type === 0
		? crew.action.bonus_amount+crew.action.ability.amount
		: crew.action.ability.amount;
	bonusText = bonusText.replace('%VAL%', bonusVal);
	return bonusText;
}

export function getShipChargePhases(crew: any): string[] {
	const phases = [];
	let charge_time = 0;
	crew.action.charge_phases.forEach(cp => {
		charge_time += cp.charge_time;
		let phaseDescription = `After ${charge_time}s`;

		if (cp.ability_amount) {
			phaseDescription += ', '+CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', cp.ability_amount);
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
