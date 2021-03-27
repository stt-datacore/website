export interface IConfigSortData {
	field: string; // can also be a nested object property path like "base_skills.command_skill.core"
	direction: 'descending' | 'ascending' | null;
	secondary?: {
		field: string;
		direction: 'descending' | 'ascending' | null;
	};
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
		direction = setDirection(direction);
	}
	
	if(config.secondary) {
		config.secondary.direction = config.secondary.direction === null ? setDirection(null) : config.secondary.direction;
		config.secondary.direction = keepSortOptions === true ? config.secondary.direction : setDirection(config.secondary.direction);
	}

	if(!config.secondary) {
		result = result.sort((a, b) => compare(
			getValueFromPath(a, field),
			getValueFromPath(b, field)
		));
	} else {
		result = result.sort((a, b) => compareWithSecondary(
			getValueFromPath(a, field),
			getValueFromPath(b, field),
			getValueFromPath(config.secondary.direction === 'ascending' ? a : b, config.secondary.field),
			getValueFromPath(config.secondary.direction === 'ascending' ? b : a, config.secondary.field)
		));
	}
	
	if(direction === 'descending') {
		result.reverse();
	}
	
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

function setDirection(direction) {
	return direction === 'ascending' ? 'descending' : 'ascending';
}

function compare(a, b) {
	if(!isNaN(a) && !isNaN(b)) {
		return a - b;
	}
	return (a > b ? 1 : b > a ? -1 : 0);
}

function compareWithSecondary(a, b, c, d) {
	if(!isNaN(a) && !isNaN(b) && !isNaN(c) && !isNaN(d)) {
		return a - b || c - d;
	}
	return (a > b ? 1 : b > a ? -1 : 0) || (c > d ? 1 : d > c ? -1 : 0);
}
