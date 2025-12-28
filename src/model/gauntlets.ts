import { CrewMember } from "./crew";
import { Icon } from "./game-elements";
import { GauntletPairScore, PlayerCrew } from "./player";

export interface PairGroup {
	pair: string[];
	crew: PlayerCrew[]
};

export interface Gauntlet {
    gauntlet_id?: number;
    state: string;
    jackpot_crew?: string;
    seconds_to_join?: number;
    contest_data?: ContestData;
    date: string;
    unavailable_msg?: string;
    unavailable_desc_msg?: string;
    searchCrew?: (PlayerCrew | CrewMember)[];
    allCrew?: (PlayerCrew | CrewMember)[];
    prettyTraits: string[] | undefined;
    origRanks?: { [key: string]: number };
    template?: boolean;
    maximal?: number;
    minimal?: number;
    pairMin?: GauntletPairScore[];
    pairMax?: GauntletPairScore[];

    bracket_id?: string;
    rank?: number;
    score?: number;
    seconds_to_next_crew_refresh?: number;
    seconds_to_next_opponent_refresh?: number;
    seconds_to_end?: number;
    consecutive_wins?: number;
    refresh_cost?: GauntletRefreshCost;
    revive_cost?: GauntletReviveCost;
    revive_and_save_cost?: GauntletReviveAndSaveCost;
    opponents?: Opponent[];
    sequence_id?: number;

    fromApi?: boolean;
}

export interface ContestData {
    featured_skill: string;
    primary_skill: string;
    traits: string[];
    crit_chance_per_trait: number;

    secondary_skill?: string;
    selected_crew?: SelectedCrew[];
    ranked_rewards?: RankedReward[];
    contest_rewards?: ContestReward[];
}

export interface GauntletRoot {
    action: string;
    character: GauntletCharacter;
}

export interface GauntletCharacter {
    id: number;
    gauntlets: Gauntlet[];
}

export interface GauntletRefreshCost {
    currency: number;
    amount: number;
}

export interface GauntletReviveCost {
    currency: number;
    amount: number;
}

export interface GauntletReviveAndSaveCost {
    currency: number;
    amount: number;
}

export interface SelectedCrew {
    crew_id: number;
    archetype_symbol: string;
    rarity: number;
    level: number;
    skills: GauntletSkill[];
    max_rarity: number;
    debuff: number;
    disabled: boolean;
    selected: boolean;
    crit_chance: number;
}

export interface GauntletSkill {
    skill: string;
    max: number;
    min: number;
}

export interface RankedReward {
    first: number;
    last: number;
    rewards: GauntletReward[];
    quantity: number;
    loot_box_rarity: number;
}

export interface GauntletReward {
    type: number;
    icon: Icon;
    quantity: number;
}

export interface ContestReward {
    streak_required: number;
    loot_box_rarity: number;
    quantity: number;
    win_interval?: number;
}

export interface Opponent {
    player_id: number;
    rank: number;
    value: number;
    level: number;
    icon: Icon2;
    name: string;
    crew_contest_data: CrewContestData;
    bracket_id?: string;
}

export interface Icon2 {
    file: string;
}

export interface CrewContestData {
    crew: GauntletContestCrew[];
}

export interface GauntletContestCrew {
    crew_id: number;
    archetype_symbol: string;
    rarity: number;
    level: number;
    skills: GauntletSkill[];
    max_rarity: number;
    debuff: number;
    disabled: boolean;
    selected: boolean;
    crit_chance: number;
}

export type GauntletViewMode = "big" | "small" | "table" | "pair_cards" | "opponent_table";

// export const SKILLS = {
//     command_skill: "CMD",
//     science_skill: "SCI",
//     security_skill: "SEC",
//     engineering_skill: "ENG",
//     diplomacy_skill: "DIP",
//     medicine_skill: "MED",
// };

export interface PairGroup {
    pair: string[];
    crew: PlayerCrew[];
}

export type OwnedStatus =
    | "any"
    | "maxall"
    | "owned"
    | "unfrozen"
    | "unowned"
    | "ownedmax"
    | "nofe"
    | "nofemax"
    | "fe"
    | "portal"
    | "gauntlet"
    | "nonportal";

export interface GauntletFilterProps {
    ownedStatus?: OwnedStatus;
    rarity?: number;
    maxResults?: number;
    skillPairs?: string[];
}
