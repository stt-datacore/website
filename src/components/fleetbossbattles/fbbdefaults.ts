import { ExportPreferences, SoloPreferences, SpotterPreferences, UserPreferences } from '../../model/boss';

export const userDefaults = {
	view: 'crewgroups',
	pollInterval: 0
} as UserPreferences;

export const spotterDefaults = {
	alpha: 'flag',
	onehand: 'flag',
	nonoptimal: 'hide',
	noncoverage: 'show',
	confirmSolves: false,
	hideUnpublishedCrew: false
} as SpotterPreferences;

export const soloDefaults = {
	usable: '',
	shipAbility: 'hide'
} as SoloPreferences;

const FLAG_ONEHAND = '\u03A8';
const FLAG_ALPHA = '\u03B1';
const FLAG_UNIQUE = '\u00B5';
const FLAG_NONOPTIMAL = '\u03B9';

export const exportDefaults = {
	header: 'always',
	solve: 'hide',
	node_format: 'bold',
	node_traits: 'show',
	bullet: 'simple',
	delimiter: ',',
	coverage_format: 'italic',
	crew_traits: 'show',
	duplicates: 'number',
	flag_onehand: FLAG_ONEHAND,
	flag_alpha: FLAG_ALPHA,
	flag_unique: FLAG_UNIQUE,
	flag_nonoptimal: FLAG_NONOPTIMAL
} as ExportPreferences;
