import { IRosterCrew } from '../../components/eventplanner/model';

export class Shuttlers {
	shuttles: Shuttle[] = [];
};

export class Shuttle {
	id: string = '';
	groupId: string = '';	// Required: event.symbol for events
	name: string = '';
	faction: number = -1;
	challenge_rating: number = 2000;
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
};

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

export interface ITableColumn {
	id: string;
	title: string | React.JSX.Element;
	align?: 'left' | 'right' | 'center';
	span?: number;
	sortField?: ITableSortField;
};

export interface ITableSortField {
	id: string;
	firstSort?: 'ascending' | 'descending';
};

export interface ITableData extends Shuttle {
	status: string;
	is_rental: boolean;
	expires_in: number;
	chance: number;
};

export interface IAssignableCrew extends IRosterCrew {
	ssId: string;
	score: number;
};

export interface IActiveEdit {
	shuttleId: string;
	seatNum: number;
};

export interface IDropdownOption {
	key: string | number;
	value: string | number;
	text: string | React.JSX.Element;
};
