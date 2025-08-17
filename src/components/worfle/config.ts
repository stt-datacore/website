export const SERIES_ERAS: { series: string, title: string, era: number }[] = [
	// Classic era
	{ series: 'tos', title: 'The Original Series', era: 1 },
	{ series: 'tas', title: 'The Animated Series', era: 1 },
	// Next gen era
	{ series: 'tng', title: 'The Next Generation', era: 2 },
	{ series: 'ds9', title: 'Deep Space Nine', era: 2 },
	{ series: 'voy', title: 'Voyager', era: 2 },
	{ series: 'ent', title: 'Enterprise', era: 2 },
	// Streaming era
	{ series: 'dsc', title: 'Discovery', era: 3 },
	{ series: 'pic', title: 'Picard', era: 3 },
	{ series: 'low', title: 'Lower Decks', era: 3 },
	{ series: 'snw', title: 'Strange New Worlds', era: 3 },
	{ series: 'vst', title: 'Very Short Treks', era: 3 },
	// Misc
	{ series: 'original', title: 'Timelines Originals', era: 0 },
];

// Crew with missing, multiple, or inconsistent series will NEVER be solutions
//	Adding to this list will NOT affect consistency of seedrandom
export const INVALID_SERIES: string[] = [
	/* Missing series */
	'data_mirror_crew',			// correct: 'tng', audit: '+'

	/* Multiple series (excluding Timelines Originals) */
	'borg_queen_crew',			// correct: 'tng', audit: '-voy, -pic'
	'riker_chef_crew',			// correct: 'ent', audit: '-tng'
	'obrien_wwii_crew',			// correct: 'ds9', audit: '-tng'
	'uhura_rescue_crew tas',	// correct: 'tas', audit: '-tos'

	/* Inconsistent with canon */
	'cartwright_crew',			// correct: 'tos', audit: '-tng'
	'chang_general_crew',		// correct: 'tos', audit: '-tng'
	'earp_wyatt_crew',			// correct: 'tos', audit: '-tng'
	'janeway_admiral_crew',		// correct: 'tng', audit: '-voy'
	'keiko_bride_crew',			// correct: 'tng', audit: '-ds9'
	'kirk_generations_crew',	// correct: 'tng', audit: '-tos'
	'laforge_captain_crew',		// correct: 'voy', audit: '-tng'
	'marcus_wok_crew',			// correct: 'tos', audit: '-tng'
	'scott_movievest_crew',		// correct: 'tng', audit: '-tos'
	'spock_ambassador_crew',	// correct: 'tng', audit: '-tos'
	'sulu_demora_ensign_crew',	// correct: 'tng', audit: '-tos'
	'tpring_spock_crew',		// correct: 'snw', audit: '-tos'
	'trul_subcommander_crew',	// correct: 'ds9', audit: '-tng'
	'worf_midwife_crew',		// correct: 'tng', audit: '-ds9'
];

export const DAX_FIXES: { short_name: string, variant: string }[] = [
	{ short_name: 'C. Dax', variant: '_curzon' },
	{ short_name: 'E. Dax', variant: '_ezri' },
	{ short_name: 'J. Dax', variant: '_jadzia' }
];

export const DISPLAY_NAME_FIXES: { variant: string, display_name: string }[] = [
	{ variant: '_curzon', display_name: 'Curzon' },
	{ variant: '_ezri', display_name: 'Ezri' },
	{ variant: '_jadzia', display_name: 'Jadzia' },
	{ variant: 'amanda_grayson', display_name: 'Amanda Grayson' },
	{ variant: 'dax', display_name: 'Dax' },
	{ variant: 'emh', display_name: 'EMH' },	// EMH preferred over Doctor
	{ variant: 'jack', display_name: 'Jack Crusher' }
];

export const USABLE_HIDDEN_TRAITS: string[] = [
	'female', 'male'
];

export const USABLE_COLLECTIONS: string[] = [
	'A Little Stroll',
	'A New Challenger Approaches',
	'Animated',
	'Badda-Bing, Badda-Bang',
	'Bride of Chaotica',
	'Class A Dress',
	'Convergence Day',
	'Delphic Expanse',
	'Elysian Kingdom',
	'Holodeck Enthusiasts',
	'Melting Hearts',
	'Our Man Bashir',
	'Pet People',
	'Play Ball!',
	'Set Sail!',
	'Sherwood Forest',
	'The Big Goodbye',
	'The Wild West'
];
