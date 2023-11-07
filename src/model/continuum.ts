import { Icon } from "./game-elements"
import { PotentialReward } from "./player"

export interface ContinuumRoot {
  action: string
  continuum_mission: ContinuumMission
}

export interface ContinuumMission {
  qbit_cost_by_slot: number[]
  active: boolean
  mission: MissionInfo
  quest_ids: number[]
  rewards: Rewards
  end_time: number
  chain_rewards: ChainRewards
  quest_rewards: QuestRewards
  character_xp: number
  qbits_rewards: number
}

export interface MissionInfo {
  id: number
  title: string
  description: string
  portrait: Icon
}

export interface Rewards {
  standard: MasteryLoot
  elite: MasteryLoot
  epic: MasteryLoot
}

export interface MasteryLoot {
  all_loot_entries: AllLootEntry[]
}

export interface AllLootEntry {
  type: number
  icon: Icon
  rarity: number
  potential_rewards: PotentialReward[]
  quantity: number
}


export interface ChainRewards {
  standard: MasteryLoot[]
  elite: MasteryLoot[]
  epic: MasteryLoot[]
}


export interface QuestRewards {
  standard: MasteryLoot[]
  elite: MasteryLoot[]
  epic: MasteryLoot[]
}
