import { Reward } from './player';
import { Icon } from './game-elements';
import { Action as ShipAction } from './crew';

export interface BossBattlesRoot {
    env: BossConfig
    statuses: FleetBoss[]
    fleet_boss_battles_energy: FleetBossBattlesEnergy
    groups: BossGroup[]
  }
  
  export interface BossConfig {
    enabled: boolean
    battle_start_restricted_by_rank: boolean
  }
  
  export interface FleetBoss {
    desc_id: number
    symbol: string
    group: string
    blocker_boss?: string
    duration: number
    place: string
    boss_ship: BossShip
    difficulty_id: number
    attack_energy_cost: AttackEnergyCost
    card_icon: Icon
    damage_rewards: DamageReward[]
    destruction_rewards: DestructionReward[]
    id?: number
    ends_in?: number
    hp?: number
    combo?: Combo
    creator_character?: CreatorCharacter
    blocked_by_another_boss?: boolean
  }
  
  export interface BossShip {
    icon: Icon
    archetype_id: number
    symbol: string
    ship_name: string
    rarity: number
    shields: number
    hull: number
    evasion: number
    attack: number
    accuracy: number
    crit_chance: number
    crit_bonus: number
    attacks_per_second: number
    shield_regen: number
    actions: ShipAction[]
  }
  
  export interface AttackEnergyCost {
    currency: number
    amount: number
  }
  
  export interface BossReward extends Reward {
    type: number
    id: number
    symbol: string
    item_type?: number
    name: string
    full_name: string
    flavor: string
    quantity: number
    rarity: number
  }

  export interface DamageReward {
    threshold: number
    rewards: BossReward[]
  }
  
  export interface DestructionReward {
    threshold: number
    rewards: BossReward[]
  }
  
  export interface Combo {
    id?: string;
    source?: string;
    difficultyId?: number;
    nodes: ComboNode[]
    traits: string[]
    restart_number: number
    restart_limit: number
    damage: number
    active_effects: BossEffect[]
    next_effect: BossEffect
    previous_node_counts: number[]
    reroll_count: number
    reroll_limit: number
    reroll_price: RerollPrice
  }
  
  export interface ComboNode {
    open_traits: string[]
    hidden_traits: string[]
    unlocked_character?: UnlockedCharacter
    unlocked_crew_archetype_id?: number
  }
  
  export interface UnlockedCharacter {
    name: string
    crew_avatar_icon: Icon
    is_current: boolean
  }
  
  export interface BossEffect {
    icon: Icon
    icon_color: string
    description: string
    value: number
    multiplier: number
    min_value: number
    max_value: number
    string_format: string
  }
  
  export interface RerollPrice {
    currency: number
    amount: number
  }
  
  export interface CreatorCharacter {
    name: string
    icon: Icon
  }
  
  export interface FleetBossBattlesEnergy {
    id: number
    quantity: number
    regeneration: Regeneration
    regenerated_at: number
  }
  
  export interface Regeneration {
    increment: number
    interval_seconds: number
    regeneration_cap: number
  }
  
  export interface BossGroup {
    symbol: string
    name: string
  }
  