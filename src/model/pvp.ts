import { Icon } from "./game-elements"
import { Action } from "./traits"

export type PvpRoot = PvpRoot2[]

export interface PvpRoot2 {
  action: string
  pvp_opponents?: PvpOpponent[]
  pvp_division?: PvpDivision
}

export interface PvpOpponent {
  id: number
  player_id: number
  name: string
  rank: number
  icon: Icon
  background: any
  material: any
  symbol: string
  ship_icon: Icon
  ship_name: string
  ship_level: number
  rarity: number
  shields: number
  hull: number
  accuracy: number
  evasion: number
  attack: number
  crit_chance: number
  crit_bonus: number
  attacks_per_second: number
  shield_regen: number
  actions: Action[]
}

export interface PvpDivision {
  rank: number
  total: number
  id: number
}
