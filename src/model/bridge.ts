import { Action, BaseSkills } from "./crew"
import { Icon, Ship } from "./game-elements"

export interface CaptainsBridgeRoot {
    id: number
    level: number
    max_level: number
    buffs: BridgeBuff[]
    claimed_rewards_positions: number[]
    rewards_per_level: RewardsPerLevel
  }
  
  export interface BridgeBuff {
    symbol: string
    id: number
    name: string
    icon: Icon
    index: number
    level: number
    max_level: number
    levels: Level[]
  }
  
  export interface Level {
    buffs: BridgeBuff[]
    cost: Cost[]
  }
 
  export interface Cost {
    archetype_id: number
    count: number
  }
  
  export interface RewardsPerLevel {
    [key: string]: LevelReward;
  }
  
  export interface LevelReward {
    rewards: Reward[]
  }
  
  export interface Reward {
    type: number
    id: number
    symbol: string
    name: string
    full_name: string
    flavor: string
    icon: Icon
    quantity: number
    rarity: number
    item_type?: number
    ship?: ShipReward
    portrait?: Icon
    full_body?: Icon
    skills?: BaseSkills
    traits?: string[]
    action?: Action
  }
 
  export interface ShipReward extends Ship {
    type: number
    id: number
    symbol: string
    name: string
    full_name: string
    flavor: string
    icon: Icon
    shields: number
    hull: number
    attack: number
    evasion: number
    accuracy: number
    quantity: number
    rarity: number
  }
  
