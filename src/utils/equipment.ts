import CONFIG from '../components/CONFIG';
import { ArchetypeRoot20 } from '../model/archetype';
import { BaseSkills, CrewMember, EquipmentSlot, QuippedPower, Skill } from '../model/crew';
import { EquipmentIngredient, EquipmentItem, ICrewDemands, IDemand } from '../model/equipment';
import { BuffBase, PlayerCrew, PlayerEquipmentItem } from '../model/player';
import { applySkillBuff, qbitsToSlots, skillSum } from './crewutils';
import { ItemWithBonus, isQuipmentMatch } from './itemutils';
import { makeAllCombos } from './misc';
import { multiComp, qpComp, skoComp } from './quipment_tools';
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
		if (fromCurrLvl && "level" in crew && es.level < crew.level) {
			return;
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
			count: aitem.recipe?.demands[idx]?.count ?? 0,
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

	if (overallOnly) {
		crew.quipment_score = qps.map(m => Object.values(m.bonusInfo.bonuses)
			.filter(n => crew.skill_order.includes(n.skill))
			.sort((a, b) => skillSum(b) - skillSum(a))
			.map((n: Skill) => skillSum(n)))
			.flat()
			.reduce((p, n) => p + n, 0) * crew.max_rarity;

		return;
	}

	crew.quipment_scores ??= {
		command_skill: 0,
		medicine_skill: 0,
		diplomacy_skill: 0,
		science_skill: 0,
		security_skill: 0,
		engineering_skill: 0,
		trait_limited: 0
	};

	crew.quipment_scores.trait_limited = qps.filter(f => !!f.item.traits_requirement?.length)
			.map(item => Object.values(item.bonusInfo.bonuses)
			.filter(bonus => crew.skill_order.includes(bonus.skill))
			.sort((a, b) => skillSum(b) - skillSum(a))
			.map((skill: Skill) => skillSum(skill)))
			.flat()
			.reduce((p, n) => p + n, 0) * crew.max_rarity;

	let qsum = 0;

	CONFIG.SKILLS_SHORT.forEach(skinfo => {

		if (!crew.skill_order.includes(skinfo.name)) return;

		if (crew.quipment_scores) {
			qsum += crew.quipment_scores[skinfo.name] = qps.map(m => Object.values(m.bonusInfo.bonuses)
				.filter(bonus => bonus.skill === skinfo.name)
				.sort((a, b) => skillSum(b) - skillSum(a))
				.map((skill: Skill) => skillSum(skill)))
				.flat()
				.reduce((p, n) => p + n, 0) * crew.max_rarity;
		}
	});

	crew.quipment_score = Math.floor(qsum);
}

interface QpCount {
	count: number;
	item: EquipmentItem;
	bonuses: Skill[];
};

export function calcQLots<T extends CrewMember>(
	crew: T,
	quipment: ItemWithBonus[],
	buffConfig?: BuffStatTable,
	max_qbits?: boolean,
	max_slots?: number,
	mode?: 'all' | 'core' | 'proficiency'): T {

	mode ??= 'all';
	const crewSkills = {} as BaseSkills;
	const cmode = mode;

	crew.skill_order.forEach((skill) => {
		let newSkill: Skill;
		if (buffConfig) {
			let sb = applySkillBuff(buffConfig, skill, crew.base_skills[skill]);
			newSkill = {
				core: sb.core,
				range_max: sb.max,
				range_min: sb.min,
				skill
			};
		}
		else {
			newSkill = {
				... crew.base_skills[skill],
				skill
			};
		}
		crewSkills[skill] = newSkill;
	});

	const q_bits = max_qbits ? 1300 : crew.q_bits;
	const qbslots = qbitsToSlots(q_bits);
	const slots = max_slots ? (max_slots === 4 ? 4 : Math.min(qbslots, max_slots)) : qbslots;

	const crewQuipment = quipment.filter(q => isQuipmentMatch(crew, q.item))
		.sort((a, b) => {
			let abon = Object.keys(a.bonusInfo.bonuses).filter(f => f in crew.base_skills && Object.keys(crew.base_skills[f]).some(val => crew.base_skills[f][val]));
			let bbon = Object.keys(b.bonusInfo.bonuses).filter(f => f in crew.base_skills && Object.keys(crew.base_skills[f]).some(val => crew.base_skills[f][val]));
			let r = bbon.length - abon.length;
			if (r) return r;
			let ar = skillSum(abon.map(ab => a.bonusInfo.bonuses[ab]), cmode);
			let br = skillSum(bbon.map(bb => b.bonusInfo.bonuses[bb]), cmode);
			r = br - ar;
			if (!r) r = crew.skill_order.indexOf(abon[0]) - crew.skill_order.indexOf(bbon[0]);
			return r;
		});

	const skills = crew.skill_order;
	const q_lots = {} as { [key: string]: EquipmentItem[] };
	const q_power = {} as { [key: string]: Skill };

	const calcBestQuipment = (
		crew: CrewMember,
		as_max_qbits?: boolean,
		max_slots?: number
	) => {
		const q_bits = as_max_qbits ? 1300 : crew.q_bits;
		const qbslots = qbitsToSlots(q_bits);
		const slots = max_slots ? (max_slots === 4 ? 4 : Math.min(qbslots, max_slots)) : qbslots;
		const skills = [] as string[];
		const goodQuip = crewQuipment.slice(0, slots);
		const c = goodQuip.length;
		let x = 0;

		const final_best = {
			skill_quipment: {},
			skills_hash: {},
			aggregate_power: 0,
			aggregate_by_skill: {}
		} as QuippedPower;
		let seen = [] as ItemWithBonus[];
		for (let i = 0; i < c; i++) {
			let qbon = goodQuip[i];
			let keys = Object.keys(qbon.bonusInfo.bonuses).filter(f => f in crew.base_skills && Object.keys(crew.base_skills[f]).some(val => crew.base_skills[f][val]));
			for (let key of keys) {
				if (!crew.skill_order.includes(key)) continue;
				if (!skills.includes(key)) skills.push(key);
				final_best.skill_quipment[key] ??= [];
				if (seen.includes(qbon)) continue;
				final_best.skill_quipment[key].push(qbon.item);
				seen.push(qbon);
			}
		}

		let item_buffs = Object.values(final_best.skill_quipment).map(items => items.map(item => Object.values((goodQuip.find(f => f.item === item) as ItemWithBonus).bonusInfo.bonuses)).flat()).flat()
		for (let sk of crew.skill_order) {
			let skills = item_buffs.filter(ib => ib.skill === sk);
			if (skills.length) {
				for (let skill of skills) {
					if (!final_best.skills_hash[skill.skill!]) {
						final_best.skills_hash[skill.skill!] = { ... crewSkills[skill.skill!] };
					}

					final_best.skills_hash[skill.skill!].core += skill.core;
					final_best.skills_hash[skill.skill!].range_max += skill.range_max;
					final_best.skills_hash[skill.skill!].range_min += skill.range_min;
				}
			}
			else if (!final_best.skills_hash[sk]) {
				final_best.skills_hash[sk] = { ... crewSkills[sk] };
				final_best.skills_hash[sk].reference = true;
			}
		}

		return final_best;
	}

	const calcBestCombo = (
		combo_size: 2 | 3,
		crew: CrewMember,
		as_max_qbits?: boolean,
		max_slots?: number,
		skill_pos?: number[]) => {

		const q_bits = as_max_qbits ? 1300 : crew.q_bits;
		const qbslots = qbitsToSlots(q_bits);
		const slots = max_slots ? (max_slots === 4 ? 4 : Math.min(qbslots, max_slots)) : qbslots;
		const skills = [] as string[];

		let x = 0;
		for (let i = 0; i < 3; i++) {
			if (skill_pos && !skill_pos.includes(i)) continue;
			if (x >= combo_size) break;
			if (i >= crew.skill_order.length) break;
			skills.push(crew.skill_order[i]);
			x++;
		}

		crew.best_quipment ??= {
			skill_quipment: {},
			skills_hash: {},
			aggregate_power: 0,
			aggregate_by_skill: {}
		};

		let best_score = {
			skill_quipment: {},
			skills_hash: {},
			aggregate_power: 0,
			aggregate_by_skill: {}
		} as QuippedPower;

		crewQuipment.forEach((cq) => {
			Object.keys(cq.bonusInfo.bonuses).forEach((skill) => {
				if (skill in crew.base_skills && skills.includes(skill)) {
					best_score.skill_quipment[skill] ??= [];
					best_score.skill_quipment[skill].push(cq.item);
				}
			});
		});

		const final_best = {
			skill_quipment: {},
			skills_hash: {},
			aggregate_power: 0,
			aggregate_by_skill: {}
		} as QuippedPower;

		const qpcounts = [] as QpCount[];

		// For items that impart more than one skill
		skills.forEach((skill) => {
			best_score.skill_quipment[skill]?.forEach((item) => {
				let f = qpcounts.find(f => f.item === item);
				if (!f) {
					let bonuses = Object.values(crewQuipment.find(f => f.item === item)?.bonusInfo.bonuses ?? {});
					let elig_bonus = bonuses.filter(fb => {
						if (fb.skill !== skill) return false;
						if (cmode === 'core' && fb.core === 0) return false;
						if (cmode === 'proficiency' && fb.range_max === 0 && fb.range_min === 0) return false;
						return true;
					});
					if (elig_bonus?.length) {
						qpcounts.push({
							item,
							count: 1,
							bonuses: elig_bonus
						});
					}
				}
				else {
					f.count++;
				}
			});
		});

		const item_ids = [ ... new Set(qpcounts.map(qp => qp.item).flat().map(m => Number(m.kwipment_id!))) ];
		const combos = makeAllCombos(item_ids, undefined, undefined, undefined, slots).filter(c => c.length === slots);

		const combo_map = combos.map(cb => cb.map(co => ({ ... qpcounts.find(f => f.item.kwipment_id === co.toString())! } as QpCount)));

		const balance_diff = [] as {
			value: number,
			power: QpCount[],
			skills: string[]
		}[];

		combo_map.forEach((power) => {
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
				let d1 = Math.abs(value[0] - value[1]);
				let d2 = Math.abs(value[1] - value[2]);
				let d3 = Math.abs(value[0] - value[2]);
				let dd = (d1 + d2 + d3) / 3;
				value = (values.reduce((p, n) => p ? p + n : n, 0) - dd);
			}
			balance_diff.push({
				value,
				power,
				skills: outskills
			});
		});

		if (balance_diff?.length) {
			balance_diff.sort((a, b) => {
				let r = b.skills.length - a.skills.length;
				if (r) return r;
				r = b.value - a.value;
				return r;
			});

			balance_diff[0].power.forEach((qp) => {
				if (!qp?.bonuses?.length || !qp?.bonuses[0]?.skill) {
					console.log("Problem with " + crew.symbol);
					console.log(qp);
					return;
				}

				let skill = qp.bonuses[0].skill;
				final_best.skill_quipment[skill] ??= [];
				final_best.skill_quipment[skill].push(qp.item);
			});

		}

		let item_buffs = Object.values(final_best.skill_quipment).map(items => items.map(item => (qpcounts.find(f => f.item === item) as QpCount).bonuses).flat()).flat()

		for (let skill of item_buffs) {
			if (!final_best.skills_hash[skill.skill!]) {
				final_best.skills_hash[skill.skill!] = { ... crewSkills[skill.skill!] };
			}

			final_best.skills_hash[skill.skill!].core += skill.core;
			final_best.skills_hash[skill.skill!].range_max += skill.range_max;
			final_best.skills_hash[skill.skill!].range_min += skill.range_min;
		}

		return final_best;
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

		let skill_quipment = crewQuipment.filter(f => skill in f.bonusInfo.bonuses).map(m => ({ item: m.item, skill: m.bonusInfo.bonuses[skill] }));

		if (skill_quipment?.length) {
			skill_quipment.sort((a, b) => {
				let ar = skillSum(a.skill, cmode)
				let br = skillSum(b.skill, cmode);
				return br - ar;
			});

			let i = 0;
			while (q_lots[skill].length < slots) {
				if (i < skill_quipment.length) {
					// We want to exclude quipment that impart nothing to the current mode ...
					if (cmode === 'proficiency' && skill_quipment[i].skill.range_max === 0 && skill_quipment[i].skill.range_min === 0) { i++; continue; }
					else if (cmode === 'core' && skill_quipment[i].skill.core === 0)  { i++; continue; }
					else if (cmode === 'all' && skill_quipment[i].skill.core === 0 && skill_quipment[i].skill.range_max === 0 && skill_quipment[i].skill.range_min === 0)  { i++; continue; }

					q_lots[skill].push(skill_quipment[i].item);

					// ... but we still need the total skill values for both core and proficiencies,
					// no matter what mode.
					q_power[skill].core += skill_quipment[i].skill.core;
					q_power[skill].range_max += skill_quipment[i].skill.range_max;
					q_power[skill].range_min += skill_quipment[i].skill.range_min;
					q_power[skill].skill = skill;
					i++;
				}
				else {
					break;
				}
			}
		}
	};

	skills.forEach((skill) => {
		addQPower(skill, slots);
	});


	const addCrewPower = (lot: QuippedPower) => {
		crew.skill_order.forEach((skill) => {
			if (!(skill in lot.skill_quipment)) return;
			let fskills = lot.skills_hash[skill] as Skill;
			let skill_power = skillSum(fskills, cmode);
			lot.aggregate_power += skill_power;
			lot.aggregate_by_skill[skill] = skill_power;
		})
	}

	crew.best_quipment = {
		skill_quipment: q_lots,
		skills_hash: q_power,
		aggregate_power: 0,
		aggregate_by_skill: {}
	}

	addCrewPower(crew.best_quipment);

	delete crew.best_quipment_1_2;
	delete crew.best_quipment_1_3;
	delete crew.best_quipment_2_3;
	delete crew.best_quipment_3;
	delete crew.best_quipment_top;

	if (crew.skill_order.length >= 2) {
		crew.best_quipment_1_2 = calcBestCombo(2, crew, max_qbits, max_slots, [0, 1]);
		addCrewPower(crew.best_quipment_1_2);
	}

	if (crew.skill_order.length === 3) {
		crew.best_quipment_1_3 = calcBestCombo(2, crew, max_qbits, max_slots, [0, 2]);
		crew.best_quipment_2_3 = calcBestCombo(2, crew, max_qbits, max_slots, [1, 2]);
		crew.best_quipment_3 = calcBestCombo(3, crew, max_qbits, max_slots);
		addCrewPower(crew.best_quipment_1_3);
		addCrewPower(crew.best_quipment_2_3);
		addCrewPower(crew.best_quipment_3);
	}

	try {
		crew.best_quipment_top = calcBestQuipment(crew, max_qbits, max_slots);
		addCrewPower(crew.best_quipment_top);
	}
	catch (e) {
		console.log(e);
	}

	return crew;
}

export function sortCrewByQuipment(roster: CrewMember[], pstMode: boolean | 2 | 3, index: number | string) {

	if (pstMode === true && typeof index === 'number') {
		roster.sort((a, b) => skoComp(a, b, index));
	}
	else if (pstMode === 2 && typeof index === 'number') {
		roster.sort((a, b) => multiComp(a, b, index));
	}
	else if (typeof index === 'string') {
		roster.sort((a, b) => qpComp(a, b, index));
	}
}
