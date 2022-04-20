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
	ranked: any[] = [];
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