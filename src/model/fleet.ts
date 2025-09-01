import { BuffStatTable } from "../utils/voyageutils"
import { Icon } from "./game-elements"
import { CrewAvatar } from "./player"

export interface FleetResponse {
    access_token: string
    fleet: FleetDetails
  }
  export interface FleetDetails {
    id: number
    slabel: string;
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
    last_update?: Date
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
    hash?: string;
    fleet_id: number;
    fleet: string;
  }

  export interface Squad {
    id: number
    name: string
    cursize: number
    event_rank: number
    leader: number
    rootguild: number;
  }

  export interface Leaderboard {
    fleet_rank: number
    index: number
    event_name: string
  }


  export interface ProfileData {
    id: number
    dbid: string
    captainName: string
    sttAccessToken: any
    hash: string
    metadata: ProfileMetadata
    lastUpdate: string
    buffConfig: BuffStatTable
    shortCrewList: ShortCrewList
    userId: number
    creationDate: string
    updatedAt: string
  }

  export interface ProfileMetadata {
    open_collection_ids: number[]
    crew_avatar?: {
      name: string,
      symbol: string,
      icon?: string | Icon,
      portrait?: string | Icon,
      full_body?: string | Icon
    }
  }

  export interface ShortCrewList {
    crew: ShortCrew[]
    c_stored_immortals: number[]
    stored_immortals: StoredImmortal[]
  }

  export interface ShortCrew {
    id: number
    rarity: number
  }

  export interface StoredImmortal {
    id: number
    quantity: number
  }
