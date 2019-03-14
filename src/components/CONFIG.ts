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

	static readonly SKILLS_SHORT: { [index: string]: string } = {
		command_skill: 'CMD',
		science_skill: 'SCI',
		security_skill: 'SEC',
		engineering_skill: 'ENG',
		diplomacy_skill: 'DIP',
		medicine_skill: 'MED'
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
