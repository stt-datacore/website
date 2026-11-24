import { IDataSortField, IEssentialData, TSortDirection } from './model';

export function dataFieldSort<T extends IEssentialData>(data: T[], sortField: IDataSortField, sortDirection: TSortDirection): T[] {
	return data.toSorted((a, b) => {
		if (sortField.stringValue)
			return alphaFieldSort(a, b, sortField, sortDirection);
		else if (sortField.customSort)
			return sortField.customSort(a, b, sortDirection);

		let aValue: any = getDataValue(a, sortField);
		let bValue: any = getDataValue(b, sortField);

		// Tiebreaker goes to name ascending
		if (aValue === bValue) return a.name.localeCompare(b.name);

		// Undefined data will ALWAYS be listed AFTER sorted defined data
		if (typeof aValue !== 'undefined' && typeof bValue === 'undefined') return -1;
		if (typeof bValue !== 'undefined' && typeof aValue === 'undefined') return 1;

		if (sortDirection === 'descending') return bValue - aValue;
		return aValue - bValue;
	});
}

function alphaFieldSort<T>(a: T, b: T, sortField: IDataSortField, sortDirection: TSortDirection = 'ascending'): number {
	let aValue: string = getDataValue(a, sortField);
	let bValue: string = getDataValue(b, sortField);
	if (sortDirection === 'descending') return bValue.localeCompare(aValue);
	return aValue.localeCompare(bValue);
}

function getDataValue<T>(datum: T, sortField: IDataSortField): any {
	const defaultValue: any = sortField.defaultToZero ? (sortField.stringValue ? '' : 0) : undefined;
	return sortField.id.split('.').reduce((prev, curr) => prev?.hasOwnProperty(curr) ? prev[curr] : defaultValue, datum);
}

// Lowercase strings and strip non-alphanumeric characters for smarter text matching
export function standardize(fieldValue: string): string {
	return fieldValue.toLowerCase().replace(/[^a-z0-9]/g, '');
}
