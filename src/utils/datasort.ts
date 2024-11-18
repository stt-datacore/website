import { CrewMember } from "../model/crew";
import { PlayerCrew } from "../model/player";

export interface SubSort {
	[key: string]: any;
	direction?: 'ascending' | 'descending' | null;
	field?: string;
}

export interface IConfigSortData {
	field: string; // can also be a nested object property path like "base_skills.command_skill.core"
	direction: 'descending' | 'ascending' | null;
	secondary?: {
		field: string;
		direction: 'descending' | 'ascending' | null;
	};
	subsort?: SubSort[]; // rules for tiebreakers e.g. { field, direction }
	rotateFields?: any[];
	keepSortOptions?: boolean; // if set to true, don't advance direction or rotateFields
	customCompare?: (a: any, b: any, config: IConfigSortData) => number;
}

export interface IResultSortDataBy {
	field: string;
	direction: 'descending' | 'ascending' | null;
	result: any[];
}

export function sortDataBy(data: any[], config: IConfigSortData): IResultSortDataBy {
	let field = config.field, direction: 'ascending' | 'descending' = config.direction ?? 'ascending', result = data;
	let keepSortOptions = config.keepSortOptions || false;

	if(!keepSortOptions && config.rotateFields && config.direction === 'descending') {
		field = getNextFieldInRotation(field, config.rotateFields);
	}
	if(!keepSortOptions) {
		direction = toggleDirection(direction);
	}

	if (!config.subsort) {
		config.subsort = [] as Object[];
	}

	// Convert secondary prop to subsort array; try to use subsort instead of secondary from now on
	if(config.secondary) {
		config.secondary.direction = config.secondary.direction ?? 'ascending';
		if (!keepSortOptions) config.secondary.direction = toggleDirection(config.secondary.direction);
		config.subsort = [{ field: config.secondary.field, direction: config.secondary.direction }];
	}

	const sortFactor = direction === 'descending' ? -1 : 1;

	if (config.customCompare) {
		const compare = config.customCompare;

		result = result.sort((a, b) => {
			let r = compare(a, b, config);
			return r * sortFactor;
		});
	}

	else {
		result = result.sort((a, b) => {
			let sortValue = sortFactor*compare(
				field === 'bigbook_tier' ? getTier(a, direction) : getValueFromPath(a, field),
				field === 'bigbook_tier' ? getTier(b, direction) : getValueFromPath(b, field)
			);

			let tiebreaker = 0;

			if (!config.subsort) return sortValue;

			while (sortValue == 0 && tiebreaker < config.subsort.length) {
				const nextSort = config.subsort[tiebreaker];
				const nextFactor = nextSort.direction === 'descending' ? -1 : 1;
				if (nextSort && nextSort.field) {
					sortValue = nextFactor*compare(
						getValueFromPath(a, nextSort.field),
						getValueFromPath(b, nextSort.field)
					);
				}
				tiebreaker++;
			}
			return sortValue;
		});

	}

	return {
		field,
		direction,
		result
	};
}

// Hack to always move a crew without a tier rating to the back of a tier sort
function getTier(obj: CrewMember, direction: 'ascending' | 'descending') {
	if (obj.bigbook_tier > 0) return obj.bigbook_tier;
	return direction === 'ascending' ? 100 : -1;
}

function getValueFromPath(obj: any, path: string) {
	return path.split('.').reduce((a, b) => (a || {b: 0})[b], obj);
}

function getNextFieldInRotation(field: string, rotateFields: string[]): string {
	const nextIndex = rotateFields.indexOf(field) + 1; // Will be 0 if previous column was not a pseudocolumn
	const nextFieldIndex = nextIndex === rotateFields.length ? 0 : nextIndex;
	const newField = rotateFields[nextFieldIndex];
	return newField;
}

function toggleDirection(direction: 'ascending' | 'descending'): 'ascending' | 'descending' {
	return direction === 'ascending' ? 'descending' : 'ascending';
}

function compare(a, b) {
	if(!isNaN(a) && !isNaN(b)) {
		return a - b;
	}
	if (isNaN(a) && !isNaN(b)) return -1;
	if (!isNaN(a) && isNaN(b)) return 1;
	return (a > b ? 1 : b > a ? -1 : 0);
}
