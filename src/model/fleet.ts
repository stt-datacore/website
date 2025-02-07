import { CrewAvatar } from "./player"

export interface FleetResponse {
    access_token: string
    fleet: Fleet
  }
  export interface Fleet {
    // id: number
    // name: string
    // enrollment: string
    // description: string
    // maxsize: number
    // cursize: number
    // created: number
    // nicon_index: number
    // nleader_player_dbid: number
    // nstarbase_level: number
    // nleader_login: number
    // slabel: string
    // nmin_level: number
    members: Member[]
    squads: Squad[]
    //leaderboard: Leaderboard[]
  }

  export interface Member {
    dbid: number
    display_name: string
    pid: number
    rank: string
    display_rank?: string
    last_update?: string
    crew_avatar: CrewAvatar
    squad: string
    squad_id: number
    squad_rank: string
    squad_leader?: boolean
    level: number
    last_active: number
    daily_activity: number
    daily_meta_progress: {
      progress: number;
      goal: number;
    }
    starbase_activity: number;
    event_rank: number
    squadron_event_rank?: number;
  }

  export interface Squad {
    id: number
    name: string
    cursize: number
    event_rank: number
    leader: number
  }

  export interface Leaderboard {
    fleet_rank: number
    index: number
    event_name: string
  }
