import React from 'react';
import { Gauntlet } from '../model/gauntlets';
import { CrewMember, SkillData } from '../model/crew';
import { Ship, Schematics } from '../model/ship';
import { EquipmentItem } from '../model/equipment';
import { PlayerCrew } from '../model/player';
import { Constellation, KeystoneBase, Polestar } from '../model/game-elements';
import { BuffStatTable, IBuffStat, calculateMaxBuffs } from '../utils/voyageutils';

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
	'misc_stats' |
	'skill_bufs' |
	'all_buffs';

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
	all_buffs: BuffStatTable,
	gauntlets: Gauntlet[];
	ready: (demands: ValidDemands[]) => boolean;
};

const defaultData = {
	crew: [] as CrewMember[],
	ship_schematics: [] as Schematics[],
	ships: [] as Ship[],
	items: [] as EquipmentItem[],
	keystones: [] as KeystoneBase[],
	all_buffs: {} as BuffStatTable,
	gauntlets: [] as Gauntlet[]
};

export const DataContext = React.createContext<DefaultCore>({} as DefaultCore);

export const DataProvider = (props: DataProviderProperties) => {
	const { children } = props;

	const [readying, setReadying] = React.useState<string[]>([]);
	const [data, setData] = React.useState(defaultData);

	const providerValue = {
		...data,
		ready,
		reset,
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
		const valid = ['crew', 'ship_schematics', 'items', 'keystones', 'collections', 'dilemmas', 'disputes', 'episodes', 'factions', 'gauntlets', 'quests', 'misc_stats', 'skill_bufs', 'all_buffs'];
		const unsatisfied = [] as string[];

		demands?.forEach(demand => {
			if (demand === 'skill_bufs') demand = 'all_buffs';
			if (valid.includes(demand)) {
				if (data[demand].length === 0 || (demand === 'all_buffs' && !Object.keys(data[demand])?.length)) {
					unsatisfied.push(demand);
					setReadying(prev => {
						if (!prev.includes(demand)) prev.push(demand);
						return prev;
					});

					fetch(`/structured/${demand}.json`)
						.then(response => response.json())
						.then(result => {
							setData(prev => {
								const newData = { ...prev };
								if (demand === 'ship_schematics') {
									let ship_schematics = result as Schematics[];
									let scsave = ship_schematics.map((sc => JSON.parse(JSON.stringify({ ...sc.ship, level: sc.ship.level + 1 })) as Ship))
									newData.ships = scsave;
									newData.ship_schematics = ship_schematics;
								}
								else if (demand === 'skill_bufs') {
									let sks = {} as BuffStatTable;
									let skills = ['science', 'engineering', 'medicine', 'diplomacy', 'security', 'command'];
									let types = ['core', 'range_min', 'range_max'];
									for (let skill of skills) {
										for (let type of types) {
											let bkey = `${skill}_skill_${type}`;
											sks[bkey] = {} as IBuffStat;
											sks[bkey].percent_increase = result[skill][type];
											sks[bkey].multiplier = 1;
										}
									}
									newData[demand] = sks;
								}
								else if (demand === 'all_buffs') {
									newData[demand] = calculateMaxBuffs(result);
								}
								else if (demand === 'crew') {
									(result as CrewMember[]).forEach((item) => {
										if (typeof item.date_added === 'string') {
											item.date_added = new Date(item.date_added);
										}
									});
									newData[demand] = result;
								}
								else {
									if (demand === 'gauntlets') {
										(result as Gauntlet[])?.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
									}
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
		setData({ ...defaultData });
		return true;
	}
};