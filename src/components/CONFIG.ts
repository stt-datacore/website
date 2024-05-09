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

	static readonly REWARDS_ITEM_TYPE: { [index: number]: string } = {
		0: 'None',
		1: 'Crew',
		2: 'Equipment',
		3: 'Component',
		4: 'Shuttle consumable',
		5: 'Ship part',
		6: 'Shuttle token',
		7: 'Crew experience training',
		8: 'Ship schematic',
		9: 'Replicator ration',
		10: 'Honorable citation',
		11: 'Buff',
		12: 'Starbase component',
		13: 'Voyage consumable',
		14: 'Continuum Quipment',
		15: 'Continuum Quipment Component'
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

	static readonly CITATION_COST = [0, 500, 4500, 18000, 50000];

	static readonly SERIES = [
		'tos', 'tas',
		'tng', 'ds9', 'voy', 'ent',
		'dsc', 'pic', 'low', 'snw', 'vst',
		'original'
	];
	
	static setLanguage(l: string) {
		if (l === 'en') {
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

			this.REWARDS_ITEM_TYPE[0] = 'None';
			this.REWARDS_ITEM_TYPE[1] = 'Crew';
			this.REWARDS_ITEM_TYPE[2] = 'Equipment';
			this.REWARDS_ITEM_TYPE[3] = 'Component';
			this.REWARDS_ITEM_TYPE[4] = 'Shuttle consumable';
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
			this.REWARDS_ITEM_TYPE[15] = 'Continuum Quipment Component';

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

		}
	
	
	}

}
