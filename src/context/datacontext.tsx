import React from 'react';
import { Gauntlet } from '../model/gauntlets';
import { CrewMember, SkillData } from '../model/crew';
import { Ship, Schematics, BattleStations } from '../model/ship';
import { EquipmentItem } from '../model/equipment';
import { PlayerCrew } from '../model/player';
import { Constellation, KeystoneBase, Polestar } from '../model/game-elements';
import { BuffStatTable, IBuffStat, calculateMaxBuffs } from '../utils/voyageutils';
import { Mission } from '../model/missions';

export type ValidDemands =
	'battle_stations' |
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
	'missions' |
	'quests' |
	'misc_stats' |
	'skill_bufs' |
	'cadet' |
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
	battle_stations: BattleStations[],
	ships: Ship[],
	items: EquipmentItem[],
	missions: Mission[],
	episodes: Mission[],
	cadet: Mission[],
	keystones: (KeystoneBase | Polestar | Constellation)[],
	all_buffs: BuffStatTable,
	gauntlets: Gauntlet[];
	ready: (demands: ValidDemands[]) => boolean;
};

const defaultData = {
	crew: [] as CrewMember[],
	ship_schematics: [] as Schematics[],
	battle_stations: [] as BattleStations[],
	ships: [] as Ship[],
	items: [] as EquipmentItem[],
	keystones: [] as KeystoneBase[],
	all_buffs: {} as BuffStatTable,
	gauntlets: [] as Gauntlet[],
	missions: [] as Mission[],
	episodes: [] as Mission[],
	cadet: [] as Mission[]
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
		const valid = ['battle_stations', 'crew', 'cadet', 'ship_schematics', 'items', 'keystones', 'collections', 'missions', 'dilemmas', 'disputes', 'episodes', 'factions', 'gauntlets', 'quests', 'misc_stats', 'skill_bufs', 'all_buffs'];
		const unsatisfied = [] as string[];
		demands ??= [];

		if (demands.includes('ship_schematics') && !demands.includes('battle_stations')) {
			demands.push('battle_stations');
		}

		demands?.forEach(demand => {
			// this is a hack because BB uses all buffs but we don't always have player data
			// and our skill_bufs does not yet match BB data. So for now, we're ignoring them.
			if (demand === 'skill_bufs') demand = 'all_buffs';
			
			if (valid.includes(demand)) {
				if (data[demand].length === 0 || (demand === 'all_buffs' && !Object.keys(data[demand])?.length)) {
					unsatisfied.push(demand);
					setReadying(prev => {
						if (!prev.includes(demand)) prev.push(demand);
						return prev;
					});

					fetch(`/structured/${demand}${demand === 'cadet' ? '.txt' : '.json'}`)
						.then(response => response.json())
						.then(result => {
							setData(prev => {
								const newData = { ...prev };
								if (demand === 'skill_bufs') {
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
										item.action.cycle_time = item.action.cooldown + item.action.duration;
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
								if ((demand ==='ship_schematics' || demand === 'battle_stations') &&
									newData.battle_stations?.length && newData.ship_schematics?.length) {
									for (let sch of newData.ship_schematics) {
										let battle = newData.battle_stations.find(b => b.symbol === sch.ship.symbol);
										if (battle) {
											sch.ship.battle_stations = battle.battle_stations;
										}
									}
									
									let ship_schematics = demand === 'ship_schematics' ? result : newData.ship_schematics as Schematics[];
									let scsave = ship_schematics.map((sc => JSON.parse(JSON.stringify({ ...sc.ship, level: sc.ship.level + 1 })) as Ship))

									newData.ships = scsave;
									newData.ship_schematics = ship_schematics;
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