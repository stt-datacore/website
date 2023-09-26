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
	skillsets: ICrewSkillSets = {};
	ranked: ICrewScore[] = [];
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

export interface ISeatAssignment {
	shuttleId: string;
	seatNum: number;
	ssId: string;
	assignedId: number;
	assignedSymbol: string;
	seatScore: number;
	locked: boolean;
};

export interface ICrewSkillSets {
	[key: string]: ICrewScore[];
}

export interface ICrewScore {
	id: number;
	symbol: string;
	name: string;
	score: number;
	ssId: string;
};

export interface IShuttleScores {
	[key: string]: IShuttleScore;
};

export interface IShuttleScore {
	chance: number;
	scores: number[];
};
