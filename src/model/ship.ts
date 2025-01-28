import { BossEffect } from "./boss";
import { CrewMember } from "./crew";
import { Icon } from "./game-elements";
import { CompletionState, PlayerCrew } from "./player";


export interface Schematics {
  id: number;
  icon: Icon;
  cost: number;
  ship: Ship;
  rarity: number;
}

/** Ship bonuses.  Ship derives from this, and PlayerCrew/CrewMember directly reference this */
export interface ShipBonus {
  accuracy?: number;
  evasion?: number;
  crit_chance?: number;
  crit_bonus?: number;
}


export interface ShipLevels {
  "1": ShipLevelStats
  "2": ShipLevelStats
  "3": ShipLevelStats
  "4": ShipLevelStats
  "5": ShipLevelStats
  "6": ShipLevelStats
  "7"?: ShipLevelStats
  "8"?: ShipLevelStats
  "9"?: ShipLevelStats
  "10"?: ShipLevelStats
}

export interface ShipLevelStats {
  shields: number
  hull: number
  attack: number
  accuracy: number
  evasion: number
  attack_power: number
  attacks_per_second: number
  dps: any
  accuracy_power: number
  evasion_power: number
  accuracy_evasion: any
  shield_regen: number
  crit_chance: number
  crit_bonus: number
  antimatter: number
  next_schematics: number
}

/**
 * Ship
 */
export interface Ship extends ShipBonus {
  archetype_id?: number;
  symbol: string;
  name?: string;
  rarity: number;
  icon?: Icon;
  flavor?: string;
  model?: string;
  max_level?: number;
  actions?: ShipAction[];
  shields: number;
  hull: number;
  attack: number;
  evasion: number;
  accuracy: number;
  crit_chance: number;
  crit_bonus: number;
  attacks_per_second: number;
  shield_regen: number;
  traits?: string[];
  traits_hidden?: string[];
  antimatter: number;
  id: number;
  level: number;
  schematic_gain_cost_next_level?: number;
  schematic_id?: number;
  schematic_icon?: Icon;
  battle_stations?: BattleStation[];
  traits_named?: string[];
  owned?: boolean;
  tier?: number;
  index?: { left: number, right: number };
  immortal?: CompletionState | number;
  score?: number;
  levels?: ShipLevels;
}


export interface BattleStation {
  skill: string;
  crew?: PlayerCrew | CrewMember;
}

export interface ShipAction {
  bonus_amount: number;
  name: string;
  symbol: string;
  cooldown: number;
  initial_cooldown: number;
  duration: number;

  /** Used internally. Not part of source data. */
  cycle_time: number;

  bonus_type: number;
  crew: number;
  crew_archetype_id: number;
  icon: Icon;
  special: boolean;
  penalty?: Penalty;
  limit?: number;
  status?: number;
  ability?: Ability;
  charge_phases?: ChargePhase[];

  ability_text?: string;
  ability_trigger?: string;
  charge_text?: string;

  /** Not part of data, used internally */
  source?: string;
}

export interface Penalty {
  type: number;
  amount: number;
}

export interface Ability extends Penalty {
  condition: number;
}

export interface ChargePhase {
  charge_time: number;
  ability_amount?: number;
  cooldown?: number;
  bonus_amount?: number;
  duration?: number;
}

export interface BattleStations {
	symbol: string;
	battle_stations: BattleStation[]
}

export type PvpDivision = 'commander' | 'captain' | 'admiral';

export type BattleMode = 'pvp' | 'skirmish' | 'fbb_0' | 'fbb_1' | 'fbb_2' | 'fbb_3' | 'fbb_4' | 'fbb_5';


export interface ShipInUse {
    battle_mode: BattleMode;
    pvp_division?: PvpDivision;
    ship: Ship;
    rarity: number;
}

export type ShipRankingMethod = 'standard' | 'min' | 'max' | 'delta_t' | 'early_boom' | 'lean_in' | 'lean_over' | 'lean_out';

export interface AdvancedCrewPower {
  attack_depth: number | null;
  evasion_depth: number | null;
  accuracy_depth: number | null;
  ability_depths: (number | null)[];
  ability_exclusions: boolean[];
}

export const DefaultAdvancedCrewPower = {
  attack_depth: null,
  evasion_depth: null,
  accuracy_depth: null,
  ability_depths: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ability_exclusions: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
} as AdvancedCrewPower;

export interface AdvancedCrewPowerConfig {
    defaultOptions: AdvancedCrewPower;
    current: AdvancedCrewPower;
    setCurrent: (value: AdvancedCrewPower) => void;
}

export interface ShipWorkerConfigBase {
    ranking_method: ShipRankingMethod,
    event_crew?: CrewMember,
    crew: CrewMember[],
    battle_mode: BattleMode,
    rate: number,
    simulate: boolean,
    fixed_activation_delay: number,
    power_depth?: number,
    max_rarity?: number,
    min_rarity?: number,
    opponents?: Ship[],
    action_types?: number[],
    ability_types?: number[],
    max_results?: number
    defense?: number;
    offense?: number;
    get_attacks?: boolean;
    effects?: BossEffect[];
    max_duration?: number;
    ignore_skill?: boolean;
    verbose?: boolean;
    max_iterations?: bigint;
    activation_offsets?: number[];
    start_index?: bigint;
    status_data_only?: boolean;
    opponent_variance?: number;
}

export interface ShipWorkerConfig extends ShipWorkerConfigBase {
    ship: Ship,
}

export interface MultiShipWorkerConfig extends ShipWorkerConfigBase {
    ships: Ship[],
}


export interface AttackInstant {
  actions: ShipAction[];
  second: number;
  hull: number;
  shields: number;
  attack: number;
  min_attack: number;
  max_attack: number;
  ship: Ship;
}


export interface ShipWorkerItem {
    id: number;
    rate: number;
    battle_mode: BattleMode;
    ship: Ship,
    crew: CrewMember[]
    attack: number;
    min_attack: number;
    max_attack: number;
    battle_time: number;
    weighted_attack: number;
    arena_metric: number;
    fbb_metric: number;
    skirmish_metric: number;
    percentile: number;
    attacks?: AttackInstant[];
}

export interface ShipWorkerResults {
    ships: ShipWorkerItem[]
    total_iterations: bigint;
    run_time: number;
}