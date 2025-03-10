import { IDataSortField, IEssentialData } from './model';

export function dataFieldSort(data: IEssentialData[], sortField: IDataSortField, sortDirection: 'ascending' | 'descending'): IEssentialData[] {
	const getDataValue = (datum: IEssentialData): any => {
		return sortField.id.split('.').reduce((prev, curr) => prev.hasOwnProperty(curr) ? prev[curr] : undefined, datum);
	};
	return data.sort((a, b) => {
		if (sortField.stringValue)
			return alphaFieldSort(a, b, sortField, sortDirection);
		else if (sortField.customSort)
			return sortField.customSort(a, b, sortDirection);

		let aValue: any = getDataValue(a);
		let bValue: any = getDataValue(b);

		// Tiebreaker goes to name ascending
		if (aValue === bValue) return a.name.localeCompare(b.name);

		if (sortDirection === 'descending') return bValue - aValue;
		return aValue - bValue;
	});
}

export function alphaFieldSort(a: IEssentialData, b: IEssentialData, sortField: IDataSortField, sortDirection: string = 'ascending'): number {
	if (sortDirection === 'descending') return b[sortField.id].localeCompare(a[sortField.id]);
	return a[sortField.id].localeCompare(b[sortField.id]);
}
