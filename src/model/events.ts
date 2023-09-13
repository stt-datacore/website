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

// Stripped, modified version of GameData for Event Planner, Shuttle Helper, and Voyage tools
export interface IEventData {
	symbol: string;
	name: string;
	description: string;
	bonus_text: string;
	content_types: string[];	/* shuttles, gather, etc. */
	seconds_to_start: number;
	seconds_to_end: number;
	image: string;
	bonus: string[];	/* ALL bonus crew by symbol */
	featured: string[];	/* ONLY featured crew by symbol */
	bonusGuessed?: boolean;
};
