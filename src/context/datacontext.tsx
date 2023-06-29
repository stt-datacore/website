import React from 'react';
import { CrewMember } from '../model/crew';
import { Ship, Schematics } from '../model/ship';
import { EquipmentItem } from '../model/equipment';
import { PlayerCrew } from '../model/player';
import { Constellation, KeystoneBase, Polestar } from '../model/game-elements';

export type ValidDemands = 
	'crew' | 
	'ship_schematics' | 
	'items' | 
	'keystones' | 
	'collections' |
	'dilemmas' |
	'disputes' |
	'episodes' |
	'factions' |
	'gauntlets' |
	'quests' |
	'misc_stats';
		
export interface DataProviderProperties {
	children: JSX.Element;
}

export interface ContextCommon {
	ready: (demands?: any) => boolean;
	reset: () => boolean,
}

export interface DefaultCore extends ContextCommon {
	crew: PlayerCrew[],
	ship_schematics: Schematics[],
	ships: Ship[],
	items: EquipmentItem[],
	keystones: (KeystoneBase | Polestar | Constellation)[],
	ready: (demands: ValidDemands[]) => boolean;
};

const defaultData = {
	crew: [] as CrewMember[],
	ship_schematics: [] as Schematics[],
	ships: [] as Ship[],
	items: [] as EquipmentItem[],
	keystones: [] as KeystoneBase[]
};

export const DataContext = React.createContext<DefaultCore>({} as DefaultCore);

export const DataProvider = (props: DataProviderProperties) => {
	const { children } = props;

	const [readying, setReadying] = React.useState<string[]>([]);
	const [data, setData] = React.useState(defaultData);

	const providerValue = {
		ready,
		reset,
		crew: data.crew,
		ship_schematics: data.ship_schematics,
		ships: data.ships,
		items: data.items,
		keystones: data.keystones
	} as DefaultCore;

	return (
		<DataContext.Provider value={providerValue}>
			{children}
		</DataContext.Provider>
	);

	function ready(demands: ValidDemands[]): boolean {
		// Not ready if any valid demands are already queued
		if (readying.length > 0) return false;

		// Fetch only if valid demand is not already satisfied
		const valid = ['ship_schematics', 'items', 'keystones', 'collections', 'dilemmas', 'disputes', 'episodes', 'factions', 'gauntlets', 'quests', 'misc_stats'];
		const unsatisfied = [] as string[];

		// const unsatisfied = valid.filter((demand) => demands.includes(demand as ValidDemands) && data[demand].length === 0) ?? [];

		// if (unsatisfied.length) {
		// 	setReadying(unsatisfied);
		// 	let fetches: Promise<Response>[] = [];

		// 	for (let demand of unsatisfied) {
		// 		fetches.push(fetch(`/structured/${demand}.json`))
		// 	}			

		// 	Promise.all(fetches)
		// 		.then(responses => {
		// 			let jsons: Promise<any>[] = [];
		// 			for (let response of responses){
		// 				jsons.push(response.json());
		// 			}
		// 			Promise.all(jsons).then((results) => {
		// 				const newData = {...data};
		// 				let i = 0;
		// 				for (let demand of unsatisfied) {
		// 					if (demand === 'ship_schematics') {
		// 						let ship_schematics = results[i] as Schematics[];
		// 						let scsave = ship_schematics.map((sc => JSON.parse(JSON.stringify({ ...sc.ship, level: sc.ship.level + 1 })) as Ship))
		// 						newData.ships = scsave;
		// 					}

		// 					newData[demand] = results[i++];
		// 				}

		// 				setData(newData);
		// 				setReadying([]);
		// 			});
		// 		});
		// }

		demands?.forEach(demand => {
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
								if (demand === 'ship_schematics') {
									let ship_schematics = result as Schematics[];
									let scsave = ship_schematics.map((sc => JSON.parse(JSON.stringify({ ...sc.ship, level: sc.ship.level + 1 })) as Ship))
									newData.ships = scsave;
									newData.ship_schematics = ship_schematics;
								}
								else {
									newData[demand] = result;
								}
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