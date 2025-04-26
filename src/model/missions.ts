import { Ship } from "./ship";
import { ItemArchetypeBase, PotentialReward } from "./player";
import { Icon } from "./game-elements";

export interface QuestFilterConfig {
  traits?: MissionTraitBonus[];
  quest?: Quest;
  challenges?: MissionChallenge[];
  ignoreChallenges?: number[];
  paths?: number[][];
  mastery: number;
  idleOnly?: boolean;
  considerFrozen?: boolean;
  considerUnowned?: boolean;
  qpOnly?: boolean;
  ignoreQpConstraint?: boolean;
  includeCurrentQp?: boolean;
  showAllSkills?: boolean;
  cheapestFirst?: boolean;
  buildableOnly?: boolean;
  alwaysCrit?: boolean;
  noTraitBonus?: boolean;
  includePartials?: boolean;
  requiredCrew?: number[];
}

export interface ProtoMission {
  id: number
  symbol: string
  description?: string
  episode: number
  episode_title?: string
  episode_portrait?: Icon
  marker: number[]
  marker_icon?: Icon
  exclude_from_timeline?: boolean
  total_stars: number
  character_xp_reward?: number
  loot_rewards?: any[]
  quests?: Quest[]
  type?: number
  cadet?: boolean
  name?: string
  faction_id?: number
}


export interface Mission extends ProtoMission {
  id: number
  symbol: string
  description?: string
  episode: number
  episode_title?: string
  episode_portrait?: Icon
  marker: number[]
  marker_icon?: Icon
  exclude_from_timeline?: boolean
  total_stars: number
  character_xp_reward?: number
  loot_rewards?: any[]
  quests: Quest[]
  type?: number
  cadet?: boolean
  name?: string
  faction_id?: number
}

export interface Quest {
  id: number
  quest_type: string
  status?: number
  current_quest_path?: string
  symbol: string
  name?: string
  description?: string
  action?: string
  place?: string
  notifier_icon?: Icon
  intro?: MissionIntro
  mastery_levels?: MasteryLevel[]
  warpLogs: WarpLog[]
  traits_used?: string[]
  crew?: any[]
  stages?: Stage[]
  starting_challenge_id?: number
  challenges?: MissionChallenge[]
  locked?: boolean
  star_background?: boolean
  material_bundle?: string
  timeline_icon?: Icon
  mission_id?: number
  crew_requirement?: CrewRequirement
  cadet?: boolean
  cadet_crew_select_info?: string
  screens?: MissionScreen[]
  compiled_paths?: string[]
  unlock_text?: string
}

export interface MissionIntro {
  text: string
  portrait: Icon
  speaker_name: string
  response: string
  voice_over_bundle?: string
}

export interface MasteryLevel {
  id: number
  energy_cost: number
  rewards: MissionReward[]
  locked: boolean
  progress: Progress
  opponent?: Ship
  jackpots?: Jackpot[]
}

export interface MissionReward extends ItemArchetypeBase {
  type: number
  icon: Icon
  rarity?: number
  potential_rewards?: PotentialReward[]
  quantity: number
  symbol?: string
  name?: string
  quantity_as_percentage_increase?: number
  id?: number
  full_name?: string
  flavor?: string
  item_type?: number
}

export interface Bonuses {
    [key: number]: number;
}

export interface Progress {
  goal_progress: number
  goals: number
}


export interface Jackpot {
  id: number
  reward: MissionReward[]
  claimed: boolean
  can_reclaim?: boolean
}


export interface WarpLog {
  quest_id: number
  quest_name: string
  mastery_level: number
  warp_count: number
  averages: MissionAverageLogEntry[]
  rewards: MissionReward[]
}

export interface MissionAverageLogEntry {
  symbol: string
  average: number
  average_cost: number
}

export interface Stage {
  grid_x: number
  text: string
}

export interface MissionChallenge {
  id: number
  name: string
  grid_x: number
  grid_y: number
  skill: string
  image: Icon
  difficulty: number
  children: number[]
  locks: MissionLock[]
  trait_bonuses: MissionTraitBonus[]
  difficulty_by_mastery: number[]
  critical?: MissionCritical
}

export interface MissionLock {
  trait?: string
  success_on_node_id?: number
}

export interface MissionTraitBonus {
  trait: string
  bonuses: number[]
}

export interface MissionCritical {
  claimed: boolean
  reward: MissionReward[]
  threshold: number
  standard_loot: MissionLoot[]
}


export interface MissionLoot {
  type: number
  icon: Icon
  rarity: number
  potential_rewards: PotentialReward[]
  quantity: number
}

export interface CrewRequirement {
  min_stars: number
  max_stars: number
  traits: string[]
  description: string
}

export interface MissionScreen {
  speaker_name: string
  speaker_image: SpeakerImage
  text: string
  responses: MissionResponse[]
  index: number
  prerequisites?: MissionPrerequisites
  voice_over_bundle?: string
}

export interface SpeakerImage {
  file: string
}

export interface MissionResponse {
  text: string
  button: number
  rewards: MissionResponseRewards
  index: number
  loot_rewards: MissionResponseLootReward[]
  prerequisites: any
  paraphrase?: string
}

export interface MissionResponseRewards {
  mission_tags: string[]
}

export interface MissionResponseLootReward {
  type: number
  symbol?: string
  name: string
  icon: Icon
  quantity: number
  quantity_as_percentage_increase?: number
  id?: number
}

export interface MissionPrerequisites {
  mission_tags: string[][]
}
