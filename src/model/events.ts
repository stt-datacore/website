import { Icon } from "./game-elements"

export interface EventLeaderboard {
  instance_id: number
  leaderboard: Leaderboard[]
}

export interface Leaderboard {
  dbid: number
  display_name: string
  pid: number
  avatar?: Icon
  level: number
  uid: number
  rank: number
  score: number
  fleetid?: number
  fleetname: any
}
