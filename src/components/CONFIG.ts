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
		{name: 'command_skill', short: 'CMD'},
		{name: 'science_skill', short: 'SCI'},
		{name: 'security_skill', short: 'SEC'},
		{name: 'engineering_skill', short: 'ENG'},
		{name: 'diplomacy_skill', short: 'DIP'},
		{name: 'medicine_skill', short: 'MED'}
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
		13: 'Voyage consumable'
	};

	static readonly CREW_SHIP_BATTLE_BONUS_TYPE: { [index: number]: string } = {
		0: 'Attack',
		1: 'Evasion',
		2: 'Accuracy',
		// These are only for penalty
		3: 'Shield Regeneration'
	};

	static readonly CREW_SHIP_BATTLE_TRIGGER: { [index: number]: string } = {
		0: 'None',
		1: 'Position',
		2: 'Cloak',
		4: 'Boarding'
	};

	static readonly CREW_SHIP_BATTLE_ABILITY_TYPE: { [index: number]: string } = {
		0: 'Increase bonus boost by +%VAL%',
		1: 'Immediately deals %VAL%% damage',
		2: 'Immediately repairs Hulls by %VAL%%',
		3: 'Immediately repairs Shields by %VAL%%',
		4: '+%VAL% to Crit Rating',
		5: '+%VAL% to Crit Bonus',
		6: 'Shield regeneration +%VAL%',
		7: '+%VAL%% to Attack Speed',
		8: 'Increase boarding damage by %VAL%%'
	};
}
