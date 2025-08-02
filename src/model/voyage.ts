// import { Helper } from '../components/voyagecalculator/helpers/Helper';
import { VPDetails } from '../utils/voyagevp';
import { BaseSkills, CrewMember } from './crew';
import { Icon } from './game-elements';
import { Aggregates, CrewSlot, PendingRewards, PlayerCrew, Reward, VoyageCrewSlot, VoyageSkills } from './player';
import { Ship } from './ship';
import { VoyageNarrative as Narrative } from './voyagelog';
// Voyage calculator require crew.skills
export interface IVoyageCrew extends PlayerCrew {
	skills: BaseSkills;
	active_voyage_type?: 'dilemma' | 'encounter';
};

// The slimmest possible version of voyageConfig, as expected as input by calculator
//	Use Voyage for a config from player data when voyage started
//	Use VoyageDescription for a config from player data when voyage not yet started
export interface IVoyageInputConfig {
	voyage_type: 'dilemma' | 'encounter';
	skills: VoyageSkills;
	ship_trait: string;
	crew_slots: CrewSlot[];
	event_content?: IVoyageEventContent;
};

// Support for event voyage info
export interface IVoyageEventContent extends VoyageEncounterCommon {
	primary_skill: string;
	secondary_skill: string;
	encounter_traits?: string[];
    encounter_times?: number[];
};

// Extends IVoyageInputConfig to include calculation result
export interface IVoyageCalcConfig extends IVoyageInputConfig {
	state: string;
	max_hp: number;
	skill_aggregates: Aggregates;
	crew_slots: VoyageCrewSlot[];
};

export interface IVoyageRequest {
	id: string;
	type: 'calculation' | 'edit' | 'custom';
	voyageConfig: IVoyageInputConfig;
	bestShip: IBestVoyageShip;
	consideredCrew: IVoyageCrew[];
	calcHelper?: any;
};

export interface IBestVoyageShip {
	ship: Ship;
	score: number;
	traited: boolean;
	bestIndex: number;
	archetype_id: number;
};

export interface IVoyageResult {
	id: string;
	requestId: string;
	name: string;
	calcState: number;
	proposal?: IResultProposal;
	trackState?: number;
	confidenceState?: number;
	errorMessage?: string;
	telemetrySent?: boolean;
};

export interface IResultProposal {
	estimate: Estimate;
	entries: IProposalEntry[];
	aggregates: Aggregates;
	startAM: number;
	eventCrewBonus: number;
};

export interface Estimate {
	refills: Refill[];
	dilhr20: number;
	refillshr20: number;
	final: boolean;
	deterministic?: boolean;
	antimatter?: number;
	vpDetails?: VPDetails;
};

export interface Refill {
	all: number[];
	result: number;
	safeResult: number;
	saferResult: number;
	moonshotResult: number;
	lastDil: number;
	dilChance: number;
	refillCostResult: number;
};

export interface IProposalEntry {
	slotId: number;
	choice: PlayerCrew;
	hasTrait: boolean | number;
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
	skill_aggregates: Aggregates;
	estimate: ITrackedFlatEstimate;
	created_at: number;	// Date.now() | voyage.created_at
	checkpoint: ITrackedCheckpoint;
	revivals: number;
    lootcrew: string[];
    remote?: boolean;
    orphan?: boolean;
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
	kwipment?: number[] | number[][];
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

export interface ITrackedVoyageRecord {
    dbid: number;
    trackerId: number;
    voyage: ITrackedVoyage;
    timeStamp: Date;
}

export interface ITrackedCrewRecord {
    dbid: number;
    crew: string;
    trackerId: number;
    assignment: ITrackedAssignment;
    timeStamp: Date;
}

export interface ITrackedDataRecord {
    voyages: ITrackedVoyageRecord[];
    assignments: ITrackedCrewRecord[];
}

export interface IFullPayloadAssignment extends ITrackedAssignment {
	crew: string;
	kwipment?: number[] | number[][];
};

export interface ITrackedPayload {
	dbid: number;
	voyage: ITrackedVoyage;
	assignments: IFullPayloadAssignment[];
};

export const AntimatterSeatMap =  [
    {
        "name": "astrophysicist",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "science_skill"
        ]
    },
    {
        "name": "bajoran",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "borg",
        "skills": [
            "engineering_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "brutal",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "cardassian",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "caregiver",
        "skills": [
            "diplomacy_skill",
            "medicine_skill"
        ]
    },
    {
        "name": "civilian",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "medicine_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "communicator",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "costumed",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "crafty",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "cultural_figure",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "cyberneticist",
        "skills": [
            "engineering_skill",
            "science_skill"
        ]
    },
    {
        "name": "desperate",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "diplomat",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "doctor",
        "skills": [
            "diplomacy_skill",
            "medicine_skill",
            "science_skill"
        ]
    },
    {
        "name": "duelist",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "exobiology",
        "skills": [
            "science_skill"
        ]
    },
    {
        "name": "explorer",
        "skills": [
            "command_skill",
            "engineering_skill",
            "security_skill"
        ]
    },
    {
        "name": "federation",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "medicine_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "ferengi",
        "skills": [
            "diplomacy_skill"
        ]
    },
    {
        "name": "gambler",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "hero",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "hologram",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "medicine_skill",
            "science_skill"
        ]
    },
    {
        "name": "human",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "medicine_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "hunter",
        "skills": [
            "command_skill",
            "security_skill"
        ]
    },
    {
        "name": "innovator",
        "skills": [
            "command_skill",
            "engineering_skill",
            "science_skill"
        ]
    },
    {
        "name": "inspiring",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "jury_rigger",
        "skills": [
            "command_skill",
            "engineering_skill",
            "security_skill"
        ]
    },
    {
        "name": "klingon",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "marksman",
        "skills": [
            "security_skill"
        ]
    },
    {
        "name": "maverick",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "mirror_universe",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "nurse",
        "skills": [
            "medicine_skill"
        ]
    },
    {
        "name": "pilot",
        "skills": [
            "command_skill",
            "engineering_skill",
            "security_skill"
        ]
    },
    {
        "name": "prodigy",
        "skills": [
            "engineering_skill",
            "science_skill"
        ]
    },
    {
        "name": "resourceful",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "romantic",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "romulan",
        "skills": [
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "saboteur",
        "skills": [
            "command_skill",
            "security_skill"
        ]
    },
    {
        "name": "scoundrel",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "starfleet",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "medicine_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "survivalist",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "tactician",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "engineering_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "telepath",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "undercover_operative",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "science_skill",
            "security_skill"
        ]
    },
    {
        "name": "veteran",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "villain",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "security_skill"
        ]
    },
    {
        "name": "vulcan",
        "skills": [
            "command_skill",
            "diplomacy_skill",
            "science_skill",
            "security_skill"
        ]
    }
];

// The following are all modeled directly from game data

export interface VoyageEncounterCommon {
	voyage_symbol: string;	// encounter_voyage
	antimatter_bonus_per_crew_trait: number;
	antimatter_bonus_crew_traits: string[];
	antimatter_bonus_for_featured_crew: number;
	featured_crews: string[];
	antimatter_bonus_per_ship_trait: number;
	antimatter_bonus_ship_traits: string[];
	antimatter_bonus_for_featured_ship: number;
	featured_ships: string[];
};

// POST: https://app.startrektimelines.com/voyage/refresh
//	Required params: voyage_status_id
//	Optional params: new_only, client_api
//	Response: VoyageRefreshData[]

export interface VoyageRefreshData {
	action: 'update' | 'ephemeral';
	character?: VoyageRefreshCharacter;
	voyage_narrative?: VoyageNarrative[];
	rewards?: PendingRewards;
};

export interface VoyageRefreshCharacter {
	id: number;
	voyage: VoyageRefreshVoyage[];
};

export interface VoyageRefreshVoyage {
	id: number;
	seconds_since_last_dilemma: number;
	state: string;	// started
	voyage_duration: number;
	hp: number;
	time_to_next_event: number;
	log_index?: number;	// Dilemma voyages only
	encounter?: VoyageRefreshEncounter;	// Encounter voyages only
};

export interface VoyageRefreshEncounter extends VoyageEncounterCommon {
	id: number;
	character_id: number;
	state: string;	// unresolved
	contests_data: EncounterContest[];
	traits: string[];
	encounter_vp_multiplier: number;
	contests_count: number;
	increment_prof: number;
	skills: EncounterStartingSkills;
	contest_antimatter_penalty: number;
	revive_cost: EncounterReviveCost;
};

export interface EncounterContest {
	desc_id: number;
	icon: Icon;
	title_reference: string;
	narrative_reference: string;
	skills: EncounterContestSkills;
	state: string;	// unresolved, succeed
	boss_min_prof?: number;
	boss_max_prof?: number;
	boss_crit_chance?: number;
};

export interface EncounterContestSkills {
	primary_skill: string;
	secondary_skill?: string;
};

export interface EncounterStartingSkills {
	[key: string]: EncounterStartingSkill;	// key is command_skill, etc
};

export interface EncounterStartingSkill {
	min_prof: number;
	max_prof: number;
};

export interface EncounterReviveCost {
	currency: number;
	amount: number;
};

export interface VoyageNarrative {
	index: number;
	text: string;
	encounter_type: string;
	event_time: number;
	crew: string[];	// crew symbol
};

export interface DilemmaChoice {
    text: string,
    reward: string[];
    parsed?: {
        rarity?: number;
        crew?: CrewMember;
        chrons?: number;
        merits?: number;
        honor?: number;
        behold?: boolean;
        schematics?: number;
    }
}

export interface Dilemma {
    title: string;
    choiceA: DilemmaChoice;
    choiceB: DilemmaChoice;
    choiceC?: DilemmaChoice;
    narrative?: Narrative;
    rarity?: number;
}