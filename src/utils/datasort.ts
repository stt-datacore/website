export interface IConfigSortData {
	field: string; // can also be a nested object property path like "base_skills.command_skill.core"
	direction: 'descending' | 'ascending' | null;
	secondary?: {
		field: string;
		direction: 'descending' | 'ascending' | null;
	};
	subsort?: any[]; // rules for tiebreakers e.g. { field, direction }
	rotateFields?: any[];
	keepSortOptions?: boolean; // if set to true, don't advance direction or rotateFields
}

export interface IResultSortDataBy {
	field: string;
	direction: 'descending' | 'ascending' | null;
	result: any[];
}

export function sortDataBy(data: any[], config: IConfigSortData): IResultSortDataBy {
	let field = config.field, direction = config.direction, result = data;
	let keepSortOptions = config.keepSortOptions || false;

	if(!keepSortOptions && config.rotateFields && config.direction === 'descending') {
		field = getNextFieldInRotation(field, config.rotateFields);
	}
	if(!keepSortOptions) {
		direction = toggleDirection(direction);
	}

	config.subsort = config.subsort ?? [];

	// Convert secondary prop to subsort array; try to use subsort instead of secondary from now on
	if(config.secondary) {
		config.secondary.direction = config.secondary.direction ?? 'ascending';
		if (!keepSortOptions) config.secondary.direction = toggleDirection(config.secondary.direction);
		config.subsort = [{ field: config.secondary.field, direction: config.secondary.direction }];
	}

	const sortFactor = direction === 'descending' ? -1 : 1;
	result = result.sort((a, b) => {
		let sortValue = sortFactor*compare(
			getValueFromPath(a, field),
			getValueFromPath(b, field)
		);
		let tiebreaker = 0;
		while (sortValue == 0 && tiebreaker < config.subsort.length) {
			const nextSort = config.subsort[tiebreaker];
			const nextFactor = nextSort.direction === 'descending' ? -1 : 1;
			sortValue = nextFactor*compare(
				getValueFromPath(a, nextSort.field),
				getValueFromPath(b, nextSort.field)
			);
			tiebreaker++;
		}
		return sortValue;
	});

	return {
		field,
		direction,
		result
	};
}

function getValueFromPath(obj, path) {
	return path.split('.').reduce((a, b) => (a || {b: 0})[b], obj);
}

function getNextFieldInRotation(field, rotateFields) {
	const nextIndex = rotateFields.indexOf(field) + 1; // Will be 0 if previous column was not a pseudocolumn
	const nextFieldIndex = nextIndex === rotateFields.length ? 0 : nextIndex;
	const newField = rotateFields[nextFieldIndex];
	return newField;
}

function toggleDirection(direction) {
	return direction === 'ascending' ? 'descending' : 'ascending';
}

function compare(a, b) {
	if(!isNaN(a) && !isNaN(b)) {
		return a - b;
	}
	if (isNaN(a) && !isNaN(b)) return 1;
	if (!isNaN(a) && isNaN(b)) return -1;
	return (a > b ? 1 : b > a ? -1 : 0);
}
