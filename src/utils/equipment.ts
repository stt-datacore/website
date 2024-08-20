import CONFIG from '../components/CONFIG';
import { ArchetypeRoot20 } from '../model/archetype';
import { ComputedSkill, CrewMember, EquipmentSlot, PowerLot, Skill } from '../model/crew';
import { EquipmentIngredient, EquipmentItem, ICrewDemands, IDemand } from '../model/equipment';
import { BuffBase, PlayerCrew, PlayerEquipmentItem } from '../model/player';
import { applySkillBuff, numberToGrade, powerSum, qbitsToSlots, skillSum } from './crewutils';
import { ItemWithBonus, getItemBonuses, isQuipmentMatch } from './itemutils';
import { makeAllCombos } from './misc';
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



export function makeRecipeFromArchetypeCache(item: EquipmentItem, globalItems: EquipmentItem[], playerItems: PlayerEquipmentItem[], archetype_cache: ArchetypeRoot20) {
	let aitem = archetype_cache?.archetypes.find(f => f.id.toString() === item.id?.toString());
	if (!aitem?.recipe) return;
	item.recipe = { 
		incomplete: false,
		craftCost: 0,
		list: []
	}
	let recipe_items = globalItems.filter(f => aitem.recipe?.demands?.some(d => d.archetype_id?.toString() === f.id?.toString()))
	if (recipe_items?.length) {
		let newrecipe = recipe_items.map((m, idx) => ({
			count: aitem.recipe?.demands[idx].count,
			factionOnly: false,
			symbol: m.symbol
		} as EquipmentIngredient));
		item.recipe.list = item.recipe.list.concat(newrecipe);
	}
	item.demands = calcItemDemands(item, globalItems, playerItems);
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

interface QpCount {
	count: number;
	item: EquipmentItem;
	bonuses: Skill[];
};

export function calcQLots(
	crew: CrewMember,
	quipment: ItemWithBonus[],
	buffConfig?: BuffStatTable,
	max_qbits?: boolean,
	max_slots?: number,
	mode?: 'all' | 'core' | 'proficiency') {

	mode ??= 'all';

	const cmode = mode;

	//const allslots = rosterType === 'allCrew';
	const q_bits = max_qbits ? 1300 : crew.q_bits;
	const qbslots = qbitsToSlots(q_bits);
	const slots = max_slots ? (max_slots === 4 ? 4 : Math.min(qbslots, max_slots)) : qbslots;
	if (crew.symbol === 'pike_rhapsody_crew') {
		console.log("debug");
	}
	const crewQuipment = quipment.filter(q => isQuipmentMatch(crew, q.item))
		.sort((a, b) => {
			let abon = Object.keys(a.bonusInfo.bonuses).filter(f => f in crew.base_skills && Object.keys(crew.base_skills[f]).some(val => crew.base_skills[f][val]));
			let bbon = Object.keys(b.bonusInfo.bonuses).filter(f => f in crew.base_skills && Object.keys(crew.base_skills[f]).some(val => crew.base_skills[f][val]));
			let r = bbon.length - abon.length;
			if (r) return r;
			let ar = skillSum(Object.values(a.bonusInfo.bonuses), cmode);
			let br = skillSum(Object.values(b.bonusInfo.bonuses), cmode);
			return br - ar;
		});

	const skills = crew.skill_order;
	const q_lots = {} as { [key: string]: EquipmentItem[] };
	const q_power = {} as { [key: string]: Skill };

	const calcBest = (
		best: 2 | 3,
		crew: CrewMember,
		max_qbits?: boolean,
		max_slots?: number,
		use?: number[]) => {

		const q_bits = max_qbits ? 1300 : crew.q_bits;
		const qbslots = qbitsToSlots(q_bits);
		const slots = max_slots ? (max_slots === 4 ? 4 : Math.min(qbslots, max_slots)) : qbslots;
		const skills = [] as string[];

		let x = 0;
		for (let i = 0; i < 3; i++) {
			if (use && !use.includes(i)) continue;
			if (x >= best) break;
			if (i >= crew.skill_order.length) break;
			skills.push(crew.skill_order[i]);
			x++;
		}

		let maxskills = skills.length;
		// if (maxskills===3) {
		// 	console.log("here")
		// }
		crew.q_lots ??= { power: [], lot: {}, crew_power: 0, crew_by_skill: {} };

		//let lots = crew.q_lots;
		let lots = { power: [], lot: {}, crew_power: 0, crew_by_skill: {} } as PowerLot;
		crewQuipment.forEach((cq) => {
			Object.keys(cq.bonusInfo.bonuses).forEach((skill) => {
				if (skill in crew.base_skills && skills.includes(skill)) {
					lots.lot[skill] ??= [];
					lots.lot[skill].push(cq.item);
				}
			});
		});

		const flots = { power: [], lot: {}, crew_power: 0, crew_by_skill: {} } as PowerLot;
		const qpcounts = [] as QpCount[];

		skills.forEach((skill) => {
			lots.lot[skill]?.forEach((item) => {
				let f = qpcounts.find(f => f.item === item);
				if (!f) {
					let bonuses = Object.values(crewQuipment.find(f => f.item === item)?.bonusInfo.bonuses ?? {});
					let filterb = bonuses.filter(fb => {
						if (fb.skill !== skill) return false;
						if (cmode === 'core' && fb.core === 0) return false;
						if (cmode === 'proficiency' && fb.range_max === 0 && fb.range_min === 0) return false;
						return true;
					});
					if (filterb?.length) {
						qpcounts.push({
							item,
							count: 1,
							bonuses: filterb
						});
					}
				}
				else {
					f.count++;
				}
			});
		});

		const numbers = qpcounts.map(qp => qp.item).flat().map(m => Number(m.kwipment_id as string));
		const combos = makeAllCombos(numbers, undefined, undefined, undefined, slots).filter(c => c.length === slots);

		const newmap = combos.map(cb => cb.map(co => ({ ... qpcounts.find(f => f.item.kwipment_id === co.toString()) as QpCount } as QpCount)));

		const baldiff = [] as { value: number, power: QpCount[], skills: string[] }[];

		newmap.forEach((power) => {
			const skillbalance = {} as { [key: string]: { value: number, skills: Skill[] } };
			skills.forEach((skill) => {
				const skills = power.filter(f => f.bonuses?.some(b => b?.skill === skill)).map(m => m.bonuses).flat().filter(f => f.skill === skill);
				if (!skills?.length) return;

				skillbalance[skill] = {
					value: skillSum(skills, cmode),
					skills
				}
			});
			const outskills = Object.keys(skillbalance);
			let value = 0;

			if (outskills.length === 2) {
				value = (skillbalance[outskills[0]].value + skillbalance[outskills[1]].value) - (Math.abs(skillbalance[outskills[0]].value - skillbalance[outskills[1]].value));
			}
			else if (outskills.length === 3) {
				let values = Object.values(skillbalance).map(m => m.value).sort();
				value = (values.reduce((p, n) => p ? p + n : n, 0)) - Math.abs(values.reduce((p, n) => p ? p - n : n, 0));
			}
			baldiff.push({
				value,
				power,
				skills: outskills
			});
		});

		if (baldiff?.length) {

			baldiff.sort((a, b) => {
				let r = b.skills.length - a.skills.length;
				if (r) return r;
				// if (a.skills.length === 2) {
					r = b.value - a.value;
				//}
				// else {
				// 	r = b.value - a.value;
				// }
				return r;
			});

			baldiff[0].power.forEach((qp) => {
				if (!qp?.bonuses?.length || !qp?.bonuses[0]?.skill) {
					console.log("Problem with " + crew.symbol);
					console.log(qp);
					return;
				}

				let skill = qp.bonuses[0].skill;
				flots.lot[skill] ??= [];
				flots.lot[skill].push(qp.item);
			});

		}

		// Object.keys(lots.lot).forEach((skill) => {
		// 	if (!(skill in lots.lot) || !lots.lot[skill].length) return;

		// 	lots.lot[skill].sort((a, b) => {
		// 		let ai = qpcounts.find(f => f.item === a);
		// 		let bi = qpcounts.find(f => f.item === b);
		// 		if (ai && bi) {
		// 			let ares = ai.bonuses.filter(sk => skills.includes(sk.skill as string)).length;
		// 			let bres = bi.bonuses.filter(sk => skills.includes(sk.skill as string)).length;
		// 			let r = bres - ares;
		// 			if (r) return r;

		// 			let ar = skillSum(ai.bonuses.filter(f => f.skill && f.skill in crew.base_skills));
		// 			let br = skillSum(bi.bonuses.filter(f => f.skill && f.skill in crew.base_skills));
		// 			return br - ar;
		// 		}
		// 		else if (ai) {
		// 			return -1;
		// 		}
		// 		else if (bi) {
		// 			return 1;
		// 		}
		// 		return 0;
		// 	});
		// });

		// for (let i = 0; i < slots;) {
		// 	for (let j = 0; j < maxskills; j++) {
		// 		let skill = skills[j];
		// 		flots.lot[skill] ??= [];

		// 		if (!lots.lot[skill].length) continue;
		// 		if (Object.keys(flots.lot).some(fk => fk in flots.lot && flots.lot[fk].includes(lots.lot[skill][0]))) {
		// 			lots.lot[skill].splice(0, 1);
		// 			if (lots.lot[skill].length) {
		// 				j--;
		// 			}
		// 			continue;
		// 		}

		// 		flots.lot[skill] ??= [];
		// 		flots.lot[skill].push(lots.lot[skill][0]);
		// 		lots.lot[skill].splice(0, 1);

		// 		i++;
		// 		if (i >= slots) break;
		// 	}
		// }

		flots.power = Object.values(flots.lot).map(lot => lot.map(item => (qpcounts.find(f => f.item === item) as QpCount).bonuses).flat()).flat()
		return flots;
	};

	const addQPower = (
		skill: string,
		slots: number) => {

		q_lots[skill] ??= [];

		if (buffConfig) {
			let buffed = applySkillBuff(buffConfig, skill, crew.base_skills[skill]);
			q_power[skill] = {
				core: buffed.core,
				range_max: buffed.max,
				range_min: buffed.min,
				skill
			}
		}
		else {
			q_power[skill] = {
				... crew.base_skills[skill],
				skill
			}
		}

		let skq = crewQuipment.filter(f => skill in f.bonusInfo.bonuses).map(m => ({ item: m.item, skill: m.bonusInfo.bonuses[skill] }));

		if (skq?.length) {
			skq.sort((a, b) => {
				let ar = skillSum(a.skill, cmode)
				let br = skillSum(b.skill, cmode);
				return br - ar;
			});

			for (let i = 0; i < slots; i++) {
				if (i < skq.length) {
					if (cmode === 'proficiency' && skq[i].skill.range_max === 0 && skq[i].skill.range_min === 0) continue;
					else if (cmode === 'core' && skq[i].skill.core === 0) continue;
					else if (cmode === 'all' && skq[i].skill.core === 0 && skq[i].skill.range_max === 0 && skq[i].skill.range_min === 0) continue;

					q_lots[skill].push(skq[i].item);

					q_power[skill].core += skq[i].skill.core;
					q_power[skill].range_max += skq[i].skill.range_max;
					q_power[skill].range_min += skq[i].skill.range_min;
					q_power[skill].skill = skill;
				}
			}
		}
	};

	skills.forEach((skill) => {
		addQPower(skill, slots);
	});

	const crewSkills = {} as { [key: string]: Skill };
	crew.skill_order.forEach((skill) => {
		let l: Skill;
		if (buffConfig) {
			let sb = applySkillBuff(buffConfig, skill, crew.base_skills[skill]);
			l = {
				core: sb.core,
				range_max: sb.max,
				range_min: sb.min,
				skill
			};
		}
		else {
			l = {
				... crew.base_skills[skill],
				skill
			};
		}
		if (cmode === 'core') {
			l.range_max = 0;
			l.range_min = 0;
		}
		else if (cmode === 'proficiency') {
			l.core = 0;
		}
		crewSkills[skill] = l;
	});

	const addCrewPower = (lot: PowerLot) => {
		crew.skill_order.forEach((skill) => {
			if (!(skill in lot.lot)) return;
			let fskills = lot.power.filter(f => f.skill === skill);
			let cskills = crewSkills[skill];
			lot.crew_power += skillSum([...fskills, cskills], cmode)
			lot.crew_by_skill ??= {};
			lot.crew_by_skill[skill] = {
				...cskills
			}
			for (let sk of fskills) {
				if (cmode !== 'proficiency') {
					lot.crew_by_skill[skill].core += sk.core;
				}
				if (cmode !== 'core') {
					lot.crew_by_skill[skill].range_min += sk.range_min;
					lot.crew_by_skill[skill].range_max += sk.range_max;
				}
			}
		})

	}
	crew.q_lots = {
		lot: q_lots,
		power: Object.values(q_power),
		power_by_skill: q_power,
		crew_power: 0,
		crew_by_skill: {}
	}
	if (crew.name === 'Audrid Quark' || crew.name === 'Admiral Robert April') {
		console.log("break here");
	}
	addCrewPower(crew.q_lots);

	delete crew.q_best_one_two_lots;
	delete crew.q_best_one_three_lots;
	delete crew.q_best_two_three_lots;
	delete crew.q_best_three_lots;

	if (crew.skill_order.length >= 2) {
		if (crew.symbol.includes("gowron_chancellor")) {
			console.log("break");
		}
		crew.q_best_one_two_lots = calcBest(2, crew, max_qbits, max_slots, [0, 1]);
		addCrewPower(crew.q_best_one_two_lots);
	}

	if (crew.skill_order.length === 3) {
		crew.q_best_one_three_lots = calcBest(2, crew, max_qbits, max_slots, [0, 2]);
		crew.q_best_two_three_lots = calcBest(2, crew, max_qbits, max_slots, [1, 2]);
		crew.q_best_three_lots = calcBest(3, crew, max_qbits, max_slots);
		addCrewPower(crew.q_best_one_three_lots);
		addCrewPower(crew.q_best_two_three_lots);
		addCrewPower(crew.q_best_three_lots);
	}

	return crew;
}
