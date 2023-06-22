import React from 'react';
import { CrewMember } from '../model/crew';
import { Ship, Schematics } from '../model/ship';
import { EquipmentItem } from '../model/equipment';

export interface DefaultCore {
	ready: (demands: string[]) => boolean;
	reset: () => boolean,
	crew: CrewMember[],
	ships: Schematics[],
	items: EquipmentItem[]
};

const defaultData = {
	crew: [] as CrewMember[],
	ship_schematics: [] as Schematics[],
	items: [] as EquipmentItem[]
};

export const DataContext = React.createContext<DefaultCore>({} as DefaultCore);

export const DataProvider = (props: { children: JSX.Element }) => {
	const { children } = props;

	const [readying, setReadying] = React.useState<string[]>([]);
	const [data, setData] = React.useState(defaultData);

	const providerValue = {
		ready,
		reset,
		crew: data.crew,
		ships: data.ship_schematics,
		items: data.items
	} as DefaultCore;

	return (
		<DataContext.Provider value={providerValue}>
			{children}
		</DataContext.Provider>
	);

	function ready(demands: string[]): boolean {
		// Not ready if any valid demands are already queued
		if (readying.length > 0) return false;

		// Fetch only if valid demand is not already satisfied
		const unsatisfied = [] as string[];
		demands.forEach(demand => {
			const valid = ['crew', 'ship_schematics', 'items'];
			if (valid.includes(demand)) {
				if (data[demand].length === 0) {
					unsatisfied.push(demand);
					setReadying(prev => {
						if (!prev.includes(demand)) prev.push(demand);
						return prev;
					});
					fetch(`/structured/${demand}.json`)
						.then(response => response.json())
						.then(result => {
							setData(prev => {
								const newData = {...prev};
								newData[demand] = result;
								return newData;
							});
						})
						.catch(error => {
							console.log(error);
						})
						.finally(() => {
							setReadying(prev => {
								const readying = prev.slice();
								const index = readying.indexOf(demand);
								if (index >= 0) readying.splice(index, 1);
								return readying;
							});
						});
				}
			}
			else {
				console.log(`Invalid data demand: ${demand}`);
			}
		});
		// Ready only if all valid demands are satisfied
		return unsatisfied.length === 0;
	}

	function reset(): boolean {
		setData({...defaultData});
		return true;
	}
};