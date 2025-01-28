import { SemanticICONS } from 'semantic-ui-react';
import { PlayerCrew } from '../../model/player';

export interface BonusDetail {
	symbol: string;
	amount: number;
}
// Stripped down version of GameData extended for use in Event Planner and Shuttle Helper
export interface IEventData {
	symbol: string;
	name: string;
	description: string;
	bonus_text: string;
	content_types: string[];	/* shuttles, gather, etc. */
	seconds_to_start: number;
	seconds_to_end: number;
	image: string;
	bonus: string[];	/* ALL bonus crew by symbol */
	bonus_detail?: BonusDetail[];	/* High bonus crew by symbol (voyage events only) */
	featured: string[];	/* ONLY featured crew by symbol */
	bonusGuessed?: boolean;
	bonus_ship?: string[];
	featured_ship?: string[];
	bonus_ship_traits?: string[];
	primary_skill?: string;
	secondary_skill?: string;
};

export interface IRosterCrew extends PlayerCrew {
	shared?: boolean;
	statusIcon?: SemanticICONS;
};

export interface IEventScoredCrew extends IRosterCrew {
	combos: IEventCombos;
	bestSkill: IEventSkill;
	bestPair: IEventPair;
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
