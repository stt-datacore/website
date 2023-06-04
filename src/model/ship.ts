import { Icon } from "./game-elements";


export interface Schematics {
  id: number;
  icon: Icon;
  cost: number;
  ship: Ship;
  rarity: number;
}

export interface Ship {
  archetype_id?: number;
  symbol: string;
  name?: string;
  rarity: number;
  icon?: Icon;
  flavor?: string;
  model?: string;
  max_level?: number;
  actions?: Action[];
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
  traits_hidden?: any[];
  antimatter: number;
  id: number;
  level: number;
  schematic_gain_cost_next_level?: number;
  schematic_id?: number;
  schematic_icon?: Icon;
  battle_stations?: BattleStation[];
  traits_named?: string[];
  owned?: boolean;
}

export interface BattleStation {
  skill: string;
}


export interface ShipBonus {
  accuracy?: number;
  evasion?: number;
  crit_chance?: number;
  crit_bonus?: number;
}

export interface Action {
  bonus_amount: number;
  name: string;
  symbol: string;
  cooldown: number;
  initial_cooldown: number;
  duration: number;
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
