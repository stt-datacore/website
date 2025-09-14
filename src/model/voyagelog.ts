import { BaseSkills } from "./crew"
import { Icon } from "./game-elements"
import { Ship, ShipAction } from "./ship"

export type VoyageLogRoot = [VoyageData, NarrativeData];

export interface VoyageData {
    action: string
    character: Character
}

export interface NarrativeData {
    action: string
    voyage_narrative: VoyageNarrative[]
}

export interface VoyageLog {
    action: string
    character?: Character
    voyage_narrative?: VoyageNarrative[]
}

export interface Character {
    id: number
    voyage: Voyage[]
}

export interface Voyage {
    id: number
    hp: number
    log_index: number
    seconds_since_last_dilemma: number
    state: string
    voyage_duration: number
    time_to_next_event: number
}

export interface VoyageNarrative {
    index: number
    text: string
    encounter_type: string
    event_time: number
    crew?: string[]
    skill_check?: SkillCheck
    rewards?: Rewards
    selection?: number;
    selection_var?: string;
}

export interface SkillCheck {
    skill: string
    passed: boolean
}

export interface Rewards {
    loot: Loot[]
}

export interface Loot {
    type: number
    id: number
    symbol: string
    name: string
    full_name: string
    flavor?: string
    icon: Icon
    quantity: number
    rarity: number
    portrait?: Icon
    full_body?: Icon
    skills?: BaseSkills
    traits?: string[]
    action?: ShipAction
    ship?: Ship
    item_type?: number
}
