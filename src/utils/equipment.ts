import { CrewMember, EquipmentSlot } from '../model/crew';
import { EquipmentItem } from '../model/equipment';
import { PlayerCrew } from '../model/player';

export interface IDemand {
	count: number;
	symbol: string;
	equipment?: EquipmentItem;
	factionOnly: boolean;
	have: number;
	crewSymbols: string[];	
}

export interface ICrewDemandsMeta {
	factionOnlyTotal: number;
	totalChronCost: number;
	craftCost: number;
}

export interface ICrewDemands extends ICrewDemandsMeta {
	demands: IDemand[];
	factionOnlyTotal: number;
	totalChronCost: number;
	craftCost: number;
}

export interface DemandCounts {
	name: string;
	count: number;
}

export function demandsPerSlot(es: EquipmentSlot, items: EquipmentItem[], dupeChecker: Set<string>, demands: IDemand[], crewSymbol: string): number {
	let equipment = items.find(item => item.symbol === es.symbol);
	if (!equipment) return 0;
	if (!equipment.recipe) {
		if (dupeChecker.has(equipment.symbol)) {
			let demand = demands.find(d => d.symbol === equipment?.symbol);
			if (demand) {
				demand.count++;
				demand.crewSymbols ??= [];				
				if (!demand.crewSymbols.includes(crewSymbol)) {
					demand.crewSymbols.push(crewSymbol);
				}
			}
		} else {
			dupeChecker.add(equipment.symbol);

			demands.push({
				crewSymbols: [crewSymbol],
				count: 1,
				symbol: equipment.symbol,
				equipment: equipment,
				factionOnly: false,
				have: 0
			});
		}

		return 0;
	}

	for (let iter of equipment.recipe.list) {
		let recipeEquipment = items.find(item => item.symbol === iter.symbol);
		if (dupeChecker.has(iter.symbol)) {
			let demand = demands.find(d => d.symbol === iter.symbol)
			if (demand) {
				demand.count += iter.count;
				demand.crewSymbols ??= [];				
				if (!demand.crewSymbols.includes(crewSymbol)) {
					demand.crewSymbols.push(crewSymbol);
				}
			}
			continue;
		}

		if (recipeEquipment?.item_sources.length === 0) {
			console.error(`Oops: equipment with no recipe and no sources: `, recipeEquipment);
		}

		dupeChecker.add(iter.symbol);

		demands.push({
			crewSymbols: [crewSymbol],
			count: iter.count,
			symbol: iter.symbol,
			equipment: recipeEquipment,
			factionOnly: iter.factionOnly,
			have: 0
		});
	}

	return equipment.recipe.craftCost;
}


export function demandsBySymbol(eqsym: string, items: EquipmentItem[], dupeChecker: Set<string>, demands: IDemand[], crewSymbol: string): number {
	let equipment = items.find(item => item.symbol === eqsym);
	if (!equipment) return 0;

	if (!equipment.recipe) {
		if (dupeChecker.has(equipment.symbol)) {
			let demand = demands.find(d => d.symbol === equipment?.symbol);
			if (demand) {
				demand.count++;
				demand.crewSymbols ??= [];				
				if (!demand.crewSymbols.includes(crewSymbol)) {
					demand.crewSymbols.push(crewSymbol);
				}
			}
		} else {
			dupeChecker.add(equipment.symbol);

			demands.push({
				crewSymbols: [crewSymbol],
				count: 1,
				symbol: equipment.symbol,
				equipment: equipment,
				factionOnly: false,
				have: 0
			});
		}

		return 0;
	}


	const currItem = demands.find(f => f.symbol === eqsym);

	if (currItem) {
		if (!currItem.crewSymbols.includes(crewSymbol)) {
			currItem.crewSymbols.push(crewSymbol);
			currItem.count++;
		}
	}
	else {		
		demands.push({
			crewSymbols: [crewSymbol],
				count: 1,
				symbol: equipment.symbol,
				equipment: equipment,
				factionOnly: equipment.factionOnly ?? false,
				have: 0
		})
	}

	for (let iter of equipment.recipe.list) {
		let recipeEquipment = items.find(item => item.symbol === iter.symbol);

		if (dupeChecker.has(iter.symbol)) {
			let demand = demands.find(d => d.symbol === iter.symbol)
			if (demand) {
				demand.count += iter.count;				
				demand.crewSymbols ??= [];				
				if (!demand.crewSymbols.includes(crewSymbol)) {
					demand.crewSymbols.push(crewSymbol);
				}
			}
			continue;
		}

		if (recipeEquipment?.item_sources.length === 0) {
			console.error(`Oops: equipment with no recipe and no sources: `, recipeEquipment);
		}

		dupeChecker.add(iter.symbol);

		demands.push({
			crewSymbols: [crewSymbol],
			count: iter.count,
			symbol: iter.symbol,
			equipment: recipeEquipment,
			factionOnly: iter.factionOnly,
			have: 0
		});
	}

	return equipment.recipe.craftCost;
}

export function calculateCrewDemands(crew: CrewMember | PlayerCrew, items: EquipmentItem[], fromCurrLvl?: boolean, bySymbol?: boolean): ICrewDemands {
	let craftCost = 0;
	let demands: IDemand[] = [];
	let dupeChecker = new Set<string>();
	crew.equipment_slots.forEach(es => {
		if (fromCurrLvl && "level" in crew) {
			if (es.level < crew.level) return;
			else if (es.level === crew.level && crew.equipment_slots[crew.level] !== undefined && crew.equipment_slots[crew.level].imageUrl) return;
		}
		if (bySymbol) {
			craftCost += demandsBySymbol(es.symbol, items, dupeChecker, demands, crew.symbol);
		}
		else {
			craftCost += demandsPerSlot(es, items, dupeChecker, demands, crew.symbol);
		}
		
	});

	const reducer = (accumulator: number, currentValue: IDemand) => accumulator + currentValue.count;

	return {
		craftCost,
		demands,
		factionOnlyTotal: demands.filter(d => d.factionOnly).reduce(reducer, 0),
		totalChronCost: Math.floor(demands.reduce((a, c) => a + estimateChronitonCost(c.equipment), 0))
	};
}

function estimateChronitonCost(equipment: EquipmentItem | undefined): number {
	let sources = equipment?.item_sources.filter(e => e.type === 0 || e.type === 2);

	// If faction only
	if (!sources || sources.length === 0) {
		return 0;
	}

	// TODO: figure out a better way to calculate these
	const RNGESUS = 1.8;

	let costCalc = [] as number[];
	for (let source of sources) {
		if (!source.cost) {
			//console.log("Mission information not available!", source);
			continue;
		}

		costCalc.push((6 - source.chance_grade) * RNGESUS * source.cost);
	}

	if (costCalc.length === 0) {
		console.warn('Couldnt calculate cost for equipment', equipment);
		return 0;
	}

	return costCalc.sort()[0];
}

function mergeDemands(a: ICrewDemands, b: ICrewDemands): ICrewDemands {
	
	let intersect = a.demands.filter(a1 => !!b.demands.find(b1 => b1.symbol === a1.symbol));
	let aonly = a.demands.filter(a1 => !b.demands.find(b1 => b1.symbol === a1.symbol));	
	let bonly = b.demands.filter(b1 => !a.demands.find(a1 => a1.symbol === b1.symbol));
	
	aonly ??= [];
	bonly ??= [];
	intersect ??= [];
	if (intersect.length) {
		intersect = JSON.parse(JSON.stringify(intersect));
		for (let item of intersect) {
			let bitem = b.demands.find(b2 => b2.symbol === item.symbol);
			if (bitem) {
				item.count += bitem.count;		
				item.crewSymbols ??= [];								
				for (let sym of bitem.crewSymbols ?? []) {
					if (!item.crewSymbols.includes(sym)) {
						item.crewSymbols.push(sym);
					}
				}
			}
		}
	}
	
	return {
		craftCost: a.craftCost + b.craftCost,
		demands: aonly.concat(bonly).concat(intersect),
		factionOnlyTotal: a.factionOnlyTotal + b.factionOnlyTotal,
		totalChronCost: a.totalChronCost + b.totalChronCost		
	};
}

export function calculateRosterDemands(crew: (CrewMember | PlayerCrew)[], items: EquipmentItem[], fromCurrLvl: boolean): ICrewDemands | undefined {
	let result: ICrewDemands | undefined = undefined;
	for (let member of crew) {
		let demands = calculateCrewDemands(member, items, fromCurrLvl, true);
		if (result) {
			result = mergeDemands(result, demands);
		}
		else {
			result = demands;
		}
	}	
	return result;
}