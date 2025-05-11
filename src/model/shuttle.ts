import { Icon } from "./game-elements"
import { Reward } from "./player"

export interface ShuttleAdventure {
    id: number
    symbol: string
    name: string
    faction_id: number
    token_archetype_id: number
    challenge_rating: number
    shuttles: Shuttle[]
    completes_in_seconds: number
    reference_timestamp: number;
    x: number
    y: number
  }

  export interface Shuttle {
    id: number
    name: string
    description: string
    state: number
    expires_in: number
    faction_id: number
    slots: Slot[]
    rewards: Reward[]
    is_rental: boolean
  }

  export interface Slot {
    level: any
    required_trait: any
    skills: string[]
    trait_bonuses: TraitBonuses
    crew_id?: string;
  }

  export interface TraitBonuses {
    [key: string]: any;
  }

  export interface StaticFaction {
    id: number
    name: string
    icon: string
    representative_icon: string
    reputation_item_icon: string
    home_system: string
    shop_layout: string
    shuttle_token_id: number
    shuttle_token_item_icon: string
  }

  export interface Faction {
    id: number
    name: string
    reputation: number
    discovered: number
    completed_shuttle_adventures: number
    icon: Icon
    representative_icon: Icon
    representative_full_body: Icon
    reputation_icon: Icon
    reputation_item_icon: Icon
    home_system: string
    shop_layout: string
    shuttle_token_id: number
    shuttle_token_preview_item: ShuttleTokenPreviewItem
    event_winner_rewards: any[]
  }

  export interface ShuttleTokenPreviewItem {
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
