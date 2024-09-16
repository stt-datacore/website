import { BaseSkills } from './crew';
import { CrewSlot, PlayerCrew, VoyageCrewSlot, VoyageSkills } from './player';

// Voyage calculator require crew.skills
export interface IVoyageCrew extends PlayerCrew {
	skills: BaseSkills;
};

// The slimmest possible version of voyageConfig, as expected as input by calculator
//	Use Voyage for a config from player data when voyage started
//	Use VoyageDescription for a config from player data when voyage not yet started
export interface IVoyageInputConfig {
	skills: VoyageSkills;
	ship_trait: string;
	crew_slots: CrewSlot[];
	voyage_type: 'dilemma' | 'encounter';
	high_bonus?: string[];
	low_bonus?: string[];
};

// Extends IVoyageInputConfig to include calculation result
export interface IVoyageCalcConfig extends IVoyageInputConfig {
	state: string;
	max_hp: number;
	skill_aggregates: BaseSkills;
	crew_slots: VoyageCrewSlot[];
};

export interface IVoyageHistory {
	voyages: ITrackedVoyage[];
	crew: ITrackedAssignmentsByCrew;
};

export interface ITrackedVoyage {
	tracker_id: number;	// Used to match tracked voyage with tracked crew
	voyage_id: number;	// Used to match tracked voyage with in-game voyage
	skills: VoyageSkills;
	ship_trait: string;
	ship: string;
	max_hp: number;
	skill_aggregates: BaseSkills;
	estimate: ITrackedFlatEstimate;
	created_at: number;	// Date.now() | voyage.created_at
	checkpoint: ITrackedCheckpoint;
	revivals: number;
};

export interface ITrackedFlatEstimate {
	median: number;
	minimum: number;
	moonshot: number;
	dilemma: {
		hour: number;
		chance: number;
	};
};

export interface ITrackedCheckpoint {
	state: string;
	runtime: number;
	hp: number;
	estimate: ITrackedFlatEstimate;
	checked_at: number;	// Date.now()
};

export interface ITrackedAssignmentsByCrew {
	[key: string]: ITrackedAssignment[];	// key is crew.symbol
};

export interface ITrackedAssignment {
	tracker_id: number;
	slot: number;	// Slot index where crew is seated
	trait: string;	// Matched trait or empty string if no match
};

export interface ITrackedAssignmentsBySkill {
	[key: string]: {
		ids: number[],
		usage: number
	};
};

export interface ITrackedCrewMember extends PlayerCrew {
	assignments: ITrackedAssignment[];
	average_estimate: number;
	skill_assignments: ITrackedAssignmentsBySkill;
	last_assignment: {
		tracker_id: number,
		created_at: number
	};
};
