import { simplejson2csv, ExportField } from './misc';
import { BuffStatTable, calculateBuffConfig } from './voyageutils';

import CONFIG from '../components/CONFIG';
import { CompactCrew, CompletionState, GauntletPairScore, Player, PlayerCrew, PlayerData } from '../model/player';
import { BaseSkills, ComputedSkill, CrewMember, PlayerSkill, Skill } from '../model/crew';
import { Ability, ChargePhase, Ship, ShipAction } from '../model/ship';
import { ObjectNumberSortConfig, StatsSorter } from './statssorter';
//import { navigate } from 'gatsby';
import { ItemBonusInfo, ItemWithBonus } from './itemutils';
import { EquipmentItem } from '../model/equipment';
import { calcQLots } from './equipment';

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

export function applyCrewBuffs(crew: PlayerCrew | CrewMember, buffConfig: BuffStatTable, nowrite?: boolean, itemBonuses?: ItemBonusInfo[]) {
	if (!buffConfig) return;
	const getMultiplier = (skill: string, stat: string) => {
		if (!(`${skill}_${stat}` in buffConfig)) return 0;
		return buffConfig[`${skill}_${stat}`].multiplier + buffConfig[`${skill}_${stat}`].percent_increase;
	};

	for (let skill in CONFIG.SKILLS) {
		crew[skill] = { core: 0, min: 0, max: 0 };
	}
	let bs = {} as BaseSkills;
	let askills = [] as string[];
	// Apply buffs
	for (let skill in crew.base_skills) {
		let core = 0;
		let min = 0;
		let max = 0;

		core = Math.round(crew.base_skills[skill].core * getMultiplier(skill, 'core'));
		min = Math.round(crew.base_skills[skill].range_min * getMultiplier(skill, 'range_min'));
		max = Math.round(crew.base_skills[skill].range_max * getMultiplier(skill, 'range_max'));

		if (itemBonuses?.length) {
			itemBonuses.filter(f => skill in f.bonuses).forEach((bonus) => {
				core += bonus.bonuses[skill].core ?? 0;
				min += bonus.bonuses[skill].range_min ?? 0;
				max += bonus.bonuses[skill].range_max ?? 0;
			});
			askills.push(skill);
		}

		if (nowrite !== true) {
			crew[skill] = {
				core: core,
				min: min,
				max: max
			};
		}
		bs[skill] = {
			core: core,
			range_min: min,
			range_max: max
		};
	}

	return bs;
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

export const PREPARE_MAX_RARITY = 6;

export function isQuipped<T extends PlayerCrew>(crew: T) {
	if (!!crew.kwipment?.length && !!crew.kwipment[0]) {
		if (typeof crew.kwipment[0] === 'number') {
			return crew.kwipment.some(k => !!k);
		}
		else {
			return crew.kwipment.some(k => !!k[1]);
		}
	}
	else {
		return false;
	}
}

export function prepareOne(origCrew: CrewMember | PlayerCrew, playerData?: PlayerData, buffConfig?: BuffStatTable, rarity?: number, quipment?: ItemWithBonus[]): PlayerCrew[] {
	// Create a copy of crew instead of directly modifying the source (allcrew)
	let templateCrew = JSON.parse(JSON.stringify(origCrew)) as PlayerCrew;
	let outputcrew = [] as PlayerCrew[];

	if (origCrew.symbol === 'torres_injured_crew') {
		console.log("break");
	}
	if (buffConfig && !Object.keys(buffConfig)?.length) buffConfig = undefined;

	if ("prospect" in origCrew && origCrew.prospect && origCrew.rarity) {
		templateCrew.rarity = origCrew.rarity;
		templateCrew.prospect = origCrew.prospect;
	}
	else {
		templateCrew.rarity = templateCrew.max_rarity;
	}

	templateCrew.level = 100;
	templateCrew.have = false;
	templateCrew.equipment = [0, 1, 2, 3];
	templateCrew.favorite = false;
	templateCrew.action.cycle_time = templateCrew.action.cooldown + templateCrew.action.duration;
	templateCrew.events ??= 0;
	templateCrew.obtained ??= "Unknown";

	let inroster = [] as PlayerCrew[];

	let crew = templateCrew;

	if (playerData?.player?.character) {

		if (playerData.player.character.c_stored_immortals?.includes(crew.archetype_id)) {
			crew = JSON.parse(JSON.stringify(templateCrew));
			crew.immortal = CompletionState.Frozen;
		}
		else {
			let immortal = playerData.player.character.stored_immortals.find(im => im.id === crew.archetype_id);
			if (immortal) {
				crew = JSON.parse(JSON.stringify(templateCrew));
				crew.immortal = immortal.quantity;
			}
			else {
				crew.immortal = CompletionState.NotComplete;
			}
		}

		if (crew.immortal !== 0) {
			if (buffConfig) applyCrewBuffs(crew, buffConfig);
			crew.have = true;
		}
		if (crew.immortal > 0) {
			crew.highest_owned_rarity = crew.max_rarity ?? crew.rarity;
			crew.highest_owned_level = crew.max_level ?? 100;
			crew.q_bits = 0;
			crew.kwipment = [0, 0, 0, 0];
			crew.kwipment_expiration = [0, 0, 0, 0];
			inroster.push(crew);
			crew = templateCrew;
		}
	}

	inroster = inroster.concat(playerData?.player?.character?.crew?.filter(c => (c.immortal <= 0 || c.immortal === undefined) && c.archetype_id === crew.archetype_id) ?? []);

	const maxxed = {
		maxowned: crew.highest_owned_rarity as number | undefined,
		maxlevel: crew.highest_owned_level as number | undefined
	};

	for (let owned of inroster ?? []) {
		if (!maxxed.maxowned || owned.rarity > maxxed.maxowned) maxxed.maxowned = owned.rarity;
		if (!maxxed.maxlevel || owned.level > maxxed.maxlevel) maxxed.maxlevel = owned.level;
		if (inroster.length > 1) {
			crew = JSON.parse(JSON.stringify(templateCrew));
		}
		let workitem: PlayerCrew = owned;

		crew.id = owned.id;
		crew.expires_in = owned.expires_in;

		if (workitem.immortal > 0) crew.immortal = workitem.immortal;
		if (rarity !== 6) {
			crew.rarity = workitem.rarity;
			crew.base_skills = workitem.base_skills;
			if (rarity === undefined) crew.level = workitem.level;
			crew.equipment = workitem.equipment;
			crew.q_bits = workitem.q_bits ?? 0;
			crew.kwipment_slots = workitem.kwipment_slots;
			crew.kwipment = [0, 0, 0, 0];
			crew.kwipment_expiration = [0, 0, 0, 0];

			if (workitem.kwipment?.length) {
				if (workitem.kwipment?.length && workitem.kwipment[0] && typeof workitem.kwipment[0] !== 'number') {
					for (let nums of workitem.kwipment as number[][]) {
						crew.kwipment[nums[0]] = nums[1];
					}
					for (let nums of workitem.kwipment_expiration as number[][]) {
						crew.kwipment_expiration[nums[0]] = nums[1];
					}
				}
				else if (workitem.kwipment?.length) {
					crew.kwipment = workitem.kwipment;
					crew.kwipment_expiration = workitem.kwipment_expiration;
				}
			}

			if (workitem.ship_battle && rarity === undefined) crew.ship_battle = workitem.ship_battle;

			if (typeof rarity === 'number') {
				crew.action.bonus_amount -= (crew.max_rarity - rarity);
			}
			else if (workitem.action) {
				crew.action.bonus_amount = workitem.action.bonus_amount;
			}
		}

		crew.have = true;
		crew.favorite = workitem.favorite;

		// Use skills directly from player data when possible
		if (rarity && rarity >= 1 && rarity <= 5) {
			crew.rarity = rarity;
			rarity--;
			for (let skill in CONFIG.SKILLS) {
				crew[skill] = { core: 0, min: 0, max: 0 } as ComputedSkill;
			}
			for (let skill of Object.keys(workitem.skill_data[rarity].base_skills)) {

				crew[skill] = {
					core: workitem.skill_data[rarity].base_skills[skill].core,
					min: workitem.skill_data[rarity].base_skills[skill].range_min,
					max: workitem.skill_data[rarity].base_skills[skill].range_max
				} as ComputedSkill;
			}
			crew.base_skills = workitem.skill_data[rarity].base_skills;
		}
		else if (workitem.skills && rarity !== PREPARE_MAX_RARITY) {
			for (let skill in CONFIG.SKILLS) {
				crew[skill] = { core: 0, min: 0, max: 0 } as ComputedSkill;
			}

			// Override computed buffs because of mismatch with game data
			for (let skill in workitem.skills) {
				crew[skill] = {
					core: workitem.skills[skill].core,
					min: workitem.skills[skill].range_min,
					max: workitem.skills[skill].range_max
				} as ComputedSkill;
			}
			crew.skills = workitem.skills;
		}
		// Otherwise apply buffs to base_skills
		else if (buffConfig) {
			applyCrewBuffs(crew, buffConfig);
		}

		if (rarity !== PREPARE_MAX_RARITY) {
			if (crew.immortal <= 0 || crew.immortal === undefined) {
				crew.immortal = isImmortal(crew) ? CompletionState.Immortalized : CompletionState.NotComplete;
			}
		}
		else {
			let ismo = isImmortal(owned);
			crew.immortal = ismo ? CompletionState.Immortalized : CompletionState.DisplayAsImmortalOwned;
		}

		if (rarity && crew.equipment?.length !== 4) {
			crew.equipment = [0, 1, 2, 3];
		}
		outputcrew.push(oneCrewCopy(crew));
	}

	if (!crew.have) {
		if ((crew.immortal <= 0 || crew.immortal === undefined) && rarity && rarity < crew.max_rarity && rarity > 0) {
			if (rarity) {
				crew.action.bonus_amount -= (crew.max_rarity - rarity);
				rarity--;
			}
			crew = oneCrewCopy({ ...JSON.parse(JSON.stringify(crew)), ...JSON.parse(JSON.stringify(crew.skill_data[rarity])) });
		}
		if (!crew.have) {
			if (buffConfig) applyCrewBuffs(crew, buffConfig);
			crew.immortal = playerData?.player?.character?.crew?.length ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
		}
		if (rarity && !crew.equipment?.length) {
			crew.equipment = [0, 1, 2, 3];
		}
		outputcrew.push(crew);
	}

	if (crew.immortal === undefined) {
		crew.immortal = playerData ? CompletionState.DisplayAsImmortalUnowned : CompletionState.DisplayAsImmortalStatic;
	}

	outputcrew.forEach(f => {
		f.highest_owned_rarity = maxxed.maxowned;
		f.highest_owned_level = maxxed.maxlevel;
		//if (quipment) calcQLots(f, quipment, buffConfig, !f.have);
	});

	return outputcrew;
}

export function prepareProfileData(caller: string, allcrew: CrewMember[], playerData: PlayerData, lastModified: Date, quipment?: ItemWithBonus[]) {
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
	let cidx = -1;

	for (let c of allcrew) {
		for (let crew of prepareOne(c, playerData, buffConfig, undefined, quipment)) {
			if (crew.have) {
				if (!crew.id) {
					crew.id = cidx--;
				}
				c["highest_owned_rarity"] = crew.highest_owned_rarity;
				c["highest_owned_level"] = crew.highest_owned_level;
				ownedCrew.push(crew);
			}
			else {
				crew.id = crew.archetype_id;
				unOwnedCrew.push(crew);
			}
		}
	}

	playerData.stripped = false;
	playerData.player.character.crew = ownedCrew;
	playerData.player.character.unOwnedCrew = unOwnedCrew;
}

/**
 * Make a deep copy of an array of any crew type, while also ensuring Date objects for date_added.
 * @param crew The crew array to copy
 * @returns A deep copy an array of crew with Date objects ensured
 */
export function crewCopy<T extends CrewMember>(crew: T[]): T[] {
	let result = JSON.parse(JSON.stringify(crew)) as T[];
	for (let item of result) {
		if (typeof item.date_added === 'string') {
			item.date_added = new Date(item.date_added);
		}
	}

	return result;
}


/**
 * Make a deep copy of any crew type, while also ensuring Date object for date_added.
 * @param crew The crew array to copy
 * @returns A deep copy of a single crew with Date objects ensured
 */
export function oneCrewCopy<T extends CrewMember>(crew: T): T {
	let result = JSON.parse(JSON.stringify(crew)) as T;
	if (typeof crew.date_added === 'string') {
		crew.date_added = new Date(crew.date_added);
	}

	return result;
}

// export function averagePairs(skills: Skill[][]) {

// 	let avg = [] as Skill[];
// 	[0, 1].forEach(i => {
// 		avg.push({
// 			core: 0,
// 			range_max: 0,
// 			range_min: 0
// 		})
// 	});

// 	for (let pair of skills) {
// 		avg[0].core += pair[0].core;
// 		avg[0].range_min += pair[0].range_max;
// 		avg[0].range_max += pair[0].range_max;
// 		if (pair[1]) {
// 			avg[1].core += pair[1].core;
// 			avg[1].range_min += pair[1].range_max;
// 			avg[1].range_max += pair[1].range_max;
// 		}
// 	}
// 	let sl = skills.length;

// 	avg[0].core = Math.round(avg[0].core / sl);
// 	avg[0].range_max = Math.round(avg[0].range_max / sl);
// 	avg[0].range_min = Math.round(avg[0].range_min / sl);

// 	avg[1].core = Math.round(avg[1].core / sl);
// 	avg[1].range_max = Math.round(avg[1].range_max / sl);
// 	avg[1].range_min = Math.round(avg[1].range_min / sl);

// 	return avg;
// }


export function updatePairScore(crew: PlayerCrew, pairScore: GauntletPairScore) {
	let skills = pairScore.pair.map(p => p.skill ?? "").sort();
	crew.pairScores ??= [];

	for (let cp of crew.pairScores) {
		let skills2 = cp.pair.map(p => p.skill ?? "").sort();
		if (skills.join() === skills2.join()) {
			cp.pair = [...pairScore.pair];
			cp.score = pairScore.score;
			return;
		}
	}

	crew.pairScores.push({ ...pairScore, pair: [...pairScore.pair] });
}

export function getCrewPairScore(crew: PlayerCrew, pair: string) {
	pair = (pair.startsWith("G_") ? pair.slice(2) : pair).replace("/", "_");
	let vp = pair.split("_").map(pp => (shortToSkill(pp))).sort();
	for (let cp of crew.pairScores ?? []) {
		let skills2 = cp.pair.map(p => p.skill ?? "").sort();
		if (skills2.join() === vp.join()) {
			return cp;
		}
	}
	return null;
}

export function getPairScore(scores: GauntletPairScore[], pair: string) {
	pair = (pair.startsWith("G_") ? pair.slice(2) : pair).replace("/", "_");
	let vp = pair.split("_").map(pp => (shortToSkill(pp))).sort();
	for (let cp of scores ?? []) {
		let skills2 = cp.pair.map(p => p.skill ?? "").sort();
		if (skills2.join() === vp.join()) {
			return cp;
		}
	}
	return null;
}


export function shortToSkill(rank: string): PlayerSkill | undefined {
	if (rank === "CMD") return "command_skill";
	else if (rank === "SEC") return "security_skill";
	else if (rank === "DIP") return "diplomacy_skill";
	else if (rank === "SCI") return "science_skill";
	else if (rank === "MED") return "medicine_skill";
	else if (rank === "ENG") return "engineering_skill";
}

export function skillToShort(skill: PlayerSkill | string): string | undefined {
	if (!skill) return "";
	if (skill === "command_skill") return "CMD";
	else if (skill === "security_skill") return "SEC";
	else if (skill === "diplomacy_skill") return "DIP";
	else if (skill === "science_skill") return "SCI";
	else if (skill === "medicine_skill") return "MED";
	else if (skill === "engineering_skill") return "ENG";
}

export function comparePairs(a: Skill[], b: Skill[], featuredSkill?: string, multiplier?: number) {
	let an = 0;
	let bn = 0;
	let choiceMult = multiplier ?? 1.33;

	for (let ai of a) {
		an += (("skill" in ai && ai.skill === featuredSkill) ? choiceMult : 1) * (ai.range_max + ai.range_min);
	}

	for (let bi of b) {
		bn += (("skill" in bi && bi.skill === featuredSkill) ? choiceMult : 1) * (bi.range_max + bi.range_min);
	}

	if (an > bn) return -1;
	else if (bn > an) return 1;
	else return 0;
}

export const emptySkill = {
	skill: undefined,
	core: 0,
	range_max: 0,
	range_min: 0
} as Skill;

export function getPlayerPairs(crew: PlayerCrew | CrewMember, multiplier?: number, minMult?: number, maxMult?: number): Skill[][] | undefined {
	let multi = multiplier ?? 0;

	minMult ??= 1;
	maxMult ??= 1;

	// const oppo = (("isOpponent" in crew) && crew.isOpponent);

	let skills = getSkills(crew).map(skill => { return { core: crew[skill].core, range_max: crew[skill].max, range_min: crew[skill].min, skill: skill } as Skill });

	if (!skills?.length || !skills[0].range_max) {
		skills = getSkills(crew).map(skill => { return { ...crew.base_skills[skill], skill: skill } as Skill });
	}

	if (skills && skills.length) {
		for (let skillObj of skills) {
			skillObj.core *= (1 + multi);

			if ("min" in skillObj && !skillObj.range_min) skillObj.range_min = skillObj["min"] as number;
			if ("max" in skillObj && !skillObj.range_max) skillObj.range_max = skillObj["max"] as number;

			skillObj.range_min *= (1 + multi);
			skillObj.range_min *= minMult;
			skillObj.range_max *= (1 + multi);
			skillObj.range_max *= maxMult;
		}
		if (skills.length > 1) skills.sort((a, b) => ((b.range_max + b.range_min) / 2) - ((a.range_max + a.range_min) / 2));

		let pairs = [] as Skill[][];

		if (skills.length <= 2) {
			if (skills.length === 1) {
				skills.push(JSON.parse(JSON.stringify(emptySkill)));
			}
			pairs.push(skills);
			pairs.push([JSON.parse(JSON.stringify(emptySkill)), JSON.parse(JSON.stringify(emptySkill))]);
			pairs.push([JSON.parse(JSON.stringify(emptySkill)), JSON.parse(JSON.stringify(emptySkill))]);
			return pairs;
		}

		pairs.push([skills[0], skills[1]]);
		pairs.push([skills[0], skills[2]]);
		pairs.push([skills[1], skills[2]]);
		return pairs;
	}

	return undefined;
}


export function qbitsToSlots(q_bits: number | undefined) {
	// 100/250/500/1300
	q_bits ??= 0;
	if (q_bits < 100) return 0;
	else if (q_bits < 200) return 1;
	else if (q_bits < 500) return 2;
	else if (q_bits < 1300) return 3;
	return 4;
}

export function getCrewQuipment(crew: PlayerCrew, items: EquipmentItem[]): EquipmentItem[] {

	if (crew.kwipment) {
		let quips = [] as number[];
		crew.kwipment.map(q => {
			if (typeof q === 'number') {
				quips.push(q);
			}
			else {
				quips.push(q[1]);
			}
		});
		if (quips?.length) {
			let found = items.filter(item => quips.some(q => q.toString() === item?.kwipment_id?.toString()));
			if (found?.length) {
				return found;
			}
		}
	}

	return [];
}

export function formatTierLabel(crew: PlayerCrew | CrewMember): string {
	// if (!crew.in_portal && crew.obtained === "WebStore") {
	// 	return '$';
	// }
	if (!crew.bigbook_tier || crew.bigbook_tier === -1) {
		return '?';
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

export function getShipBonus(item?: PlayerCrew | CrewMember | ShipAction | Ship, index?: number, short?: boolean): string {
	if (!item) return "";
	let actionIn = getActionFromItem(item, index);
	if (!actionIn) return "";
	const action = actionIn;
	if (!action || !action.ability) return "";
	let bonusText: string;

	if (short) {
		bonusText = CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[action.ability.type];
	}
	else {
		bonusText = CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[action.ability.type];
	}


	if (action.ability.type === 0)
		bonusText = bonusText.replace('bonus boost by', `${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[action.bonus_type]} boost to`);
	const bonusVal = action.ability.type === 0
		? action.bonus_amount + action.ability.amount
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
			phaseDescription += ', ' + CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[action.ability.type].replace('%VAL%', `${cp.ability_amount}`);
		}

		if (cp.bonus_amount) {
			phaseDescription += `, +${cp.bonus_amount} to ${CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[action.bonus_type]}`;
		}

		if (cp.duration) {
			phaseDescription += `, +${cp.duration - action.duration}s duration`;
		}

		if (cp.cooldown) {
			phaseDescription += `, +${cp.cooldown - action.cooldown}s cooldown`;
		}

		phases.push(phaseDescription);
	});
	return phases;
}

export function traitNumberToColor(num: number): string | null {
	if (num > 6) return 'lightgreen';

	switch (num) {
		case 5:
		case 6:
			return "lightgreen";

		case 3:
		case 4:
			return "aquamarine";

		case 1:
		case 2:
			return "yellow";

	}
	return 'gray';
}

export function dynamicRangeColor(grade: number, max: number, min: number): string | null {
	// grade -= min;
	// max -= min;

	grade = (grade / max) * 100;

	if (grade >= 90) {
		return "lightgreen";
	}
	else if (grade >= 80) {
		return "aquamarine";
	}
	else if (grade >= 70) {
		return "yellow";
	}
	else if (grade >= 60) {
		return "orange";
	}

	return "tomato";
}

export function numberToGrade(value: number, noneText?: string) {

	if (!value && !!noneText) return noneText;

	if (value >= 0.97) return "A+";
	else if (value >= 0.93) return "A";
	else if (value >= 0.90) return "A-";
	else if (value >= 0.87) return "B+";
	else if (value >= 0.83) return "B";
	else if (value >= 0.80) return "B-";
	else if (value >= 0.77) return "C+";
	else if (value >= 0.73) return "C";
	else if (value >= 0.70) return "C-";
	else if (value >= 0.67) return "D+";
	else if (value >= 0.63) return "D";
	else if (value >= 0.60) return "D-";
	else return "F";
}


export function gradeToColor(grade: string | number, dryzero?: boolean): string | null {

	if (!grade && dryzero) return null;

	if (typeof grade === 'number' && grade < 1 && grade >= 0) {

		if (grade >= 0.9) return 'lightgreen';
		else if (grade >= 0.8) return 'aquamarine';
		else if (grade >= 0.7) return 'yellow';
		else if (grade >= 0.6) return 'orange';
		else if (grade < 0.6) return 'tomato';
	}

	switch (grade) {
		case "A":
		case "A-":
		case "A+":
		case 1:
		case 2:
		case 65:
		case 45:
			return "lightgreen";

		case "B":
		case "B-":
		case "B+":
		case 3:
		case 4:
		case 25:
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

export function applySkillBuff(buffConfig: BuffStatTable, skill: string, base_skill: Skill): ComputedSkill {
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
		core: Math.round(base_skill.core * getMultiplier(skill, 'core')),
		min: Math.round(base_skill.range_min * getMultiplier(skill, 'range_min')),
		max: Math.round(base_skill.range_max * getMultiplier(skill, 'range_max'))
	};
}

export function getShortNameFromTrait(trait: string, crewGroup: CrewMember[]) {
	return trait === 'dax' ? 'Dax' : trait === 'tpring' ? "T'Pring" : crewGroup[0].short_name;
}
export const crewVariantIgnore = ['sam_lavelle_crew', 'jack_crusher_crew'];

export function getVariantTraits(subject: PlayerCrew | CrewMember | string[]): string[] {
	const ignore = [
		'female', 'male',
		'artificial_life', 'nonhuman', 'organic', 'species_8472',
		'admiral', 'captain', 'commander', 'lieutenant_commander', 'lieutenant', 'ensign', 'general', 'nagus', 'first_officer',
		'ageofsail', 'bridge_crew', 'evsuit', 'gauntlet_jackpot', 'mirror', 'niners', 'crewman',
		'crew_max_rarity_5', 'crew_max_rarity_4', 'crew_max_rarity_3', 'crew_max_rarity_2', 'crew_max_rarity_1'
	];
	const ignoreRe = [
		/^exclusive_/,		/* exclusive_ crew, e.g. bridge, collection, fusion, gauntlet, honorhall, voyage */
		/^[a-z]{3}\d{4}$/,	/* mega crew, e.g. feb2023 and apr2023 */
		/^[a-z]{4}\d{4}$/	/* mega crew, e.g. june2024 and july2024 */
	];
	const variantTraits = [] as string[];

	if ("length" in subject) {
		subject.forEach(trait => {
			if (!CONFIG.SERIES.includes(trait) && !ignore.includes(trait) && !ignoreRe.reduce((prev, curr) => prev || curr.test(trait), false)) {
				variantTraits.push(trait);
			}
		});
	}
	else {
		subject.traits_hidden.forEach(trait => {
			if (!CONFIG.SERIES.includes(trait) && !ignore.includes(trait) && !ignoreRe.reduce((prev, curr) => prev || curr.test(trait), false)) {
				variantTraits.push(trait);
			}
		});
	}

	return variantTraits;
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

	if (a.duration && b.duration) {
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
export function mapToRankings(map: { [key: string]: { [key: string]: (PlayerCrew | CrewMember)[] } }, abilities?: number[] | number): ShipSkillRanking[] {
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

export interface ShipStatMap { [key: string]: { [key: string]: (PlayerCrew | CrewMember)[] } }

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

	let tiers = {} as { [key: string]: { [key: string]: (PlayerCrew | CrewMember)[] } };
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

export function getSkillOrder<T extends CrewMember>(crew: T) {
	const sk = [] as ComputedSkill[];

	for (let skill of Object.keys(CONFIG.SKILLS)) {
		if (skill in crew.base_skills && !!crew.base_skills[skill].core) {
			sk.push({ ...crew.base_skills[skill], skill: skill });
		}
	}

	sk.sort((a, b) => b.core - a.core);
	const output = [] as string[];

	if (sk.length > 0 && sk[0].skill) {
		output.push(sk[0].skill);
	}
	if (sk.length > 1 && sk[1].skill) {
		output.push(sk[1].skill);
	}
	if (sk.length > 2 && sk[2].skill) {
		output.push(sk[2].skill);
	}

	return output;
}

export function printSkillOrder(crew: PlayerCrew | CrewMember) {
	return crew.skill_order.join("/");
}


export function prettyObtained(crew: PlayerCrew | CrewMember, long?: boolean) {
	long ??= false;
	let obstr = `${crew.obtained}`;
	if (obstr === 'HonorHall') obstr = 'Honor Hall';
	else if (obstr === 'FactionStore') obstr = 'Faction';

	if (long) {
		if (obstr === 'Voyage' || obstr === 'Gauntlet') obstr += " Exclusive";
		else if (obstr === 'WebStore') obstr = 'Web Store';
		else if (obstr === 'Faction') obstr = 'Faction Store';
		else if (obstr === 'Fuse') obstr = 'Exclusive Fusion';
		else if (obstr === 'BossBattle') obstr = 'Captain\'s Bridge';
		else if (obstr === 'Collection') obstr = 'Collection Milestone';
		else if (obstr === 'Missions') obstr = 'Main Board Mission';
		else if (obstr === 'Mega') obstr = 'Recurring Mega';
	}
	else {
		if (obstr === 'BossBattle') obstr = 'Bridge';
		else if (obstr === 'Fuse') obstr = 'Fusion';
		else if (obstr === 'WebStore') obstr = 'Web Store';
	}

	return obstr;
}

/**
 * Print the portal status for a crew member
 * @param crew The target crew member
 * @param showNever True to show "Never" in lieu of "No" for crew that will never be in the portal
 * @param obtainedIfNo True to print the route of obtaining the crew if not in portal, or chance of retrieval if in portal.
 * @param long True to print long-form obtained information.
 * @param withPortal True to prepend the string with "In Portal: "
 * @returns A formatted string conveying the portal status
 */
export function printPortalStatus<T extends CrewMember>(crew: T, showNever?: boolean, obtainedIfNo?: boolean, long?: boolean, withPortal?: boolean) {
	showNever ??= true;
	long ??= false;
	obtainedIfNo ??= false;

	if (!showNever && !obtainedIfNo) return crew.in_portal ? "Yes" : "No";
	let obstr = "";
	if (obtainedIfNo) {
		if (!crew.in_portal) {
			obstr = prettyObtained(crew, long);
		}
		else {
			obstr = (crew.unique_polestar_combos?.length ? "Uniquely Retrievable" : "<100% Retrieval");
		}
	}

	if (obstr !== "") obstr = ` (${obstr})`;
	let ob = crew.obtained?.toLowerCase() ?? "Unknown";

	if (showNever && (ob.includes("faction") || ob.includes("missions") || ob.includes("fuse") || ob.includes("bossbattle") || ob.includes("gauntlet") || ob.includes("honor") || ob.includes("voyage") || ob.includes("collection"))) {
		return (withPortal ? "In Portal: " : "") + `Never${obstr}`;
	}

	return (withPortal ? "In Portal: " : "") + `${crew.in_portal ? "Yes" : "No"}${obstr}`;
}

export function getVoyageQuotient<T extends CrewMember>(crew: T) {
    if (!crew.q_lots?.power) return 0;
	const q_power = crew.q_lots.power;
    let power = 0;
	for (let skill in crew.base_skills) {
		let qp = q_power.find(f => f.skill === skill);
		if (!qp) continue;
		power += qp.core + (0.5 * (qp.range_max + qp.range_min));
	}

    return (crew.ranks.voyRank / power);
}

export function skillAdd(a: Skill | ComputedSkill, b: Skill | ComputedSkill): Skill | ComputedSkill {
	if ("range_max" in a && "range_max" in b) {
		return {
			core: a.core + b.core,
			range_max: a.range_max + b.range_max,
			range_min: a.range_min + b.range_min,
			skill: a.skill ?? b.skill
		};
	}
	else if ("max" in a && "max" in b) {
		return {
			core: a.core + b.core,
			max: a.max + b.max,
			min: a.min + b.min,
			skill: a.skill ?? b.skill
		};
	}
	else {
		throw new TypeError('a and b must be of same type')
	}
}

/**
 * Adds one or more skill-type objects together
 * @param skills The skill or skills to add
 * @param mode Specify what to add (optional)
 * @returns The sum of core + ((max+min) * 0.5) (depending on mode) from every element.
 */
export function skillSum(skills: Skill | ComputedSkill | (Skill | ComputedSkill)[], mode?: 'all' | 'core' | 'proficiency'): number {
	if (Array.isArray(skills)) {
		return skills.reduce((p, n) => p + skillSum(n, mode), 0);
	}
	else if ("range_max" in skills) {
		return (mode !== 'proficiency' ? skills.core : 0) + (mode !== 'core' ? ((skills.range_max + skills.range_min) * 0.5) : 0);
	}
	else {
		return (mode !== 'proficiency' ? skills.core : 0) + (mode !== 'core' ? ((skills.max + skills.min) * 0.5) : 0);
	}		
}

export function powerSum(skills: Skill[]): { [key: string]: Skill } {
	const output = {} as { [key: string]: Skill };
	skills.forEach((skill) => {
		if (!skill.skill) return;
		if (!output[skill.skill]) {
			output[skill.skill] = { ... skill };
		}
		else {
			output[skill.skill] = skillAdd(output[skill.skill], skill) as Skill;
		}
	})
	return output;
}

export function likeSum(skills: Skill[]): { [key: string]: number } {
	const output = {} as { [key: string]: number };
	skills.forEach((skill) => {
		if (!skill.skill) return;
		output[skill.skill] ??= 0;
		output[skill.skill] += skillSum(skill);		
	})
	return output;
}