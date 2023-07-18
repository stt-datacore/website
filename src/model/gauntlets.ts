import { CrewMember } from "./crew"
import { PlayerCrew } from "./player"

export interface Gauntlet {
    gauntlet_id?: number
    state: string
    jackpot_crew?: string
    seconds_to_join?: number
    contest_data?: ContestData
    date: string
    unavailable_msg?: string
    unavailable_desc_msg?: string,
    matchedCrew?: (PlayerCrew | CrewMember)[];
    prettyTraits: string[] | undefined;    
	origRanks?: { [key: string]: number };
}
  
export interface ContestData {
    featured_skill: string
    primary_skill: string
    traits: string[]
    crit_chance_per_trait: number
}
  