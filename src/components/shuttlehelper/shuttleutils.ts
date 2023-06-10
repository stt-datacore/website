import { Icon } from "../../model/game-elements";

export class Shuttlers {
	shuttles: Shuttle[] = [];
};

export class Shuttle {
	id: string = '';
	groupId: string = '';	// Required: event.symbol for events
	name: string = '';
	faction: number = -1;
	seats: ShuttleSeat[] = [];
	priority: number = 0;
	created: number = Date.now();
	readonly: boolean = false;
	constructor (groupId: string, id?: string, readonly?: boolean) {
		this.groupId = groupId;
		this.id = id ?? 'shuttle-'+Date.now();
		this.readonly = readonly ?? false;
	}
};

export class ShuttleSeat {
	operand: string = 'AND';
	skillA: string = '';
	skillB: string = '';
};

export class CrewScores {
	skillsets: any = {};
	ranked: ShuttleOccupant[] = [];
	constructor () {}
};

export function getSkillSetId(seat: ShuttleSeat): string {
	const skillA = seat.skillA;
	const skillB = seat.skillB;
	let skills = [skillA, skillB];
	if (skillA === '' || skillA === skillB)
		skills = [skillB];
	else if (skillB === '')
		skills = [skillA];
	return seat.operand+','+skills.sort((a, b)=>a.localeCompare(b));
}

export interface ShuttleAdventure {
	id: number
	symbol: string
	name: string
	faction_id: number
	token_archetype_id: number
	challenge_rating: number
	shuttles: ActiveShuttle[]
	completes_in_seconds: number
	x: number
	y: number
  }
  
  export interface ActiveShuttle {
	id: number
	name: string
	description: string
	state: number
	expires_in: number
	faction_id: number
	slots: ShuttleSlot[]
	rewards: ShuttleReward[]
	is_rental: boolean
  }
  
  export interface ShuttleSlot {
	level: any
	required_trait: any
	skills: string[]
	trait_bonuses: TraitBonuses
	crew_symbol?: string;
  }
  
  export interface TraitBonuses {
	[key: string]: any;
  }
  
  export interface ShuttleReward {
	type: number
	icon: Icon
	rarity?: number
	potential_rewards?: ShuttlePotentialReward[]
	quantity: number
	id?: number
	name?: string
  }
  
  export interface ShuttlePotentialReward {
	type: number
	icon: Icon
	rarity: number
	potential_rewards?: ShuttleRewardDetails[]
	quantity: number
	id?: number
	symbol?: string
	item_type?: number
	name?: string
	full_name?: string
	flavor?: string
  }
  
  export interface ShuttleRewardDetails {
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
	bonuses?: Bonuses
  }
  
  export interface Bonuses {
	[key: string]: number;
  }
  
  

 export interface AssignedCrew {
    shuttleId: string;
    seatNum: number;
    ssId?: string;
    assignedId: number;
    assignedSymbol: string;
    seatScore?: number;
    locked: boolean;
  }


  export interface ShuttleOccupant {
	id: number;
	symbol: string;
	name: string;
	score: number;
	ssId: string;
  }