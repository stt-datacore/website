import localforage from "localforage";
import { CrewMember } from "../model/crew";
import { EquipmentItem, ICrewDemands } from "../model/equipment";
import { PlayerCrew } from "../model/player";
import { EquipmentWorkerConfig, EquipmentWorkerResults } from "../model/worker";
import { calculateRosterDemands, mergeDemands } from "../utils/equipment";
import { binaryLocate, mergeItems } from "../utils/itemutils";
import { ParaDemandConfig } from "./parademand";

const ItemsWorker = {
	splitCrew: (crew: (PlayerCrew | CrewMember)[]) => {
		let cores = 1;
		crew = crew.slice();
		if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
			cores = Math.max(1, Math.floor(navigator.hardwareConcurrency / 2));
		}
		const result = {
			cores,
			batches: [] as (PlayerCrew | CrewMember)[][]
		}
		const batchSize = Math.floor(crew.length / cores)
		while (crew.length) {
			let bcrew = crew.splice(0, batchSize);
			result.batches.push(bcrew);
		}
		return result;
	},
	paraDispatch: async (config: ParaDemandConfig): Promise<ICrewDemands | undefined> => {
		const worker = new Worker(new URL('./parademand', import.meta.url));
		worker.postMessage({
			id: 'para-item-demands',
			config
		});

		let p = new Promise<ICrewDemands | undefined>((resolve, reject) => {
			const listenFunc = (data) => {
				worker.removeEventListener('message', listenFunc);
				resolve(data.data.result);
			}
			worker.addEventListener('message', listenFunc);
		});

		let result = await p;
		return result;
	},
    processItems: (config: EquipmentWorkerConfig) => {

        return new Promise<EquipmentWorkerResults>(async (resolve, reject) => {
            const { items, playerData, crewFilter, excludePrimary } = config;

			const data = mergeItems(playerData?.player.character.items ?? [], items).map(d => ({...d, needed: 0 })) as EquipmentItem[];

            const catalog = [ ...items ].sort((a, b) => a.symbol.localeCompare(b.symbol));

			data.sort((a, b) => a.symbol.localeCompare(b.symbol));

			if (!!playerData?.player?.character?.crew?.length && !!data?.length) {
				let crewLevels: { [key: string]: Set<string>; } = {};
				playerData.player.character.crew.forEach(cr => {
					cr.equipment_slots.forEach(es => {
						let item = binaryLocate(es.symbol, catalog);
						if (item) {
							crewLevels[es.symbol] ??= new Set();
							crewLevels[es.symbol].add(cr.name);
						}
					});
				});

				for (let symbol in crewLevels) {
					if (crewLevels[symbol] && crewLevels[symbol].size > 0) {
						let item = binaryLocate(symbol, catalog);
						if (item && !item.flavor) {
							if (crewLevels[symbol].size > 5) {
								item.flavor = `Equippable by ${crewLevels[symbol].size} crew`;
							} else {
								item.flavor = 'Equippable by: ' + [...crewLevels[symbol]].join(', ');
							}
						}
					}
				}

				const crew = playerData.player.character.crew.filter(c => !crewFilter?.length || crewFilter.includes(c.id));

				const { batches } = ItemsWorker.splitCrew(crew)

				await localforage.setItem('itemsWorker_coreItems', items);
				const workers = batches.map(batch => {
					return ItemsWorker.paraDispatch({
						crew: batch,
						items: [],
						excludePrimary,
						fromCurrLvl: true
					});
				});
				let demandres = (await Promise.all(workers)).filter(f => f !== undefined);
				await localforage.removeItem('itemsWorker_coreItems');

				const rosterDemands = demandres.reduce((p, n) => p ? mergeDemands(p, n) : n, undefined as ICrewDemands | undefined);

				//const rosterDemands = calculateRosterDemands(crew, items as EquipmentItem[], true, excludePrimary);

				rosterDemands?.demands.sort((a, b) => a.symbol.localeCompare(b.symbol));

				for (let item of data) {
					if (item.type === 8) {
						let scheme = playerData.player.character.ships.find(f => f.symbol + "_schematic" === item.symbol);
						if (scheme && scheme.schematic_gain_cost_next_level && scheme.schematic_gain_cost_next_level > 0 && scheme.level !== scheme.max_level) {
							item.needed = scheme.schematic_gain_cost_next_level - (item.quantity ?? 0);
							item.factionOnly = false;
						}
						else {
							item.needed = 0;
							item.factionOnly = false;
							if ("demandCrew" in item) delete item.demandCrew;
						}
					}
					else if (item.type === 2 || item.type === 3) {
						const fitem = binaryLocate(item.symbol, rosterDemands?.demands ?? []);
						if (fitem) {
							item.needed = fitem.count;
							item.factionOnly = fitem.equipment?.item_sources?.every(i => i.type === 1) ?? item.factionOnly;
							item.demandCrew ??= []
							for (let sym of fitem.crewSymbols) {
								if (sym && !item.demandCrew.find(f => f === sym)) {
									item.demandCrew.push(sym);
								}
							}
							// if (item.demandCrew.length > 5) {
							// 	item.flavor = `Equippable by ${item.demandCrew.length} crew`;
							// } else {
								item.flavor = 'Equippable by: ' + item.demandCrew.join(', ');
							//}
						}
						else {
							item.needed = 0;
							item.factionOnly = false;
							item.demandCrew = [];
						}
					}
				}

				if (rosterDemands?.demands.length && config.addNeeded === true) {
					for (let item of rosterDemands.demands) {
						if (!binaryLocate(item.symbol, data) && items) {
							item.equipment = binaryLocate(item.symbol, catalog) as EquipmentItem | undefined;
							if (item.equipment && item.count){
								let eq = structuredClone(item.equipment) as EquipmentItem;
								eq.needed = item.count;
								eq.factionOnly = item.equipment?.item_sources?.every(i => i.type === 1) ?? item.factionOnly;
								eq.quantity = 0;
								eq.demandCrew = [ ... item.crewSymbols ];
								data.push(eq);
								data.sort((a, b) => a.symbol.localeCompare(b.symbol));
							}
						}
					}
				}
			}

            resolve({
                items: data
            });
        });
    },

}

export default ItemsWorker;