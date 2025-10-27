import { SemanticICONS } from 'semantic-ui-react';
import { Content, PlayerCrew } from '../../model/player';
import { IEventData as IOrigEventData } from '../../model/events';
// Stripped down version of GameData, extended and standardized for DataCore tools
//	Baseline props are event type agnostic, containing only common event props and standardized event crew/ship lists
//	activeContent holds details about the active phase of a started event or the first phase of an unstarted event
//	Be careful when using activeContent, especially when trying to access details about an unstarted phase 2 of a hybrid event
export interface IEventData extends IOrigEventData {
	symbol: string;
	name: string;
	description: string;
	bonus_text: string;
	content_types: string[];	/* shuttles, gather, etc. */
	seconds_to_start: number;
	seconds_to_end: number;
	image: string;
	bonus: string[];	/* ALL bonus crew by symbol */
	featured: string[];	/* ONLY featured crew by symbol */
	bonus_ships: string[];	/* ALL bonus ships by symbol */
	featured_ships: string[];	/* ONLY featured ships by symbol */
	bonusGuessed?: boolean;
	activeContent?: Content;
	mega_crew?: string;
};

export interface IRosterCrew extends PlayerCrew {
	borrowed?: boolean;
	statusIcon?: SemanticICONS;
};

export interface IEventScoredCrew extends IRosterCrew {
	combos: IEventCombos;
	bestSkill: IEventSkill;
	bestPair: IEventPair;
	encounter_traits?: string[];
};

export interface IEventCombos {
	[key: string]: number;
};

export interface IEventSkill {
	score: number;
	skill: string;
};

export interface IEventPair {
	score: number;
	skillA: string;
	skillB: string;
};

export interface IBestCombo {
	id: number;
	score: number;
};

export interface IBestCombos {
	[key: string]: IBestCombo;
};
