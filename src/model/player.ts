

import { Ship } from "./ship";
import { BossBattlesRoot, Energy } from "./boss";
import { CaptainsBridgeRoot } from "./bridge";
import { BaseSkills, ComputedSkill, CapAchiever, CrewMember, CrossFuseTarget, EquipmentSlot, IntermediateSkillData, Skill } from "./crew";
import { ShipAction, ShipBonus } from "./ship";
import { EquipmentItem } from "./equipment";
import { Collection, Icon } from "./game-elements";
import { ShuttleAdventure } from "./shuttle";
import { IVoyageEventContent } from "./voyage";
import { ArchetypeRoot20 } from "./archetype";
import { Cost } from "./offers";
import { ObjectiveEvent } from "./oemodel";

export const ISM_ID = 14152;

export type TranslateMethod = (key: string, options?: { [key: string]: string | number }) => string;

export type PlayerBuffMode = 'none' | 'player' | 'max' | 'quipment';

export type GauntletPlayerBuffMode = 'none' | 'player' | 'max' | 'quipment' | 'max_quipment_2' | 'max_quipment_3';

export type PlayerImmortalMode = 'owned' | 'min' | 2 | 3 | 4 | 'full' | 'frozen' | 'shown_full';

export type CiteEngine = 'original' | 'beta_tachyon_pulse';

export interface CiteMode {
  rarities?: number[],
  portal?: boolean,
  nameFilter?: string,
  customSorter?: (left: PlayerCrew, right: PlayerCrew) => number;
  priSkills?: string[];
  secSkills?: string[];
  seatSkills?: string[];
  engine?: CiteEngine;
}

export interface ForteItem {
  id: number;
  quantity: number;
}
export interface ForteRoot {
  id: number;
  items: ForteItem[];
}

export interface PlayerData {
  player: Player;
  fleet_boss_battles_root?: BossBattlesRoot;
  captains_bridge_root?: CaptainsBridgeRoot;
  calc?: { lastImported?: string, lastModified?: Date; numImmortals?: number; };
  archetype_cache?: ArchetypeRoot20;
  [key: string]: any;
  forte_root: ForteRoot;
  version?: 17 | 20;
  stripped?: boolean;
  citeMode?: CiteMode;
  calculatedDemands?: EquipmentItem[];
  buyback_well: PlayerCrew[];
  crew_crafting_root?: CrewCraftingRoot;
  objective_event_root?: ObjectiveEventRoot;
}

export interface Player {
  id: number
  dbid: number
  lang: string
  timezone: string
  locale: string
  display_name: string
  money: number
  premium_purchasable: number
  premium_earnable: number
  honor: number
  shuttle_rental_tokens: number
  vip_points: number
  vip_level: number
  currency_exchanges?: CurrencyExchange[]
  replicator_uses_today: number
  replicator_limit: number
  replicator_ration_types: ReplicatorRationType[]
  character: Character
  fleet: Fleet
  squad: Squad
  mailbox?: Mailbox
  fleet_invite?: FleetInvite
  entitlements?: Entitlements
  chats?: Chats
  environment?: Environment
  motd?: Motd
  npe_complete?: boolean
  community_links?: CommunityLink[]
  legal_update: boolean
  legal_popup_variant: number
  ads_consent_required: boolean
  consent: boolean
  ccpa_opted_out: boolean
  u_13: boolean

}



export interface CurrencyExchange {
  id: number
  amount: number
  output: number
  input: number
  schedule: number[]
  exchanges_today: number
  bonus?: number
  limit?: number
  dynamic_amount?: DynamicAmount
  disallow_sale_above_cap?: boolean
}

export interface DynamicAmount {
  enabled: boolean
  max: number
}

export interface ReplicatorRationType {
  id: number
  symbol: string
  type: number
  name: string
  icon: Icon
  flavor: string
  rarity: number
  item_sources: any[]
}

export interface GalaxyCrewCooldown {
    crew_id: number;
    disabled_until: Date;

    /** Used internally. Not part of game data. */
    is_disabled?: boolean;
}

export interface Character {
  id: number
  display_name: string
  using_default_name?: boolean
  level: number
  max_level?: number
  xp: number
  xp_for_current_level: number
  xp_for_next_level: number
  location?: Location
  destination?: Location
  navmap?: Navmap
  accepted_missions: AcceptedMission[]
  active_conflict: any
  shuttle_bays: number
  next_shuttle_bay_cost: any
  can_purchase_shuttle_bay?: boolean
  crew_avatar: CrewAvatar
  stored_immortals: StoredImmortal[]
  c_stored_immortals?: number[]
  replay_energy_max: number
  replay_energy_rate: number
  seconds_from_replay_energy_basis: number
  replay_energy_overflow: number
  boost_windows?: BoostWindow[]
  seconds_from_last_boost_claim?: number
  video_ad_chroniton_boost_reward?: Reward
  cadet_tickets?: Tickets
  pvp_tickets?: Tickets
  event_tickets?: Tickets
  cadet_schedule?: CadetSchedule
  pvp_divisions?: PvpDivision[]
  pvp_timer?: PvpTimer
  fbb_difficulties: FbbDifficulty[]
  crew: PlayerCrew[];
  unOwnedCrew?: PlayerCrew[];
  items: PlayerEquipmentItem[]
  crew_borrows?: any[]
  crew_shares?: any[]
  crew_limit: number
  crew_limit_increase_per_purchase?: number
  next_crew_limit_increase_cost?: NextCrewLimitIncreaseCost
  can_purchase_crew_limit_increase?: boolean
  item_limit?: number
  alert_item_limit: number
  ships: Ship[]
  current_ship_id: number
  shuttle_adventures?: ShuttleAdventure[]
  factions: Faction[]
  disputes?: any[]
  tng_the_game_level?: number
  open_packs?: any[]
  daily_activities: DailyActivity[]
  next_daily_activity_reset?: number
  next_starbase_donation_reset?: number
  fleet_activities?: FleetActivity[]
  next_fleet_activity_reset?: number
  freestanding_quests?: any[]
  daily_rewards_state?: DailyRewardsState
  events?: GameEvent[]
  dispute_histories: DisputeHistory[]
  stimpack?: Stimpack
  tutorials?: Tutorial[]
  location_channel_prefix?: string
  honor_reward_by_rarity?: number[]
  voyage_descriptions?: VoyageDescription[]
  voyage?: Voyage[]
  voyage_summaries?: VoyageSummaries
  cryo_collections: CryoCollection[]
  crew_collection_buffs: AdvancementBuff[]
  collection_buffs_cap_hash: CollectionBuffsCapHash
  starbase_buffs: AdvancementBuff[]
  starbase_buffs_cap_hash: StarbaseBuffsCapHash
  captains_bridge_buffs: AdvancementBuff[]
  captains_bridge_buffs_cap_hash: CaptainsBridgeBuffsCapHash
  all_buffs_cap_hash: AllBuffsCapHash
  all_buffs: AllBuff[]
  total_marketplace_claimables: number
  seasons: Season[];
  galaxy_crew_cooldowns?: GalaxyCrewCooldown[];
}

export interface ClientAsset {
  system: string
  place: string
}

export interface Location extends ClientAsset {
  setup: string
  x: number
  y: number
}

export interface Navmap {
  places: Place[]
  systems: System[]
}

export interface Place {
  id: number
  symbol: string
  system: string
  client_asset: ClientAsset
  display_name?: string
  visited?: boolean
}

export interface System {
  id: number
  symbol: string
  x: number
  y: number
  default_place: string
  display_name?: string
  star?: number
  decorator?: number
  faction?: string
  scale?: number
  active?: boolean
}

export interface AcceptedMission extends DisputeHistory {
  id: number
  symbol: string
  description?: string
  episode?: number
  episode_title?: string
  episode_portrait?: Icon
  marker?: number[]
  marker_icon?: Icon
  exclude_from_timeline?: boolean
  stars_earned: number
  total_stars: number
  accepted: boolean
  state: number
  main_story?: boolean
  cadet?: any;
}

export interface CrewAvatar {
  id: number
  symbol: string
  name: string
  traits: string[]
  traits_hidden: string[]
  short_name: string
  max_rarity: number
  icon: Icon
  portrait: Icon
  full_body: Icon
  default_avatar: boolean
  hide_from_cryo: boolean
  skills: string[]
}

export interface StoredImmortal {
  id: number
  quantity: number
}

export interface BoostWindow {
  window: number[]
  reward: Reward
}

export interface Tickets {
  current: number
  max: number
  spend_in: number
  reset_in: number
}

export interface CadetSchedule {
  day: number
  schedule: Schedule[]
  missions: CadetMission[]
  current: number
  ends_in: number
  next: number
  next_starts_in: number
}

export interface Schedule {
  day: number
  mission: number
}

export interface CadetMission {
  id: number
  title: string
  speaker: string
  description: string
  portrait: Icon
  image: Icon
  image_small: Icon
  requirement: string
}

export interface PvpDivision {
  id: number
  tier: number
  name: string
  description: string
  min_ship_rarity: number
  max_ship_rarity: number
  max_crew_rarity: number
  setup: PvpRefSetup
}

export interface Setup {
  ship_id: number;
  slots: number[];
}

export interface PvpRefSetup extends Setup {
  slot_info?: { [key: string]: PlayerCrew };
}

export interface PvpTimer {
  supports_rewarding: boolean
  pvp_allowed: boolean
  changes_in: number
}

export interface FbbDifficulty {
  id: number
  tier: number
  name: string
  description: string
  color_code: string
  min_ship_rarity: number
  max_ship_rarity: number
  max_crew_rarity: number
  setup?: Setup
}
export enum CompletionState {

  /**
   * Display as immortal, no way to reference.
   * (Same as -2/DisplayAsImmortal but with different wording)
   */
  DisplayAsImmortalOpponent = -10,

  /**
   * Display as immortal, no way to reference.
   * (Same as -2/DisplayAsImmortal but with different wording)
   */
  DisplayAsImmortalSelected = -11,

  /**
   * Display as immortal, no way to reference.
   * (Same as -2/DisplayAsImmortal but with different wording)
   */
  DisplayAsImmortalStatic = -5,

  /**
   * Display as immortal, owned crew.
   */
  DisplayAsImmortalOwned = -4,

  /**
   * Display as immortal, unowned crew.
   * Also, generally for unowned crew.
   */
  DisplayAsImmortalUnowned = -3,

  /**
   * Display as immortal. Owned state not known/not needed.
   */
  DisplayAsImmortal = -2,

  /**
   * Crew is immortalized (owned)
   */
  Immortalized = -1,

  /**
   * Crew is frozen (1 or greater is the count)
   */
  Frozen = 1,

  /**
   * Crew is owned, not completed.
   */
  NotComplete = 0
}

/**
 * This object is the smallest representation of a crew member,
 * and contains only minimal information.
 *
 * PlayerCrew derives from this and CrewMember
 */
export interface CompactCrew {
  id: number;
  symbol: string;
  name?: string;
  archetype_id?: number;
  level: number;
  max_level?: number;
  rarity: number;
  max_rarity: number;
  traits?: string[];
  equipment: number[][] | number[];
  skill_order: string[];
  base_skills?: BaseSkills;
  skills?: BaseSkills;
  favorite?: boolean;
  ship_battle?: ShipBonus;
  active_status?: number;
  active_id?: number;
  active_index?: number;
}

/**
 * This is the model for crew that has come from the player's roster
 * and either been merged with the main crew.json source (CrewMember), or whittled
 * down into CompactCrew.
 *
 * This interface inherits from both CrewMember and CompactCrew
 */
export interface PlayerCrew extends CrewMember, CompactCrew, IntermediateSkillData {
  id: number
  symbol: string
  name: string
  short_name: string
  flavor: string
  archetype_id: number
  xp: number
  xp_for_current_level: number
  xp_for_next_level: number
  bonus: number
  max_xp: number
  favorite: boolean
  level: number

  /**
   * This means the crew is in the recycle-bin and are eligible for re-enlistment in exchange for honor
   */
  in_buy_back_state: boolean
  max_level: number
  rarity: number
  max_rarity: number
  equipment_rank: number
  max_equipment_rank: number
  equipment_slots: EquipmentSlot[]

  /** Used internally by DataCore, not part of game data */
  local_slots?: EquipmentSlot[];

  /**
   * Input equipment slots are nested arrays,
   * they are mapped to 1-dimensional arrays during processing
   */
  equipment: number[][] | number[]

  kwipment: number[][] | number[];
  kwipment_expiration: number[][] | number[];

  /** Used internally, not part of game data */
  kwipment_prospects?: boolean;

  //kwipment_expirations?: Date[];
  q_bits: number;

  kwipment_slots?: EquipmentSlot[];

  icon: Icon
  portrait: Icon
  full_body: Icon
  voice_over?: string
  expires_in: any
  active_status: number
  active_id?: number
  active_index: number
  passive_status: number
  passive_id?: number
  passive_index: number
  traits: string[]
  traits_hidden: string[]
  /** This typically lists the current in-game skills with buffs applied */
  skills: BaseSkills
  /** This typically lists the immortalized skills (without buffs) */
  base_skills: BaseSkills

  /** Ship battle ability. Is a superclass of Ship */
  ship_battle: ShipBonus

  /** Ship action */
  action: ShipAction
  default_avatar: boolean
  /** If this crew can be fused with other crew */
  cross_fuse_targets: CrossFuseTarget;
  cap_achiever: CapAchiever

  /** Highest rarity from out of all copies of crew owned by the player */
  highest_owned_rarity?: number;

  /** Highest level from out of all copies of crew owned by the player */
  highest_owned_level?: number;

  /**
   * Immortalized count or CompletionState.
   *
   * If this value is greater than zero, that's the number of
   * frozen copies.
   *
   * If this number is less than zero, this character is immortalized or shown immortalized.
   *
   * If this number is zero, this character is not immortalized.
   *
   * To determine a specific value other than a positive number, consult CompletionState
   */
  immortal: CompletionState | number;

  /** Used internally. Not part of source data.  */
  unmaxedIds?: number[];

  /** Collection rewards for immortalizing this crew. Used internally. Not part of source data.  */
  immortalRewards?: ImmortalReward[];

  /** Collection improvement score. Used internally. Not part of source data.  */
  collectionScore?: number;
  collectionScoreN?: number;

  /** Crew is an inserted prospect on the crew table. Used internally. Not part of source data.  */
  prospect?: boolean;

  /**
   * Indicates whether the crew is owned by the player or not.
   * Used internally. Not part of source data.
   */
  have?: boolean;

  /** Used internally. Not part of source data.  */
  traits_matched?: string[];
  /** Used internally. Not part of source data.  */
  only_frozen?: boolean;

  /** Reserved for Combo Matches  */
  nodes?: number[];
  /** Reserved for Combo Matches  */
  node_matches?: NodeMatches;
  /** Reserved for Combo Matches  */
  nodes_rarity?: number;

  /** Used internally. Not part of source data.  */
  variants?: string[];


  /** Citation Optimizer */

  /** Used internally. Not part of source data.  */
  addedEV?: number;
  /** Used internally. Not part of source data.  */
  totalEVContribution?: number;
  /** Used internally. Not part of source data.  */
  totalEVRemaining?: number;
  /** Used internally. Not part of source data.  */
  evPerCitation?: number;
  /** Used internally. Not part of source data.  */
  voyagesImproved?: string[];
  /** Used internally. Not part of source data.  */
  amTraits?: string[];
  /** Used internally. Not part of source data.  */
  voyScores?: { [key: string]: number };
  /** Used internally. Not part of source data.  */
  collectionsIncreased?: string[];
  /** Used internally. Not part of source data.  */
  groupSparsity?: number;
  /** Used internally. Not part of source data.  */
  ssId?: string;

  /** Used internally by gauntlets. Not part of source data.  */
  score?: number;

  /** Used internally by gauntlets. Not part of source data.  */
  scoreTrip?: number;

  /** Used internally by gauntlets. Not part of source data.  */
  pairScores?: GauntletPairScore[];

  /** Used internally by gauntlets. Not part of source data.  */
  isOpponent?: boolean;

  /** Used internally by gauntlets. Not part of source data.  */
  isDebuffed?: boolean;

  /** Used internally by gauntlets. Not part of source data.  */
  isDisabled?: boolean;

  /** Used internally by gauntlets. Not part of source data.  */
  isSelected?: boolean;

  /** Used internally. Not part of source data.  */
  utility?: PlayerUtility

  // used for exports
  /** Used for exports and internally. Not part of source data.  */
  command_skill?: ComputedSkill;
  /** Used for exports and internally. Not part of source data.  */
  diplomacy_skill?: ComputedSkill;
  /** Used for exports and internally. Not part of source data.  */
  security_skill?: ComputedSkill;
  /** Used for exports and internally. Not part of source data.  */
  science_skill?: ComputedSkill;
  /** Used for exports and internally. Not part of source data.  */
  medicine_skill?: ComputedSkill;
  /** Used for exports and internally. Not part of source data.  */
  engineering_skill?: ComputedSkill;

  data: any;

  is_new?: boolean;
}

export interface GauntletPairScore {
  score: number;
  pair: Skill[];
}
export interface PlayerUtilityRanks {
  [key: string]: number[];
}

export interface PlayerUtility {
  ranks: PlayerUtilityRanks;
  thresholds: string[];
  counts: {
    shuttle: number;
    gauntlet: number;
    voyage: number;
  }
}

export interface NodeMatch {
  index: number,
  traits: string[];
  combos: string[][];
  nodes?: number[];
}

export interface NodeMatches {
  [key: string]: NodeMatch;
}


export interface PlayerEquipmentItem extends ItemArchetypeBase {
  id?: number
  type?: number
  symbol: string
  name?: string
  flavor?: string
  archetype_id: number
  quantity?: number
  icon?: Icon
  rarity: number
  expires_in?: number
  short_name?: string
  bonuses?: Bonuses
  time_modifier?: number
  cr_modifier?: number
  reward_modifier?: number
  crafting_bonuses?: Bonuses
  imageUrl?: string;
}

export interface Bonuses {
  [key: number]: number;
}

export interface NextCrewLimitIncreaseCost {
  currency: number
  amount: number
}

export interface Faction {
  id: number
  name: string
  reputation: number
  discovered?: number
  completed_shuttle_adventures: number
  icon?: Icon
  representative_icon?: Icon
  representative_full_body?: Icon
  reputation_icon?: Icon
  reputation_item_icon?: Icon
  home_system?: string
  shop_layout?: string
  shuttle_token_id?: number
  shuttle_token_preview_item?: ShuttleTokenPreviewItem
  event_winner_rewards?: any[]
}

export interface ShuttleTokenPreviewItem extends PlayerEquipmentItem {
  type: number
  id: number
  symbol: string
  item_type: number
  name: string
  full_name: string
  flavor: string
  icon: Icon
  quantity: number
  rarity: number
}

export interface DailyActivity {
  id?: number
  name: string
  description: string
  icon?: Icon
  area?: string
  weight?: number
  category?: any
  lifetime?: number
  rewards?: Reward[]
  goal?: number
  min_level?: number
  rarity?: number
  progress?: number
  status?: string
}


export interface FleetActivity {
  id: number
  name: string
  description: string
  icon: Icon
  area: string
  sort_priority: number
  category: string
  total_points: number
  current_points: number
  milestones: Milestone[]
  claims_available_count: number
}

export interface Milestone {
  goal: number | "n/a"
  rewards?: Reward[]
  claimed?: boolean
  claimable?: boolean
  buffs?: MilestoneBuff[];
}


export interface DailyRewardsState {
  seconds_until_next_reward: number
  today_reward_day_index: number
  season_points_per_day: number
  ism_subcoin_per_day: number
  reward_days: RewardDay[]
}

export interface RewardDay {
  id: number
  symbol: string
  rewards: Reward[]
  double_at_vip?: number
}

export interface GameEvent {
  id: number
  symbol: string
  name: string
  description: string
  rules: string
  bonus_text: string
  rewards_teaser: string
  shop_layout: string
  featured_crew: FeaturedCrew[]
  threshold_rewards: ThresholdReward[]
  ranked_brackets: RankedBracket[]
  squadron_ranked_brackets: SquadronRankedBracket[]
  content: Content
  instance_id: number
  status: number
  seconds_to_start: number
  content_types: string[]
  seconds_to_end: number
  phases: Phase[]
  opened?: boolean
  opened_phase?: number
  victory_points?: number
  bonus_victory_points?: number
  claimed_threshold_reward_points?: number
  unclaimed_threshold_rewards?: any[]
  last_threshold_points?: number
  next_threshold_points?: number
  next_threshold_rewards?: any[]
  bonus?: string[];
  discovered?: Date;
}


export interface FeaturedCrew extends CrewMember {
  type: number
  id: number
  symbol: string
  name: string
  full_name: string
  flavor: string
  icon: Icon
  portrait: Icon
  rarity: number
  full_body: Icon
  skills: BaseSkills
  traits: string[]
  action: ShipAction
  quantity: number
}

export interface ThresholdReward {
  points: number
  rewards: Reward[]
}

export interface RankedBracket {
  first: number
  last: number
  rewards: Reward[]
  quantity: number
}

export interface SquadronRankedBracket {
  first: number
  last: number
  rewards: Reward[]
  quantity: number
}

export interface SpecialistMission {
  id: number;
  event_run_id: number;
  desc_id: number;
  crew_id?: number;
  start_time?: Date;
  completion_time?: Date;
  progress_speed?: number;
  state:	"available" | "started";
  event_instance_id: number;
  vp_rewards_amount: number;
  title: string;
  description: string;
  icon: Icon;
  bonus_traits: string[];
  requirements: string[];
  min_req_threshold: number;
}

export interface SpecialistMainMission {
  progress: number;
  bonus_failures: number;
  title: string;
  description: string;
  icon: Icon;
  victory_points_reward: number;
}

export interface Content {
    content_type: string
    crew_bonuses?: CrewBonuses
    gather_pools?: GatherPool[]
    craft_bonus?: number
    refresh_cost?: RefreshCost
    supports_buffs?: boolean
    shuttles?: Shuttle[]
    bonus_crew?: string[]
    bonus_traits?: string[]

    // Specialist voyages
    missions?: SpecialistMission[];
    completion_progress?: number;
    passive_progress_interval?: number;
    featured_crew_bonus_chance?: number;
    featured_trait_bonus_chance?: number;
    start_mission_cost?: number;
    galaxy_cooldown_reset_cost?: Cost;
    reroll_cost?: Cost;
    skip_mission_cost_interval?: number;
    skip_mission_cost_per_interval?: number;
    bonus_chance_inc?: number;
    main_mission?: SpecialistMainMission;
    featured_traits?: string[];

    voyage_symbol?: string;	// encounter_voyage
    primary_skill?: string;
    secondary_skill?: string;
    antimatter_bonus_per_crew_trait?: number;
    antimatter_bonus_crew_traits?: string[];
    antimatter_bonus_for_featured_crew?: number;
    featured_crews?: string[];
    antimatter_bonus_per_ship_trait?: number;
    antimatter_bonus_ship_traits?: string[];
    antimatter_bonus_for_featured_ship?: number;
    featured_ships?: string[];
    event_ships?: number[];
  }

export interface CrewBonuses {
  [key: string]: number;
}

export interface GatherPool {
  id: number
  adventures: Adventure[]
  goal_index: number
  rewards: PoolReward[]
  golden_octopus_rewards: GoldenOctopusReward[]
}

export interface Adventure {
  id: number
  name: string
  description: string
  demands: Demand[]
  golden_octopus: boolean
}

export interface Demand {
  archetype_id: number
  count: number
}

export interface PoolReward {
  type: number
  symbol: string
  name: string
  icon: Icon
  flavor: string
  quantity: number
  faction_id: number
}

export interface GoldenOctopusReward {
  type: number
  symbol: string
  name: string
  icon: Icon
  flavor: string
  quantity: number
  faction_id: number
}

export interface RefreshCost {
  currency: number
  amount: number
}

export interface Shuttle {
  token: number
  allow_borrow: boolean
  crew_bonuses: CrewBonuses
  shuttle_mission_rewards: ShuttleMissionReward[]
}

export interface ShuttleMissionReward {
  type: number
  icon: Icon
  rarity?: number
  potential_rewards?: PotentialReward[]
  quantity: number
  symbol?: string
  name?: string
  flavor?: string
  faction_id?: number
  id?: number
}

export interface PotentialReward {
  type: number
  icon: Icon
  rarity: number
  potential_rewards?: PotentialRewardDetails[]
  quantity: number
  id?: number
  symbol?: string
  item_type?: number
  name?: string
  full_name?: string
  flavor?: string
  bonuses?: Bonuses
  ship?: Ship
}

export interface PotentialRewardDetails {
  type: number
  id: number
  symbol: string
  name: string
  full_name: string
  flavor: string
  icon: Icon
  quantity: number
  rarity: number
  portrait?: Icon
  full_body?: Icon
  skills?: BaseSkills
  traits?: string[]
  action?: ShipAction
  item_type?: number
  bonuses?: Bonuses
}

export interface Phase {
  splash_image: Icon
  goals: Goal[]
  id: number
  seconds_to_end: number
}

export interface Goal {
  id: number
  faction_id: number
  flavor: string
  rewards: GoalReward[]
  winner_rewards?: WinnerRewards
  victory_points: number
  claimed_reward_points?: number
}

export interface GoalReward {
  points: number
  rewards: GoalRewardDetails[]
}

export interface GoalRewardDetails {
  type: number
  id: number
  symbol: string
  name: string
  full_name: string
  flavor: string
  icon: Icon
  portrait?: Icon
  rarity: number
  full_body?: Icon
  skills?: Skill
  traits?: string[]
  action?: ShipAction
  quantity: number
}

export interface WinnerRewards {
  bonuses: Bonuses
  time_modifier: number
  cr_modifier: number
  reward_modifier: number
  rewards: Reward[]
}

export interface DisputeHistory {
  id: number
  symbol: string
  name?: string
  episode?: number
  marker?: number[]
  completed: boolean
  mission_ids?: number[]
  stars_earned: number
  total_stars: number
  exclude_from_timeline?: boolean
  faction_id?: number;
}

export interface Stimpack {
  energy_discount: number
  nonpremium_currency_multiplier: number
  crew_xp_multiplier: number
  ends_in: number
}

export interface Tutorial {
  id: number
  symbol: string
  state: string
}

export interface VoyageDescription {
  id: number
  voyage_type: 'dilemma' | 'encounter';
  symbol: string
  name: string
  description: string
  icon: string
  skills: VoyageSkills
  ship_trait: string
  crew_slots: CrewSlot[]
  potential_rewards: PotentialRewardDetails[]
}

export interface VoyageSkills {
  primary_skill: string
  secondary_skill: string
}

export interface CrewSlot {
  symbol: string
  name: string
  skill: string
  trait: string
}

export interface Voyage {
  id: number
  name: string
  voyage_type: 'dilemma' | 'encounter';
  description: string
  icon: string
  skills: VoyageSkills
  ship_trait: string
  state: string
  ship_name: any
  max_hp: number
  hp: number
  log_index: number
  pending_rewards: PendingRewards
  granted_rewards: any
  seed: number
  created_at: string
  recalled_at: string
  completed_at: any
  voyage_duration: number
  skill_aggregates: Aggregates
  seconds_between_dilemmas: number
  seconds_since_last_dilemma: number
  first_leave: boolean
  time_to_next_event: number
  ship_id: number;
  next_interaction: number;
  crew_slots: VoyageCrewSlot[]
  event_content?: IVoyageEventContent;
}

export interface EncounterVoyage extends Voyage {
    phase_id: number;
    event_instance_id: number;
    encounter: number;
    encounter_skip_boost?: {
        boost_duration: number;
        boost_archetype: number;
    }
    fast_forward_boost?: {
        estimated_hp: number;
    }
}

export interface Aggregates {
	command_skill: Skill;
	science_skill: Skill;
	security_skill: Skill;
	engineering_skill: Skill;
	diplomacy_skill: Skill;
	medicine_skill: Skill;
}

export interface PendingRewards {
  loot: Loot[]
}

export interface Loot {
  type: number
  id: number
  symbol: string
  item_type?: number
  name: string
  full_name: string
  flavor: string
  icon: Icon
  quantity: number
  rarity: number
  portrait?: Icon
  full_body?: Icon
  skills?: BaseSkills
  traits?: string[]
  action?: ShipAction
}

export interface VoyageCrewSlot {
  symbol: string
  name: string
  skill: string
  trait: string
  crew: PlayerCrew
}

export interface VoyageSummaries {
  summaries: Summary[]
  flavor_amount: number
}

export interface Summary {
  name: string
  min: number
  max: number
}

export interface CryoCollection extends Collection {
  id: number
  name: string
  image?: string
  description?: string
  progress: number | "n/a"
  traits?: string[]
  extra_crew?: number[]
  claimable_milestone_index?: number
  milestone: Milestone
}

export interface PlayerCollection extends CryoCollection {
  crew?: string[];
  simpleDescription?: string;
  progressPct?: number;
  neededPct?: number;
  needed?: number;
  neededCost?: number;
  totalRewards?: number;
  owned: number;
}

export interface ItemArchetypeBase {
  symbol?: string
  name?: string
  icon?: Icon | Icon;
  flavor?: string
  quantity?: number;
  rarity?: number;

  /** Used internally by DataCore. Not part of game data */
  data?: any;
}

export interface ImmortalReward extends ItemArchetypeBase {
  quantity: number;
  icon?: Icon;
}

export interface Reward extends ItemArchetypeBase {
  type: number
  id: number
  full_name: string
  quantity: number
  rarity: number
  portrait?: Icon
  full_body?: Icon
  skills?: BaseSkills
  traits?: string[]
  action?: ShipAction
  ship?: Ship
  icon?: Icon;
  item_type?: number
  bonuses?: Bonuses
  faction_id?: number
  owned?: number
}

export interface MilestoneBuff extends ItemArchetypeBase {
  id: number
  type: number
  rarity: number
  item_sources: any[]
}

export interface AdvancementBuff extends ItemArchetypeBase {
  short_name?: string
  operator: string
  value: number
  stat: string
  source?: string
}

export interface CollectionBuffsCapHash {
  "science_skill_core,percent_increase": number
  "engineering_skill_core,percent_increase": number
  "medicine_skill_range_min,percent_increase": number
  "medicine_skill_range_max,percent_increase": number
  "science_skill_range_min,percent_increase": number
  "science_skill_range_max,percent_increase": number
  "engineering_skill_range_min,percent_increase": number
  "engineering_skill_range_max,percent_increase": number
  "diplomacy_skill_core,percent_increase": number
  "command_skill_core,percent_increase": number
  "diplomacy_skill_range_min,percent_increase": number
  "diplomacy_skill_range_max,percent_increase": number
  "command_skill_range_min,percent_increase": number
  "command_skill_range_max,percent_increase": number
  "security_skill_core,percent_increase": number
  "security_skill_range_min,percent_increase": number
  "security_skill_range_max,percent_increase": number
  "medicine_skill_core,percent_increase": number
  "replicator_fuel_cost,percent_decrease": number
  "chroniton_max,increment": number
  "crew_experience_training,percent_increase": number
  "replicator_uses,increment": number
}

export interface StarbaseBuffsCapHash {
  "replicator_uses,increment": number
  "replicator_cost,percent_decrease": number
  "chroniton_max,increment": number
  "command_skill_core,percent_increase": number
  "command_skill_range_min,percent_increase": number
  "command_skill_range_max,percent_increase": number
  "diplomacy_skill_core,percent_increase": number
  "diplomacy_skill_range_min,percent_increase": number
  "diplomacy_skill_range_max,percent_increase": number
  "security_skill_core,percent_increase": number
  "security_skill_range_min,percent_increase": number
  "security_skill_range_max,percent_increase": number
  "science_skill_core,percent_increase": number
  "science_skill_range_min,percent_increase": number
  "science_skill_range_max,percent_increase": number
  "medicine_skill_core,percent_increase": number
  "medicine_skill_range_min,percent_increase": number
  "medicine_skill_range_max,percent_increase": number
  "engineering_skill_core,percent_increase": number
  "engineering_skill_range_min,percent_increase": number
  "engineering_skill_range_max,percent_increase": number
}


export interface CaptainsBridgeBuffsCapHash {
  "ship_attack,percent_increase": number
  "ship_shields,percent_increase": number
  "fbb_player_ship_attack,percent_increase": number
  "ship_accuracy,percent_increase": number
  "ship_hull,percent_increase": number
  "ship_evasion,percent_increase": number
  "fbb_boss_ship_attack,percent_decrease": number
  "ship_antimatter,percent_increase": number
}

export interface AllBuffsCapHash {
  "science_skill_core,percent_increase": number
  "engineering_skill_core,percent_increase": number
  "medicine_skill_range_min,percent_increase": number
  "medicine_skill_range_max,percent_increase": number
  "science_skill_range_min,percent_increase": number
  "science_skill_range_max,percent_increase": number
  "engineering_skill_range_min,percent_increase": number
  "engineering_skill_range_max,percent_increase": number
  "diplomacy_skill_core,percent_increase": number
  "command_skill_core,percent_increase": number
  "diplomacy_skill_range_min,percent_increase": number
  "diplomacy_skill_range_max,percent_increase": number
  "command_skill_range_min,percent_increase": number
  "command_skill_range_max,percent_increase": number
  "security_skill_core,percent_increase": number
  "security_skill_range_min,percent_increase": number
  "security_skill_range_max,percent_increase": number
  "medicine_skill_core,percent_increase": number
  "replicator_fuel_cost,percent_decrease": number
  "chroniton_max,increment": number
  "crew_experience_training,percent_increase": number
  "replicator_uses,increment": number
  "replicator_cost,percent_decrease": number
  "ship_attack,percent_increase": number
  "ship_shields,percent_increase": number
  "fbb_player_ship_attack,percent_increase": number
  "ship_accuracy,percent_increase": number
  "ship_hull,percent_increase": number
  "ship_evasion,percent_increase": number
  "fbb_boss_ship_attack,percent_decrease": number
  "ship_antimatter,percent_increase": number
}

export interface AllBuff {
  name: string
  short_name: string
  flavor: string
  icon: Icon
  operator: string
  value: number
  stat: string
  source: string
  symbol: string
}

export interface Season {
  id: number
  symbol: string
  title: string
  description: string
  exclusive_crew: ExclusiveCrew[]
  tiers: Tier[]
  points_per_tier: number
  tier_dilithium_cost: number
  start_at: number
  end_at: number
  premium_tier_offer_store_symbol: string
  premium_tier_entitlement_symbol: string
  premium_tier_entitlement_specialization: string
  supremium_tier_offer_store_symbol: string
  supremium_tier_entitlement_symbol: string
  supremium_tier_entitlement_specialization: string
  supremium_tier_combo_offer_store_symbol: string
  opened: boolean
  points: number
  redeemed_points: number
  redeemed_premium: number
  redeemed_supremium: number
  acknowledged: boolean
  concluded: boolean
}

export interface ExclusiveCrew {
  name: string
  max_rarity: number
  full_body: Icon
  archetype_id: number
}

export interface Tier {
  points: number
  rewards: Reward[]
  premium_rewards: Reward[]
  supremium_rewards: Reward[]
}


export interface Fleet {
  id: number
  rlevel: number
  sinsignia: string
  nicon_index: number
  nleader_player_dbid: number
  nstarbase_level: number
  nleader_login: number
  slabel: string
  cursize: number
  maxsize: number
  created: number
  enrollment: string
  nmin_level: number
  rank: string
  epoch_time: number
}

export interface Squad {
  id: number
  rank: string
}

export interface Mailbox {
  status: string
  sendable: number
  sent: number
  accepted: number
  stores: Stores
  received: number
}

export interface Stores {
  [key: string]: number;
}

export interface FleetInvite {
  status: string
  sendable: number
  sent: number
  accepted: number
  stores: Stores
  received: number
}

export interface Entitlements {
  granted: Granted[]
  claimed: Claimed[]
}

export interface Granted {
  uuid: string
  gamerTag: number
  symbol: string
  state: string
  updated: number
  history: History[]
  specialized?: string
}

export interface History {
  what: string
  when: string
  to?: string
  from?: string
  reason?: string
}

export interface Claimed {
  uuid: string
  gamerTag: number
  symbol: string
  state: string
  updated: number
  history: ClaimedHistory[]
  specialized?: string
  cwin?: Cwin
  cwinSecsTillOpen?: number
  cwinSecsTillClose?: number
  ttl?: number
}

export interface ClaimedHistory {
  what: string
  when: string
  to?: string
  from?: string
  gift_quantity?: string
  who?: string
  quantity?: string
  image?: string
  ecount?: string
  reward_image?: string
  obtain?: string
}

export interface Cwin {
  open: number
  close: number
}

export interface Chats { }

export interface Environment {
  tutorials: string[]
  level_requirement_123s: number
  restrictions: any
  background_idle_period: number
  fleet_request_purge_threshold: number
  fleet_request_purge_expiration_days: number
  event_refresh_min_seconds: number
  event_refresh_max_seconds: number
  allow_webgl_looping_audio: boolean
  display_server_environment: boolean
  video_ad_campaign_limit: VideoAdCampaignLimit
  fleet_activities_restriction_enabled: boolean
  shuttle_rental_dil_cost: number
  location_updates_enabled: boolean
  location_chat_enabled: boolean
  enable_server_toasts: boolean
  minimum_toast_delay_in_seconds: number
  starbase_refresh: number
  detect_conflict_mastery_errors: boolean
  dilithium_purchase_popup_enabled: boolean
  dilithium_purchase_popup_threshold: number
  honor_purchase_popup_enabled: boolean
  honor_purchase_popup_threshold: number
  help_center_button_enabled: boolean
  anti_macro: AntiMacro
  use_updated_speed_up_cost: boolean
  rental_shuttles_enabled: boolean
  ship_battle_assist_character_level: number
  ship_battle_speedup_multipliers: number[]
  hud_popup_queue: HudPopupQueue
  limited_time_offers_v2: LimitedTimeOffersV2
  load_with_equipment_rank_caching: boolean
  currency_gained_analytic_enabled: boolean
  fix_chroniton_ad_boost: boolean
  season_123_tier_threshold: number
  season_123_no_premium_tier_threshold: number
  webgl_debug_cohort: boolean
  ratings_whitelist: string[]
  ironsource_ios_app_id: string
  ironsource_android_app_id: string
  ironsource_underage_ios_app_id: string
  ironsource_underage_android_app_id: string
  offerwall_enabled: boolean
  create_player_forte_wallet_on_login: boolean
  replicate_forte_wallet_on_login: boolean
  replicate_forte_wallet_on_update: boolean
  crew_crafting: CrewCrafting
  dusting_enabled: boolean
  ism_for_polestar_dusting: number
  ism_for_constellation_dusting: number
  collect_entitlement_claim_result_data: boolean
  publish_entitlement_claim_results: boolean
  handle_entitlement_claim_result_publications: boolean
  privacy_policy_version: number
  terms_service_version: number
  event_hub_historical_event_limit: number
  nerf_refresh_all: boolean
  track_battles_at_start: boolean
  track_battles_at_end: boolean
  retargeting: Retargeting
  ccpa_opt_out_url: string
  age_gate: boolean
  consent_age: number
  log_errors_to_analytics: boolean
  offer_location_on_hud: string
  marketplace_enabled: boolean
  maximum_quantity_per_order: number
  maximum_orders_per_type_per_player: number
  order_lifetime_value: number
  order_lifetime_unit: string
  maximum_price_per_order: number
  use_market_transaction_notifications: boolean
  market_receipt_count: number
  quick_order_unfilled_is_error: boolean
  marketplace_txn_history_caching: MarketplaceTxnHistoryCaching
  firebase_analytics_enabled: boolean
  daily_missions_repair_enabled: boolean
  enable_photo_mode_ui: boolean
  include_faction_shops_as_item_sources: boolean
  enable_voyage_analytics_tracking: boolean
  enable_voyage_analytics_client_tracking: boolean
  display_dabo_spin_flash: boolean
  quantum_card_enabled: boolean
  report_mail_list_benchmarks: boolean
  xsolla_guard: boolean
  pause_xsolla_giveaway: boolean
  fleet_boss_battles_enabled: boolean
  fleet_boss_battles: FleetBossBattles
  continuum_mission_enabled: boolean
  continuum_containers?: ContinuumContainer[];
  use_v2_activities_panel: boolean
  grant_current_season_entitlement: boolean
  should_reject_disabled_activities: boolean
  should_repair_progress: boolean
  ism_daily_rewards_reward_start_date: string
  fleet_activity_complete_all_daily_activities_start_date: string
  scanning_v2: ScanningV2
  allow_forte_inventory_access: boolean
  xsolla_giveaway: XsollaGiveaway[]
}

export interface VideoAdCampaignLimit {
  master_limit: Chance
  stt_rewarded_scan: Chance
  stt_rewarded_warp: Chance
  stt_cadet_warp: Chance
  stt_rewarded_shuttle: Chance
  stt_rewarded_credits: Chance
  stt_rewarded_dabo: Chance
  stt_rewarded_chroniton_boost: Chance
  stt_rewarded_double_rewards: Chance
}

export interface Chance {
  chance: number
  period_minutes: number
}

export interface AntiMacro {
  min_minutes_to_popup: number
  variable_minutes_to_popup: number
}

export interface HudPopupQueue {
  max_sequential_popups: number
  popup_cooldown_seconds: number
}

export interface LimitedTimeOffersV2 extends HudPopupQueue {
  enabled: boolean
  force_popup_at_login: boolean
}

export interface CrewCrafting {
  enabled: boolean
  crew_source_stores: string[]
}

export interface Retargeting {
  enabled: boolean
  lapsed_days: number
  spec_name: string
}

export interface MarketplaceTxnHistoryCaching {
  enabled: boolean
  duration_mins: number
}

export interface FleetBossBattles {
  battle_start_disabled: BattleStartDisabled
  battle_start_restricted_by_rank: boolean
}

export interface BattleStartDisabled {
  active: boolean
  use_notification: boolean
  message: Message
}

export interface Message {
  [key: string]: string;
}

export interface ScanningV2 {
  enabled: boolean
}

export interface XsollaGiveaway {
  sku: string
  quantity: number
}

export interface Motd {
  title: string
  text: string
  priority: number
  image: Icon
  url: string
  additional_motds: any[]
}

export interface CommunityLink {
  symbol: string
  image: LinkImage
  title: string
  date: string
  url: string
}

export interface LinkImage {
  file: string
  url: string
  version: string
}

export interface CrewRoster {
  key: number;
  rarity: number;
  name: string;
  total: number;
  owned: number;
  ownedPct: number;
  portalPct?: number;
  progress: number;
  progressPct: number;
  immortal: number;
  unfrozen: number;
  frozen: number;
  dupes: number;

}
export interface ContinuumContainer {
  fill_cap: number;
  fill_rate: FillRate;
  cooldown_time: number;
  cooldown_skip_cost_per_hour: number;
  unlock_cost: number;
  unlock_currency: string;
}

export interface FillRate {
  quantity: number;
  time_unit: string;
}


export interface CrewCraftingRoot {
  id: number
  config: CraftingConfig
  env: CraftingEnvironment
  energy: CraftingEnergy
}

export interface CraftingConfig {
  cost_discount_by_pool_size: CostDiscountByPoolSize
  cost_by_rarity: CostByRarity
  ism_subcoin_cost_to_open_crate: number
}

export interface CostDiscountByPoolSize {
  [key: string]: number;
}

export interface CostByRarity {
  [key: string]: CraftCost;
}

export interface CraftCost {
  credits: number
  energy: number
}

export interface CraftingEnvironment {
  crew_source_stores: string[]
  enabled: string
}

export interface CraftingEnergy extends Energy {
  id: number
  quantity: number
  regeneration: CraftingRegeneration
  regenerated_at: number
  coupons: number
}

export interface CraftingRegeneration {
  increment: number
  seconds: number
  amount: number
}

export interface ObjectiveEventRoot {
  id: number;
  statuses: ObjectiveEvent[];
}
