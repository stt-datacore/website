import React from 'react';

import { IDataSortField, IEssentialData, TSortDirection } from './model';
import { dataFieldSort } from './utils';

const DEBUG: boolean = true;

interface IPreparerMethod<T> {
	/** Data matches conditions */
	match?: (datum: T) => boolean;
	/** Markup data (e.g. buffCrew) */
	markup?: (datum: T) => T;
}

interface IPreparerOptions {
	/** Number of concurrent batches to process. Default is 1 */
	batchesPerPass?: number;
	/** Max number of items to iterate per batch. Default is 100 */
	itemsPerBatch?: number;
	/** Send progress back to caller (in percentage of progress, e.g. 10, 50, 100) */
	onProgress?: (progress: number) => void;
}

const DEFAULT_BATCHES_COUNT: number = 1;
const DEFAULT_ITEMS_COUNT: number = 100;

/** Applies match and/or markup methods to dataset in batches, helping prevent UI from locking up on complex iterations */
export function useDataPreparer<T>(
	methods: IPreparerMethod<T>[],
	options?: IPreparerOptions
): (
	data: T[]
) => Promise<T[]> {
	const [timer, setTimer] = React.useState<NodeJS.Timeout | undefined>(undefined);

	const batchesPerPass: number = options?.batchesPerPass ?? DEFAULT_BATCHES_COUNT;
	const itemsPerBatch: number = options?.itemsPerBatch ?? DEFAULT_ITEMS_COUNT;

	React.useEffect(() => {
		// Clean up active timers on unmount
		return () => {
			if (timer) clearTimeout(timer);
		};
	}, []);

	let perfStart: number = 0;

	function prepareData(data: T[]): Promise<T[]> {
		return new Promise<T[]>(resolve => {
			function onDataReady(data: T[]): void {
				resolve(data);
				setTimer(undefined);
				if (options?.onProgress) options.onProgress(100);
				if (DEBUG) console.log('useDataPreparer runtime', performance.now() - perfStart);
			}
			// Delay start of new process if timer already active
			//	This is specifically meant to defer processing while awaiting keyboard input
			let delay: number = 0;
			if (timer) {
				clearTimeout(timer);
				if (DEBUG) console.log('useDataPreparer collision!');
				delay = 200;
				if (DEBUG) console.log(`useDataPreparer new process delayed!`);
			}
			perfStart = performance.now();
			const newTimer: NodeJS.Timeout = setTimeout(() => {
				processBatches(data, 0, [], onDataReady);
			}, delay);
			setTimer(newTimer);
			if (options?.onProgress) options.onProgress(0);
		});
	}

	function processBatches(data: T[], startIndex: number, matches: T[], onDataReady: (data: T[]) => void): void {
		const batchStarts: number[] = [];
		for (let i = 0; i <= batchesPerPass; i++) {
			const batchStart: number = startIndex + (i * itemsPerBatch);
			if (batchStart >= data.length) break;
			batchStarts.push(batchStart);
		}
		const promises: Promise<T[]>[] = batchStarts.map(batchStart => {
			return promiseBatch(data, batchStart);
		});
		Promise.all(promises).then(batchMatches => {
			batchMatches.forEach(bestMatches => {
				matches = matches.concat(bestMatches);
			});
		}).finally(() => {
			// Queue next pass of matches
			const lastBatchStart: number = batchStarts[batchStarts.length - 1];
			if (lastBatchStart + itemsPerBatch < data.length) {
				const timer: NodeJS.Timeout = setTimeout(() => {
					processBatches(data, lastBatchStart + itemsPerBatch, matches, onDataReady);
				}, 0);
				setTimer(timer);
				if (options?.onProgress) options.onProgress((lastBatchStart + itemsPerBatch) / data.length * 100);
			}
			// No more data to process => output data
			else {
				onDataReady(matches);
			}
		})
		.catch(error => {
			throw (error);
		});
	}

	function promiseBatch(data: T[], startIndex: number): Promise<T[]> {
		return new Promise<T[]>(resolve => {
			const matches: T[] = [];
			for (let i = startIndex; i < startIndex + itemsPerBatch; i++) {
				if (i >= data.length) break;
				let isMatch: boolean = true;
				let datum: T = data[i];
				// Apply methods in sequential order. If multiple match methods, ALL matches must be true
				methods.forEach(method => {
					if (method.markup) {
						datum = method.markup(datum);
					}
					else if (method.match) {
						isMatch = isMatch && method.match(datum);
					}
				});
				if (isMatch) matches.push(datum);
			}
			resolve(matches);
		});
	}

	return prepareData;
}

interface ISorterOptions {
	/** Send progress back to caller (here it's either 0 or 100) */
	onProgress?: (progress: number) => void;
}

/** A wrapper to handle data sorting like data preparing above (note that tracking progress is not actually posssible here) */
export function useDataSorter<T extends IEssentialData>(
	options?: ISorterOptions
): (
	sortableData: T[],
	sortField: IDataSortField,
	sortDirection: TSortDirection
) => Promise<T[]> {
	const [timer, setTimer] = React.useState<NodeJS.Timeout | undefined>(undefined);

	let perfStart: number = 0;

	React.useEffect(() => {
		// Clean up active timers on unmount
		return () => {
			if (timer) clearTimeout(timer);
		};
	}, []);

	function sortData(sortableData: T[], sortField: IDataSortField, sortDirection: TSortDirection): Promise<T[]> {
		return new Promise<T[]>(resolve => {
			if (timer) {
				clearTimeout(timer);
				if (DEBUG) console.log('useDataSorter collision!');
			}
			perfStart = performance.now();
			const newTimer: NodeJS.Timeout = setTimeout(() => {
				const sortedData: T[] = dataFieldSort<T>(
					sortableData,
					sortField,
					sortDirection
				);
				resolve(sortedData);
				if (options?.onProgress) options.onProgress(100);
				if (DEBUG) console.log('useDataSorter runtime', performance.now() - perfStart);
			}, 0);
			setTimer(newTimer);
		});
	}

	return sortData;
}
