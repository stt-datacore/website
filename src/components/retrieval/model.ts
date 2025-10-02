import { KeystoneBase, PolestarFilter } from '../../model/game-elements';
import { PlayerCrew } from '../../model/player';

// Keystone (i.e. constellations AND polestars) with quantity owned
export interface IKeystone extends KeystoneBase {
	owned: number;
};

// Polestar with odds
export interface IPolestar extends IKeystone {
	type: 'keystone';
	filter: PolestarFilter;
	crew_count: number;
	scan_odds: number;
	crate_count: number;
	owned_crate_count: number;
	owned_best_odds: number;
	owned_total_odds: number;
};

export interface IConstellation extends IKeystone {
	type: 'keystone_crate' | 'crew_keystone_crate';
	keystones: number[];
};

export enum RetrievableState {
	Viable = 1,		// Uniquely retrievable
	NonUnique,		// In portal, but not uniquely retrievable
	InFuture,		// Not yet in portal
	Expiring,       // Will soon not be uniquely retrievable
	Never			// Exclusive crew that will never be retrievable
};

export enum ActionableState {
	None,		// Inventory unknown (i.e. no playerData)
	PostTailor,	// User can retrieve only after tailoring inventory (i.e. owned polestars - disabled + added)
	Now,		// User can retrieve immediately with currently owned polestars
	PreTailor,	// User can no longer retrieve after tailoring inventory
	Viable,		// Viable retrieval, but needed polestars are unowned or unadded
	NonViable	// Not retrievable (i.e. nonunique or not in portal)
};

export interface IRosterCrew extends PlayerCrew {
	retrievable: RetrievableState;
	actionable: ActionableState;
	alt_source: string;
	highest_owned_rarity: number;
	highest_owned_level: number;
	progressable_collections: string[];
};

export interface IPolestarTailors {
	disabled: number[];
	added: string[];
};

export interface ICrewFilters {
	retrievable: string;
	owned: string;
	hideFullyFused: boolean;
	rarity: number[];
	trait: string[];
	minTraitMatches: number;
	collection: string;
};

export type CrewFilterField =
	'retrievable' |
	'owned' |
	'hideFullyFused' |
	'rarity' |
	'trait' |
	'minTraitMatches' |
	'collection';
