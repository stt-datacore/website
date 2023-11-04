import { Icon } from "./game-elements"
import { Quest } from "./missions"
import { AcceptedMission } from "./player"

export type ContinuumRoot = Root2[]

export interface Root2 {
  action: string
  character: Character
}

export interface Character {
  id: number
  accepted_missions: ContinuumMission[]
  continuum_progress: ContinuumProgress
}

export interface ContinuumMission extends AcceptedMission {
    id: number
    symbol: string
    type: number
    description: string
    episode: number
    episode_title: string
    episode_portrait: Icon
    marker: number[]
    marker_icon: Icon
    exclude_from_timeline: boolean
    stars_earned: number
    total_stars: number
    character_xp_reward: number
    loot_rewards: any[]
    quests: Quest[]
    accepted: boolean
    state: number
    rewards_reset_cost: number
    current_quest: Quest
    main_story: boolean
}

export interface ContinuumProgress {
  id: number
  mission_id: number
  state: string
  claimed_chain_rewards: any[]
  current_quest_id: number
  reset_count: number
}
