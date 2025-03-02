import { SupportedLanguage } from "../context/localizedcontext";
import { shortToSkill } from "../utils/crewutils";

export interface Rarity {
	name: string;
	color: string;
}

export interface Mastery {
	name: string;
	imageUrl: string;
}

function rgbToHex(r: number, g: number, b: number): string {
	return '#' + ((b | (g << 8) | (r << 16)) / 0x1000000).toString(16).substring(2);
}

export default class CONFIG {
	static language: SupportedLanguage = 'en';
	static TRIPLET_TEXT = 'Triplet';

	static readonly RARITIES: Rarity[] = [
		{ name: 'Basic', color: 'Grey' },
		{ name: 'Common', color: rgbToHex(155, 155, 155) },
		{ name: 'Uncommon', color: rgbToHex(80, 170, 60) },
		{ name: 'Rare', color: rgbToHex(90, 170, 255) },
		{ name: 'Super Rare', color: rgbToHex(170, 45, 235) },
		{ name: 'Legendary', color: rgbToHex(253, 210, 106) }
	];

	static readonly MASTERY_LEVELS: Mastery[] = [
		{ name: 'Normal', imageUrl: 'mastery_lowest_icon' },
		{ name: 'Elite', imageUrl: 'mastery_medium_icon' },
		{ name: 'Epic', imageUrl: 'mastery_highest_icon' }
	];

	static readonly SKILLS: { [index: string]: string } = {
		command_skill: 'Command',
		science_skill: 'Science',
		security_skill: 'Security',
		engineering_skill: 'Engineering',
		diplomacy_skill: 'Diplomacy',
		medicine_skill: 'Medicine'
	};

	static readonly SKILLS_SHORT = [
		{ name: 'command_skill', short: 'CMD' },
		{ name: 'science_skill', short: 'SCI' },
		{ name: 'security_skill', short: 'SEC' },
		{ name: 'engineering_skill', short: 'ENG' },
		{ name: 'diplomacy_skill', short: 'DIP' },
		{ name: 'medicine_skill', short: 'MED' }
	];

	static readonly SKILLS_SHORT_ENGLISH = [
		{ name: 'command_skill', short: 'CMD' },
		{ name: 'science_skill', short: 'SCI' },
		{ name: 'security_skill', short: 'SEC' },
		{ name: 'engineering_skill', short: 'ENG' },
		{ name: 'diplomacy_skill', short: 'DIP' },
		{ name: 'medicine_skill', short: 'MED' }
	];

	static readonly REWARDS_ITEM_TYPE: { [index: number]: string } = {
		0: 'None',
		1: 'Crew',
		2: 'Equipment',
		3: 'Component',
		4: 'Shuttle token',
		5: 'Ship part',
		6: 'Shuttle token',
		7: 'Crew experience training',
		8: 'Ship schematic',
		9: 'Replicator ration',
		10: 'Honorable citation',
		11: 'Buff',
		12: 'Starbase component',
		13: 'Voyage token',
		14: 'Continuum Quipment',
		15: 'Continuum Q-Bit (Component)'
	};

	static readonly CREW_SHIP_BATTLE_BONUS_TYPE: { [index: number]: string } = {
		0: 'Attack',
		1: 'Evasion',
		2: 'Accuracy',
		// These are only for penalty
		3: 'Shield Regeneration'
	};

	static readonly CREW_SHIP_BATTLE_BONUS_ICON: { [index: number]: string } = {
		0: 'immediate-damage.png',
		1: 'evasion-boost.png',
		2: 'accuracy-boost.png',
		// These are only for penalty
		3: 'repair-shields.png'
	};

	static readonly CREW_SHIP_BATTLE_BONUS_COLORS: { [index: number]: string } = {
		0: "#d04444",
		1: "#7eb1e8",
		2: "#eca50b",
	}

	static readonly CREW_SHIP_BATTLE_TRIGGER: { [index: number]: string } = {
		0: 'None',
		1: 'Position',
		2: 'Cloak',
		4: 'Boarding',
	};

	static readonly SHIP_BATTLE_TRIGGER_ICON: { [index: number]: string } = {
		0: '',
		1: 'trigger-position.png',
		2: 'trigger-cloak.png',
		4: 'trigger-boarding.png',
	};

	static readonly SHIP_BATTLE_GRANTS: { [index: number]: string } = {
		0: 'None',
		1: 'Position',
		2: 'Cloaked',
		4: 'Boarding',
		16: 'Shields Disruptor'
	};

	static readonly SHIP_BATTLE_GRANT_DESC: { [index: number]: string } = {
		0: 'None',
		1: 'Critical Rating increased',
		2: 'Ship is untargetable for a time',
		4: 'Deals gradual damage to enemy hull',
		16: 'Enemy shields become inoperable for a time'
	};

	static readonly CREW_SHIP_BATTLE_ABILITY_TYPE: { [index: number]: string } = {
		0: 'Increases bonus boost by +%VAL%',
		1: 'Immediately deals %VAL%% damage',
		2: 'Immediately repairs Hull by %VAL%%',
		3: 'Immediately repairs Shields by %VAL%%',
		4: '+%VAL% to Crit Rating',
		5: '+%VAL% to Crit Bonus',
		6: '+%VAL% to Shield Regeneration',
		7: '+%VAL%% to Attack Speed',
		8: 'Increases boarding damage by %VAL%%',
		9: 'Resets enemy cooldown timers',
		10: 'Speeds up cooldown timers by %VAL% seconds',
		11: 'Decrease incoming hull damage by %VAL%%',
		12: '%VAL%% of incoming damage also taken by the attacker',
	};

	static readonly CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT: { [index: number]: string } = {
		0: '+%VAL% to bonus boost',
		1: '%VAL%% damage',
		2: '%VAL%% hull repair',
		3: '%VAL%% shield repair',
		4: '+%VAL% crit rating',
		5: '+%VAL% crit bonus',
		6: '+%VAL% shield regen.',
		7: '+%VAL%% attack speed',
		8: '%VAL%% boarding damage',
		9: 'Resets enemy cooldown timers',
		10: '+%VAL%s to cooldown timers',
		11: '-%VAL%% hull damage',
		12: '%VAL%% reflection damage',
	};

	static readonly CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT: { [index: number]: string } = {
		0: 'Increases Bonus Boost',
		1: 'Immediate Damage',
		2: 'Immediately Repairs Hull',
		3: 'Immediately Repairs Shields',
		4: '+Crit Rating',
		5: '+Crit Bonus',
		6: '+Shield Regeneration',
		7: '+Attack Speed',
		8: 'Increases Boarding Damage',
		9: 'Resets enemy cooldown timers',
		10: 'Speeds Up Cooldown Timers',
		11: 'Decrease Incoming Hull Damage',
		12: 'Reflection Damage',
	};

	static readonly OFFENSE_ABILITIES = [0, 1, 4, 5, 7, 8, 10, 12];
	static readonly DEFENSE_ABILITIES = [2, 3, 6, 9, 10, 11];

	static readonly SHIP_BATTLE_ABILITY_ICON: { [index: number]: string } = {
		0: '',
		1: 'immediate-damage.png',
		2: 'repair-hull.png',
		3: 'repair-shields.png',
		4: 'crit-rating.png',
		5: 'crit-bonus.png',
		6: 'repair-shields.png',
		7: 'attack-speed.png',
		8: 'boarding-damage.png',
		9: 'reset-timers.png',
		10: 'cooldown-timers.png',
		11: 'reduce-incoming.png',
		12: 'reflection-damage.png',
	};


	static readonly STATS_CONFIG: { [index: number]: { symbol: string, skill: string, stat: string } } = {
		2: { symbol: 'engineering_skill_core', skill: 'engineering_skill', stat: 'core' },
		3: { symbol: 'engineering_skill_range_min', skill: 'engineering_skill', stat: 'range_min' },
		4: { symbol: 'engineering_skill_range_max', skill: 'engineering_skill', stat: 'range_max' },
		6: { symbol: 'command_skill_core', skill: 'command_skill', stat: 'core' },
		7: { symbol: 'command_skill_range_min', skill: 'command_skill', stat: 'range_min' },
		8: { symbol: 'command_skill_range_max', skill: 'command_skill', stat: 'range_max' },
		14: { symbol: 'science_skill_core', skill: 'science_skill', stat: 'core' },
		15: { symbol: 'science_skill_range_min', skill: 'science_skill', stat: 'range_min' },
		16: { symbol: 'science_skill_range_max', skill: 'science_skill', stat: 'range_max' },
		18: { symbol: 'diplomacy_skill_core', skill: 'diplomacy_skill', stat: 'core' },
		19: { symbol: 'diplomacy_skill_range_min', skill: 'diplomacy_skill', stat: 'range_min' },
		20: { symbol: 'diplomacy_skill_range_max', skill: 'diplomacy_skill', stat: 'range_max' },
		22: { symbol: 'security_skill_core', skill: 'security_skill', stat: 'core' },
		23: { symbol: 'security_skill_range_min', skill: 'security_skill', stat: 'range_min' },
		24: { symbol: 'security_skill_range_max', skill: 'security_skill', stat: 'range_max' },
		26: { symbol: 'medicine_skill_core', skill: 'medicine_skill', stat: 'core' },
		27: { symbol: 'medicine_skill_range_min', skill: 'medicine_skill', stat: 'range_min' },
		28: { symbol: 'medicine_skill_range_max', skill: 'medicine_skill', stat: 'range_max' }
	};

	static readonly VOYAGE_CREW_SLOTS = [
		"captain_slot",
		"first_officer",
		"chief_communications_officer",
		"communications_officer",
		"chief_security_officer",
		"security_officer",
		"chief_engineering_officer",
		"engineering_officer",
		"chief_science_officer",
		"science_officer",
		"chief_medical_officer",
		"medical_officer"
	]

	static readonly VOYAGE_SLOT_SKILLS = [
		"CMD",
		"CMD",
		"DIP",
		"DIP",
		"SEC",
		"SEC",
		"ENG",
		"ENG",
		"SCI",
		"SCI",
		"MED",
		"MED"
	]

	static readonly getSlotSkill = (slot: string, short?: boolean) => {
		let sidx = CONFIG.VOYAGE_CREW_SLOTS.findIndex(fi => fi === slot);
		if (sidx === -1) return '';
		if (short) return CONFIG.VOYAGE_SLOT_SKILLS[sidx];
		else return shortToSkill(CONFIG.VOYAGE_SLOT_SKILLS[sidx])!;
	}

	static readonly CITATION_COST = [0, 500, 4500, 18000, 50000];

	static readonly SERIES = [
		'tos', 'tas',
		'tng', 'ds9', 'voy', 'ent',
		'dsc', 'pic', 'low', 'snw', 'vst',
		'original'
	];

	static setLanguage(l: SupportedLanguage) {
		this.language = l;

		// ENGLISH
		if (l === 'en') {
			this.TRIPLET_TEXT = 'Triplet';

			this.RARITIES.length = 0;
			this.RARITIES.push(
				{ name: 'Basic', color: 'Grey' },
				{ name: 'Common', color: rgbToHex(155, 155, 155) },
				{ name: 'Uncommon', color: rgbToHex(80, 170, 60) },
				{ name: 'Rare', color: rgbToHex(90, 170, 255) },
				{ name: 'Super Rare', color: rgbToHex(170, 45, 235) },
				{ name: 'Legendary', color: rgbToHex(253, 210, 106) }
			);

			this.MASTERY_LEVELS.length = 0;
			this.MASTERY_LEVELS.push(
				{ name: 'Normal', imageUrl: 'mastery_lowest_icon' },
				{ name: 'Elite', imageUrl: 'mastery_medium_icon' },
				{ name: 'Epic', imageUrl: 'mastery_highest_icon' }
			)

			this.SKILLS.command_skill = 'Command';
			this.SKILLS.science_skill = 'Science';
			this.SKILLS.security_skill = 'Security';
			this.SKILLS.engineering_skill = 'Engineering';
			this.SKILLS.diplomacy_skill = 'Diplomacy';
			this.SKILLS.medicine_skill = 'Medicine';

			this.SKILLS_SHORT.length = 0;
			this.SKILLS_SHORT.push(
				{ name: 'command_skill', short: 'CMD' },
				{ name: 'science_skill', short: 'SCI' },
				{ name: 'security_skill', short: 'SEC' },
				{ name: 'engineering_skill', short: 'ENG' },
				{ name: 'diplomacy_skill', short: 'DIP' },
				{ name: 'medicine_skill', short: 'MED' }
			);

			this.REWARDS_ITEM_TYPE[0] = 'None';
			this.REWARDS_ITEM_TYPE[1] = 'Crew';
			this.REWARDS_ITEM_TYPE[2] = 'Equipment';
			this.REWARDS_ITEM_TYPE[3] = 'Component';
			this.REWARDS_ITEM_TYPE[4] = 'Shuttle boosts';
			this.REWARDS_ITEM_TYPE[5] = 'Ship part';
			this.REWARDS_ITEM_TYPE[6] = 'Shuttle token';
			this.REWARDS_ITEM_TYPE[7] = 'Crew experience training';
			this.REWARDS_ITEM_TYPE[8] = 'Ship schematic';
			this.REWARDS_ITEM_TYPE[9] = 'Replicator ration';
			this.REWARDS_ITEM_TYPE[10] = 'Honorable citation';
			this.REWARDS_ITEM_TYPE[11] = 'Buff';
			this.REWARDS_ITEM_TYPE[12] = 'Starbase component';
			this.REWARDS_ITEM_TYPE[13] = 'Voyage consumable';
			this.REWARDS_ITEM_TYPE[14] = 'Continuum Quipment';
			this.REWARDS_ITEM_TYPE[15] = 'Continuum Q-Bit';

			this.CREW_SHIP_BATTLE_BONUS_TYPE[0] = 'Attack';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[1] = 'Evasion';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[2] = 'Accuracy';
			// These are only for penalty
			this.CREW_SHIP_BATTLE_BONUS_TYPE[3] = 'Shield Regeneration';

			this.CREW_SHIP_BATTLE_TRIGGER[0] = 'None';
			this.CREW_SHIP_BATTLE_TRIGGER[1] = 'Position';
			this.CREW_SHIP_BATTLE_TRIGGER[2] = 'Cloak';
			this.CREW_SHIP_BATTLE_TRIGGER[4] = 'Boarding';

			this.SHIP_BATTLE_GRANTS[0] = 'None';
			this.SHIP_BATTLE_GRANTS[1] = 'Position';
			this.SHIP_BATTLE_GRANTS[2] = 'Cloaked';
			this.SHIP_BATTLE_GRANTS[4] = 'Boarding';
			this.SHIP_BATTLE_GRANTS[16] = 'Shields Disruptor';

			this.SHIP_BATTLE_GRANT_DESC[0] = 'None';
			this.SHIP_BATTLE_GRANT_DESC[1] = 'Critical Rating increased';
			this.SHIP_BATTLE_GRANT_DESC[2] = 'Ship is untargetable for a time';
			this.SHIP_BATTLE_GRANT_DESC[4] = 'Deals gradual damage to enemy hull';
			this.SHIP_BATTLE_GRANT_DESC[16] = 'Enemy shields become inoperable for a time';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE[0] = 'Increases bonus boost by +%VAL%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[1] = 'Immediately deals %VAL%% damage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[2] = 'Immediately repairs Hull by %VAL%%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[3] = 'Immediately repairs Shields by %VAL%%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[4] = '+%VAL% to Crit Rating';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[5] = '+%VAL% to Crit Bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[6] = '+%VAL% to Shield Regeneration';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[7] = '+%VAL%% to Attack Speed';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[8] = 'Increases boarding damage by %VAL%%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[9] = 'Resets enemy cooldown timers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[10] = 'Speeds up cooldown timers by %VAL% seconds';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[11] = 'Decrease incoming hull damage by %VAL%%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[12] = '%VAL%% of incoming damage also taken by the attacker';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[0] = '+%VAL% to bonus boost';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[1] = '%VAL%% damage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[2] = '%VAL%% hull repair';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[3] = '%VAL%% shield repair';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[4] = '+%VAL% crit rating';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[5] = '+%VAL% crit bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[6] = '+%VAL% shield regen.';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[7] = '+%VAL%% attack speed';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[8] = '%VAL%% boarding damage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[9] = 'Resets enemy cooldown timers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[10] = '+%VAL%s to cooldown timers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[11] = '-%VAL%% hull damage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[12] = '%VAL%% reflection damage';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[0] = 'Increases Bonus Boost';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[1] = 'Immediate Damage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[2] = 'Immediately Repairs Hull';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[3] = 'Immediately Repairs Shields';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[4] = '+Crit Rating';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[5] = '+Crit Bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[6] = '+Shield Regeneration';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[7] = '+Attack Speed';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[8] = 'Increases Boarding Damage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[9] = 'Resets enemy cooldown timers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[10] = 'Speeds Up Cooldown Timers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[11] = 'Decrease Incoming Hull Damage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[12] = 'Reflection Damage';

			this.VOYAGE_SLOT_SKILLS.length = 0;
			this.VOYAGE_SLOT_SKILLS.push(
				"CMD",
				"CMD",
				"DIP",
				"DIP",
				"SEC",
				"SEC",
				"ENG",
				"ENG",
				"SCI",
				"SCI",
				"MED",
				"MED");
		}
		// FRENCH
		else if (l === 'fr') {
			this.TRIPLET_TEXT = 'Triolet';

			this.RARITIES.length = 0;
			this.RARITIES.push(
				{ name: 'Basique', color: 'Grey' },
				{ name: 'Ordinaire', color: rgbToHex(155, 155, 155) },
				{ name: 'Insolite', color: rgbToHex(80, 170, 60) },
				{ name: 'Rare', color: rgbToHex(90, 170, 255) },
				{ name: 'Super Rare', color: rgbToHex(170, 45, 235) },
				{ name: 'Légendaire', color: rgbToHex(253, 210, 106) }
			);

			this.MASTERY_LEVELS.length = 0;
			this.MASTERY_LEVELS.push(
				{ name: 'Normal', imageUrl: 'mastery_lowest_icon' },
				{ name: 'Élite', imageUrl: 'mastery_medium_icon' },
				{ name: 'Épique', imageUrl: 'mastery_highest_icon' }
			)

			this.SKILLS.command_skill = 'Commandement';
			this.SKILLS.science_skill = 'Science';
			this.SKILLS.security_skill = 'Sécurité';
			this.SKILLS.engineering_skill = 'Ingénierie';
			this.SKILLS.diplomacy_skill = 'Diplomatie';
			this.SKILLS.medicine_skill = 'Médecine';

			this.SKILLS_SHORT.length = 0;
			this.SKILLS_SHORT.push(
				{ name: 'command_skill', short: 'CMD' },
				{ name: 'science_skill', short: 'SCI' },
				{ name: 'security_skill', short: 'SEC' },
				{ name: 'engineering_skill', short: 'ING' },
				{ name: 'diplomacy_skill', short: 'DIP' },
				{ name: 'medicine_skill', short: 'MED' }
			);

			this.REWARDS_ITEM_TYPE[0] = 'Aucun';
			this.REWARDS_ITEM_TYPE[1] = 'Équipage';
			this.REWARDS_ITEM_TYPE[2] = 'Équipment';
			this.REWARDS_ITEM_TYPE[3] = 'Composant';
			this.REWARDS_ITEM_TYPE[4] = 'Modifications de navette';
			this.REWARDS_ITEM_TYPE[5] = 'Piéce de vaisseau';
			this.REWARDS_ITEM_TYPE[6] = 'Jetons de navette';
			this.REWARDS_ITEM_TYPE[7] = 'Entraînment Équipage';
			this.REWARDS_ITEM_TYPE[8] = 'Plan de vaisseau';
			this.REWARDS_ITEM_TYPE[9] = 'Ration de réplicateur';
			this.REWARDS_ITEM_TYPE[10] = 'Mention honorable';
			this.REWARDS_ITEM_TYPE[11] = 'Effet';
			this.REWARDS_ITEM_TYPE[12] = 'Composant de base stellaire';
			this.REWARDS_ITEM_TYPE[13] = 'Provision de voyage';
			this.REWARDS_ITEM_TYPE[14] = 'Quipement de continuum';
			this.REWARDS_ITEM_TYPE[15] = 'Q-Bits de continuum';

			this.CREW_SHIP_BATTLE_BONUS_TYPE[0] = 'Attaque';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[1] = 'Évasion';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[2] = 'Précision';
			// These are only for penalty
			this.CREW_SHIP_BATTLE_BONUS_TYPE[3] = 'Régénération Bouclier';

			this.CREW_SHIP_BATTLE_TRIGGER[0] = 'Aucun';
			this.CREW_SHIP_BATTLE_TRIGGER[1] = 'Position';
			this.CREW_SHIP_BATTLE_TRIGGER[2] = 'Camouflé';
			this.CREW_SHIP_BATTLE_TRIGGER[4] = 'Abordage';

			this.SHIP_BATTLE_GRANTS[0] = 'Aucun';
			this.SHIP_BATTLE_GRANTS[1] = 'Position';
			this.SHIP_BATTLE_GRANTS[2] = 'Camouflé';
			this.SHIP_BATTLE_GRANTS[4] = 'Abordage';
			this.SHIP_BATTLE_GRANTS[16] = 'Disrupteur de boucliers';

			this.SHIP_BATTLE_GRANT_DESC[0] = 'Aucun';
			this.SHIP_BATTLE_GRANT_DESC[1] = 'Augmente votre taux de critiques';
			this.SHIP_BATTLE_GRANT_DESC[2] = 'Vous rend impossible à cibler';
			this.SHIP_BATTLE_GRANT_DESC[4] = 'Inflige des dégâts sur la durée à la coque ennemie';
			this.SHIP_BATTLE_GRANT_DESC[16] = 'Les boucliers ennemis deviennent temporairement inopérants';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE[0] = 'Augmente bonus boost de +%VAL%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[1] = 'Inflige immédiatement %VAL% % de dégâts';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[2] = 'Repare immédiatement %VAL% % de la coque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[3] = 'Repare immédiatement %VAL% % des boucliers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[4] = '+%VAL% à la chance du critique';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[5] = '+%VAL% au bonus critique';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[6] = '+%VAL% à la régénération des boucliers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[7] = '+%VAL% % à la vitesse d\'attaque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[8] = 'Augment %VAL% % de dégâts d\'abordage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[9] = 'Réinitialise les temps de recharge ennemis';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[10] = 'Accélère les temps de recharge de %VAL% secondes';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[11] = 'Réduit les dégâts de coque subis de %VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[12] = '%VAL% % des dégâts subis sont aussi infligés à l\'attaquant';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[0] = 'bonus boost de +%VAL%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[1] = '%VAL%% dégâts';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[2] = '%VAL%% repare de la coque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[3] = '%VAL%% repare des boucliers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[4] = '+%VAL% chance du critique';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[5] = '+%VAL% bonus critique';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[6] = '+%VAL% régén. des boucliers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[7] = '+%VAL%% vitesse d\'attaque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[8] = '%VAL%% dégâts d\'abordage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[9] = 'Réinitialise le recharge d\'ennemis';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[10] = '+%VAL%s au temps de recharge';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[11] = '-%VAL%% dégâts du coque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[12] = '%VAL%% dégâts réflexion';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[0] = 'Augmente le bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[1] = 'Dégâts immédiatements';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[2] = 'Repare immédiatements de la coque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[3] = 'Repare immédiatements des boucliers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[4] = '+Crit Chance';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[5] = '+Crit Bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[6] = '+Régénération boucliers';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[7] = '+Vitesse d\'attaque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[8] = 'Augment de dégâts d\'abordage';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[9] = 'Réinitialise les temps de recharge ennemis';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[10] = 'Accélère les temps de recharge';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[11] = 'Réduit les dégâts de coque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[12] = 'Dégâts réflexion';

			this.VOYAGE_SLOT_SKILLS.length = 0;
			this.VOYAGE_SLOT_SKILLS.push(
				"CMD",
				"CMD",
				"DIP",
				"DIP",
				"SEC",
				"SEC",
				"ING",
				"ING",
				"SCI",
				"SCI",
				"MED",
				"MED");
		}
		// GERMAN
		else if (l === 'de') {
			this.TRIPLET_TEXT = 'Triplett';

			this.RARITIES.length = 0;
			this.RARITIES.push(
				{ name: 'Basisch', color: 'Grey' },
				{ name: 'Gewöhnliche', color: rgbToHex(155, 155, 155) },
				{ name: 'Ungewöhnliche', color: rgbToHex(80, 170, 60) },
				{ name: 'Seltene', color: rgbToHex(90, 170, 255) },
				{ name: 'Extrem Seltene', color: rgbToHex(170, 45, 235) },
				{ name: 'Legendäre', color: rgbToHex(253, 210, 106) }
			);

			this.MASTERY_LEVELS.length = 0;
			this.MASTERY_LEVELS.push(
				{ name: 'Normal', imageUrl: 'mastery_lowest_icon' },
				{ name: 'Elite', imageUrl: 'mastery_medium_icon' },
				{ name: 'Episch', imageUrl: 'mastery_highest_icon' }
			)

			this.SKILLS.command_skill = 'Kommando';
			//this.SKILLS.command_skill = 'Befehl';
			this.SKILLS.science_skill = 'Wissenschaft';
			this.SKILLS.security_skill = 'Sicherheit';
			this.SKILLS.engineering_skill = 'Ingenieurwesen';
			this.SKILLS.diplomacy_skill = 'Diplomatie';
			this.SKILLS.medicine_skill = 'Medizin';

			this.SKILLS_SHORT.length = 0;
			this.SKILLS_SHORT.push(
				{ name: 'command_skill', short: 'KOM' },
				{ name: 'science_skill', short: 'WIS' },
				{ name: 'security_skill', short: 'SIC' },
				{ name: 'engineering_skill', short: 'ING' },
				{ name: 'diplomacy_skill', short: 'DIP' },
				{ name: 'medicine_skill', short: 'MED' }
			);

			this.REWARDS_ITEM_TYPE[0] = 'Keine';
			this.REWARDS_ITEM_TYPE[1] = 'Crew';
			this.REWARDS_ITEM_TYPE[2] = 'Ausrüstung';
			this.REWARDS_ITEM_TYPE[3] = 'Komponente';
			this.REWARDS_ITEM_TYPE[4] = 'Boni';
			this.REWARDS_ITEM_TYPE[5] = 'Schiffsteil';
			this.REWARDS_ITEM_TYPE[6] = 'Shuttle-Token';
			this.REWARDS_ITEM_TYPE[7] = 'Crew-Erfahrungstraining';
			this.REWARDS_ITEM_TYPE[8] = 'Schiffsbauplan';
			this.REWARDS_ITEM_TYPE[9] = 'Replikatorration';
			this.REWARDS_ITEM_TYPE[10] = 'Ehrenvolle Erwähnung';
			this.REWARDS_ITEM_TYPE[11] = 'Buff';
			this.REWARDS_ITEM_TYPE[12] = 'Sternenbasis-Komponente';
			this.REWARDS_ITEM_TYPE[13] = 'Reisevorräte';
			this.REWARDS_ITEM_TYPE[14] = 'Kontinuum Rüstzeug';
			this.REWARDS_ITEM_TYPE[15] = 'Kontinuum R-Bit';

			this.CREW_SHIP_BATTLE_BONUS_TYPE[0] = 'Angriffs';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[1] = 'Ausweichen';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[2] = 'Genauigkeit';
			// These are only for penalty
			this.CREW_SHIP_BATTLE_BONUS_TYPE[3] = 'Schildregeneration';

			this.CREW_SHIP_BATTLE_TRIGGER[0] = 'Keine';
			this.CREW_SHIP_BATTLE_TRIGGER[1] = 'Position';
			this.CREW_SHIP_BATTLE_TRIGGER[2] = 'Getarnt';
			this.CREW_SHIP_BATTLE_TRIGGER[4] = 'Entern';

			this.SHIP_BATTLE_GRANTS[0] = 'Keine';
			this.SHIP_BATTLE_GRANTS[1] = 'Position';
			this.SHIP_BATTLE_GRANTS[2] = 'Getarnt';
			this.SHIP_BATTLE_GRANTS[4] = 'Entern';
			this.SHIP_BATTLE_GRANTS[16] = 'Schilde-Disruptor';

			this.SHIP_BATTLE_GRANT_DESC[0] = 'Keine';
			this.SHIP_BATTLE_GRANT_DESC[1] = 'Erhöht deine Chance auf kritische Treffer';
			this.SHIP_BATTLE_GRANT_DESC[2] = 'Das Schiff ist nicht anvisierbar werden kann';
			this.SHIP_BATTLE_GRANT_DESC[4] = 'Verursacht DoT-Schaden an der Hülle des Feindes';
			this.SHIP_BATTLE_GRANT_DESC[16] = 'Schilde sind für einen bestimmten Zeitraum inaktiv';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE[0] = 'Erhöht den bonus boost um +%VAL%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[1] = 'Verursacht sofort %VAL% % Schaden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[2] = 'Repariert die Hülle sofort um %VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[3] = 'Repariert die Schilde sofort um %VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[4] = '+%VAL% auf kritische Treffer';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[5] = '+%VAL% auf kritischen Bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[6] = '+%VAL% auf Schildregeneration';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[7] = '+%VAL%% auf Angriffsgeschwindigkeit';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[8] = 'Erhöht den Enterschaden auf %VAL%%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[9] = 'Setzt feindliche Abklingzeiten zurück';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[10] = 'Beschleunigt Abklingzeiten um %VAL% Sekunden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[11] = 'Reduziert den erlittenen Hüllenschaden um %VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[12] = 'Verursacht beim Angreifer %VAL% % des erlittenen Schadens';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[0] = 'bonus boost um +%VAL%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[1] = '%VAL%% Schaden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[2] = '%VAL%% Hülle-Reparatur';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[3] = '%VAL%% Schilde-Reparatur';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[4] = '+%VAL% krit. Treffer';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[5] = '+%VAL% krit. Bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[6] = '+%VAL% Schildregen.';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[7] = '+%VAL%% Angriffsgeschwindigkeit';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[8] = '%VAL%% Enterschaden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[9] = 'Setzt feindliche Abklingzeiten zurück';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[10] = '+%VAL%s auf Abklingzeiten';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[11] = '-%VAL%% Hüllenschaden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[12] = '%VAL%% Reflexionsschäden';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[0] = 'Erhöht den Bonus-Boost';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[1] = 'Sofort Schaden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[2] = 'Repariert die Hülle sofort';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[3] = 'Repariert die Schilde sofort';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[4] = '+Kritische Treffer';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[5] = '+Kritischen Bonus';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[6] = '+Schildregeneration';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[7] = '+Angriffsgeschwindigkeit';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[8] = 'Erhöht den Enterschaden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[9] = 'Setzt feindliche Abklingzeiten zurück';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[10] = 'Beschleunigt Abklingzeiten';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[11] = 'Reduziert den erlittenen Hüllenschaden';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[12] = 'Reflexionsschäden';

			this.VOYAGE_SLOT_SKILLS.length = 0;
			this.VOYAGE_SLOT_SKILLS.push(
				"KOM",
				"KOM",
				"DIP",
				"DIP",
				"SIC",
				"SIC",
				"ING",
				"ING",
				"WIS",
				"WIS",
				"MED",
				"MED");
		}
		// SPANISH
		else if (l === 'sp' || l === 'es') {
			this.TRIPLET_TEXT = 'Trillizo';

			this.RARITIES.length = 0;
			this.RARITIES.push(
				{ name: 'Basico', color: 'Grey' },
				{ name: 'Común', color: rgbToHex(155, 155, 155) },
				{ name: 'Poco Común', color: rgbToHex(80, 170, 60) },
				{ name: 'Especiale', color: rgbToHex(90, 170, 255) },
				{ name: 'Excepcionale', color: rgbToHex(170, 45, 235) },
				{ name: 'Legendario', color: rgbToHex(253, 210, 106) }
			);

			this.MASTERY_LEVELS.length = 0;
			this.MASTERY_LEVELS.push(
				{ name: 'Normal', imageUrl: 'mastery_lowest_icon' },
				{ name: 'Élite', imageUrl: 'mastery_medium_icon' },
				{ name: 'Épico', imageUrl: 'mastery_highest_icon' }
			)

			this.SKILLS.command_skill = 'Mando';
			this.SKILLS.science_skill = 'Ciencia';
			this.SKILLS.security_skill = 'Seguridad';
			this.SKILLS.engineering_skill = 'Ingeniería';
			this.SKILLS.diplomacy_skill = 'Diplomacia';
			this.SKILLS.medicine_skill = 'Medicina';

			this.SKILLS_SHORT.length = 0;
			this.SKILLS_SHORT.push(
				{ name: 'command_skill', short: 'MND' },
				{ name: 'science_skill', short: 'CIE' },
				{ name: 'security_skill', short: 'SEG' },
				{ name: 'engineering_skill', short: 'ING' },
				{ name: 'diplomacy_skill', short: 'DIP' },
				{ name: 'medicine_skill', short: 'MED' }
			);
 // Equipamiento, Entrenamiento d experiencia de
			this.REWARDS_ITEM_TYPE[0] = 'Ninguna';
			this.REWARDS_ITEM_TYPE[1] = 'Tripulación';
			this.REWARDS_ITEM_TYPE[2] = 'Equipamiento';
			this.REWARDS_ITEM_TYPE[3] = 'Componente';
			this.REWARDS_ITEM_TYPE[4] = 'Aumentos';
			this.REWARDS_ITEM_TYPE[5] = 'Parte del buques';
			this.REWARDS_ITEM_TYPE[6] = 'Fichas de lanzadera';
			this.REWARDS_ITEM_TYPE[7] = 'Entrenamiento d experiencia de tripulación';
			this.REWARDS_ITEM_TYPE[8] = 'Diagrama de buque';
			this.REWARDS_ITEM_TYPE[9] = 'Ración de replicador';
			this.REWARDS_ITEM_TYPE[10] = 'Distinción de Honor';
			this.REWARDS_ITEM_TYPE[11] = 'Efecto';
			this.REWARDS_ITEM_TYPE[12] = 'Componente de base estalar';
			this.REWARDS_ITEM_TYPE[13] = 'Suministros del viaje';
			this.REWARDS_ITEM_TYPE[14] = 'Quipo de Continuo';
			this.REWARDS_ITEM_TYPE[15] = ' Q-Bits de Continuo';

			this.CREW_SHIP_BATTLE_BONUS_TYPE[0] = 'Ataque';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[1] = 'Evasión';
			this.CREW_SHIP_BATTLE_BONUS_TYPE[2] = 'Precisión';
			// These are only for penalty
			this.CREW_SHIP_BATTLE_BONUS_TYPE[3] = 'Regeneración de escudo';

			this.CREW_SHIP_BATTLE_TRIGGER[0] = 'Ninguna';
			this.CREW_SHIP_BATTLE_TRIGGER[1] = 'Posición';
			this.CREW_SHIP_BATTLE_TRIGGER[2] = 'Camuflado';
			this.CREW_SHIP_BATTLE_TRIGGER[4] = 'Abordaje';

			this.SHIP_BATTLE_GRANTS[0] = 'Ninguna';
			this.SHIP_BATTLE_GRANTS[1] = 'Posición';
			this.SHIP_BATTLE_GRANTS[2] = 'Camuflado';
			this.SHIP_BATTLE_GRANTS[4] = 'Abordaje';
			this.SHIP_BATTLE_GRANTS[16] = 'Distruptor de escudos';

			this.SHIP_BATTLE_GRANT_DESC[0] = 'Ninguna';
			this.SHIP_BATTLE_GRANT_DESC[1] = 'Aumenta tu probabilidad de infligir daño crítico';
			this.SHIP_BATTLE_GRANT_DESC[2] = 'Tu nave e impide que te marquen como objetivo';
			this.SHIP_BATTLE_GRANT_DESC[4] = 'Inflige daño continuado al casco del enemigo';
			this.SHIP_BATTLE_GRANT_DESC[16] = 'Los escudos enemigas quedan inoperativos durante un tiempo';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE[0] = 'Aumenta bonus boost en +%VAL%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[1] = 'Inflige un %VAL% % de daño de forma inmediata';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[2] = 'Repara el casco en un %VAL% % de forma inmediata';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[3] = 'Repara los escudos en un %VAL% % de forma inmediata';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[4] = '+%VAL% de frecuencia de crítico';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[5] = '+%VAL% de bonificación de crítico';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[6] = '+%VAL% de regeneración de escudo';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[7] = '+%VAL%^% de velocidad de ataque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[8] = 'Aumenta el daño por abordaje de %VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[9] = 'Restablece los contadores de recarga de los enemigos';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[10] = 'Acelera los contadores de recarga en %VAL% segundos';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[11] = 'Reduce los daños del casco recibidos en un %VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE[12] = 'Un %VAL% % del daño recibido también se le inflige al atacante';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[0] = 'bonus boost en +%VAL%';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[1] = '%VAL%% daño';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[2] = 'Repara el casco +%VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[3] = 'Repera los escudos +%VAL% %';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[4] = '+%VAL% frec. de crít';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[5] = '+%VAL% boni. de crít';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[6] = '+%VAL% regen. escudo';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[7] = '+%VAL%% velocidad';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[8] = '%VAL%% daño abordaje';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[9] = 'Restablece los contadores enemigos';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[10] = '+%VAL%s recarga contadores';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[11] = '-%VAL%% daños del casco';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT_FORMAT[12] = '%VAL%% daños de reflexión';

			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[0] = 'Impulso de bonificación';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[1] = 'Daños inmediata';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[2] = 'Repara le casco inmediata';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[3] = 'Repara los escudos inmediata';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[4] = '+Frecuencia de crítico';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[5] = '+Bonificación de crítico';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[6] = '+Regeneración de escudo';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[7] = '+Velocidad de ataque';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[8] = 'Aumenta el daño por abordaje';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[9] = 'Restablece los contadores de recarga de los enemigos';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[10] = 'Acelera los contadores de recarga';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[11] = 'Reduce los daños del casco';
			this.CREW_SHIP_BATTLE_ABILITY_TYPE_SHORT[12] = 'Daños de reflexión';

			this.VOYAGE_SLOT_SKILLS.length = 0;

			this.VOYAGE_SLOT_SKILLS.push(
				"MND",
				"MND",
				"DIP",
				"DIP",
				"SEG",
				"SEG",
				"ING",
				"ING",
				"CIE",
				"CIE",
				"MED",
				"MED");
		}
	}
}
