import CONFIG from '../components/CONFIG';
import { CrewMember, EquipmentSlot, Skill } from '../model/crew';
import { EquipmentItem, ICrewDemands, IDemand } from '../model/equipment';
import { BuffBase, PlayerCrew, PlayerEquipmentItem } from '../model/player';
import { applySkillBuff, qbitsToSlots } from './crewutils';
import { ItemWithBonus, isQuipmentMatch } from './itemutils';
import { BuffStatTable } from './voyageutils';

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

export function haveCount<T extends BuffBase>(symbol: string, playerItems: T[]) {
	return playerItems.find(f => f.symbol === symbol)?.quantity ?? 0;
}

export function calcItemDemands(item: EquipmentItem, coreItems: EquipmentItem[], playerItems?: PlayerEquipmentItem[]) {
	let demands = [] as IDemand[];
	if (item.recipe) {
		for (let iter of item.recipe.list) {
			let recipeEquipment = coreItems?.find(item => item.symbol === iter.symbol);
			if (recipeEquipment) {
				demands.push({
					crewSymbols: [],
					count: iter.count,
					symbol: iter.symbol,
					equipment: recipeEquipment,
					factionOnly: iter.factionOnly,
					have: playerItems ? haveCount(iter.symbol, playerItems) : 0
				});
			}
		}
	}

	item.demands = demands;
	return demands;
}

export function canBuildItem(item: EquipmentItem, ignoreNonQuipment?: boolean) {
	if (!item.demands) return false;
	else if (!item.demands.length) return !!item.quantity;
	return item.demands.every(d => (d.have && d.have >= d.count) || (d.equipment !== undefined && d.equipment.type !== 15 && ignoreNonQuipment));
}

/** Returns true if demands were deducted, or false if the item, itself, was deducted */
export function deductDemands<T extends BuffBase>(item: EquipmentItem, items: T[]) {	
	let f = items.find(f => f.symbol === item.symbol);	
	if (f && f.quantity) {
		f.quantity--;
		return false;
	}

	if (!item.demands?.length) return false;

	item.demands.forEach((d) => {
		let item = items.find(f => f.symbol === d.symbol);
		if (item?.quantity && item.quantity >= d.count) {
			item.quantity -= d.count;
		}
	});

	return true;
}

export function reverseDeduction<T extends BuffBase>(item: EquipmentItem, items: T[]) {	
	if (!item.demands?.length) return false;

	item.demands.forEach((d) => {
		let item = items.find(f => f.symbol === d.symbol);
		if (item) {
			item.quantity ??= 0;
			item.quantity += d.count;
		}
	});

	return true;
}

export function calcQuipmentScore<T extends CrewMember>(crew: T, quipment: ItemWithBonus[], overallOnly?: boolean) {
	let qps = quipment.filter(f => isQuipmentMatch(crew, f.item));
	crew.quipment_score = qps.map(m => Object.values(m.bonusInfo.bonuses).map((n: Skill) => n.skill && n.skill in crew.base_skills && crew.base_skills[n.skill].core ? n.core + n.range_min + n.range_max : 0)).flat().reduce((p, n) => p + n, 0) * crew.max_rarity;
	if (overallOnly) return;

	crew.quipment_scores ??= {		
		command_skill: 0,
		medicine_skill: 0,
		diplomacy_skill: 0,
		science_skill: 0,
		security_skill: 0,
		engineering_skill: 0,
		trait_limited: 0
	};

	crew.quipment_scores.trait_limited = qps.filter(f => !!f.item.traits_requirement?.length).map(m => Object.values(m.bonusInfo.bonuses).map((n: Skill) => n.core + n.range_min + n.range_max)).flat().reduce((p, n) => p + n, 0) * crew.max_rarity;

	CONFIG.SKILLS_SHORT.forEach(sk => {
		if (crew.quipment_scores) {
			crew.quipment_scores[sk.name] = qps.map(m => Object.values(m.bonusInfo.bonuses).filter(f => f.skill === sk.name).map((n: Skill) => n.core + n.range_min + n.range_max)).flat().reduce((p, n) => p + n, 0) * crew.max_rarity;
		}
	});
}


export function calcQLots(
	crew: CrewMember, 
	quipment: ItemWithBonus[], 
	buffConfig?: BuffStatTable, 
	max_qbits?: boolean, 
	max_slots?: number) {

	//const allslots = rosterType === 'allCrew';
	const q_bits = max_qbits ? 1300 : crew.q_bits;
	const qbslots = qbitsToSlots(q_bits);
	const slots = max_slots ? (max_slots === 4 ? 4 : Math.min(qbslots, max_slots)) : qbslots;
	
	const crewQuipment = quipment.filter(q => isQuipmentMatch(crew, q.item));
	const skills = crew.skill_order;
	const q_lots = {} as { [key: string]: EquipmentItem[] };
	const q_power = {} as { [key: string]: Skill };

	const addQPower = (
		skill: string,
		slots: number) => {
		
		q_lots[skill] ??= [];				
			
		if (buffConfig) {
			let buffed = applySkillBuff(buffConfig, skill, crew.base_skills[skill]);
			q_power[skill] = {
				core: buffed.core,
				range_max: buffed.max,
				range_min: buffed.min
			}
		}				
		else {
			q_power[skill] = {
				... crew.base_skills[skill]
			}
		}
	
		let skq = crewQuipment.filter(f => skill in f.bonusInfo.bonuses).map(m => ({ item: m.item, skill: m.bonusInfo.bonuses[skill] }));
		if (skq?.length) {
			skq.sort((a, b) => {
				let ar = a.skill.core + ((a.skill.range_max + a.skill.range_min) * 0.5);
				let br = b.skill.core + ((b.skill.range_max + b.skill.range_min) * 0.5);
				return br - ar;
			});
			
			for (let i = 0; i < slots; i++) {                
				if (i < skq.length) {
					q_lots[skill].push(skq[i].item);
					
					q_power[skill].core += skq[i].skill.core;
					q_power[skill].range_max += skq[i].skill.range_max;
					q_power[skill].range_min += skq[i].skill.range_min;
					q_power[skill].skill = skill;
				}
			}
		}
	}

	skills.forEach((skill) => {
		addQPower(skill, slots);
	});

	crew.q_lots = q_lots;
	crew.q_power = q_power;

	if (crew.q_best_two_lots) {
		delete crew.q_best_two_lots;
	}

	if (crew.q_best_three_lots) {
		delete crew.q_best_three_lots;
	}	
	
	if (crew.skill_order.length >= 2) {
		crew.q_best_two_lots = calcBest(2, crew, max_qbits, max_slots);
	}

	if (crew.skill_order.length === 3) {
		crew.q_best_three_lots = calcBest(3, crew, max_qbits, max_slots);
	}

	return crew;
}

export function calcBest(
	best: 2 | 3,
	crew: CrewMember, 
	max_qbits?: boolean, 
	max_slots?: number) {

	const q_bits = max_qbits ? 1300 : crew.q_bits;
	const qbslots = qbitsToSlots(q_bits);
	const slots = max_slots ? (max_slots === 4 ? 4 : Math.min(qbslots, max_slots)) : qbslots;
	const skills = [] as string[];

	for (let i = 0; i < best; i++) {
		if (i >= crew.skill_order.length) break;
		skills.push(crew.skill_order[i]);
	}

	let c = skills.length;
	crew.q_lots ??= {};

	let lots = crew.q_lots;
	const flots = {} as { [key: string]: EquipmentItem[] };

	for (let i = 0; i < slots;) {
		for (let j = 0; j < c; j++) {
			let skill = skills[j];
			if (!lots[skill].length) continue;

			flots[skill] ??= [];
			flots[skill].push(lots[skill][0]);
			lots[skill].slice(0, 1);
			i++;
			if (i >= slots) break;
		}		
	}

	return flots;
}