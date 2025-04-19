import { EquipmentItem } from "../model/equipment";
import { EquipmentWorkerConfig, EquipmentWorkerResults } from "../model/worker";
import { calculateRosterDemands } from "../utils/equipment";
import { binaryLocate, mergeItems } from "../utils/itemutils";

const ItemsWorker = {

    processItems: (config: EquipmentWorkerConfig) => {

        return new Promise<EquipmentWorkerResults>((resolve, reject) => {

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
				const rosterDemands = calculateRosterDemands(crew, items as EquipmentItem[], true, excludePrimary);

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
								let eq = JSON.parse(JSON.stringify(item.equipment)) as EquipmentItem;
								eq.needed = item.count;
								eq.factionOnly = item.equipment?.item_sources?.every(i => i.type === 1) ?? item.factionOnly;
								eq.quantity = 0;
								eq.demandCrew = [ ... item.crewSymbols ];
								data.push(eq);
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