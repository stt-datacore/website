import fs from 'fs';
import showdown from 'showdown';
import ExcelJS from 'exceljs';

import { EquipmentItem, EquipmentItemSource, IDemand } from '../src/model/equipment';
import { BaseSkills, ComputedSkill, CrewMember, EquipmentSlot, QuipmentScores, Ranks, Skill, SkillQuipmentScores } from '../src/model/crew';
import { Mission } from '../src/model/missions';
import { BattleStations, Schematics } from '../src/model/ship';

function getPermutations<T, U>(array: T[], size: number, count?: bigint, count_only?: boolean, start_idx?: bigint, check?: (set: T[]) => U[] | false) {
    var current_iter = 0n;
    const mmin = start_idx ?? 0n;
    const mmax = (count ?? 0n) + mmin;
    function p(t: T[], i: number) {
        if (t.length === size) {
            if (current_iter >= mmin && (!mmax || current_iter < mmax)) {
                if (!check) {
                    result.push(t as any);
                }
                else {
                    let response = check(t);
                    if (response) {
                        if (!count_only) {
                            result.push(response);
                        }
                    }
                }
            }
            current_iter++;
            return;
        }
        if (i + 1 > array.length) {
            return;
        }

        if (mmax !== 0n && current_iter >= mmax) return;
        p([ ...t, array[i] ], i + 1);
        p(t, i + 1);
    }

    var result = [] as U[][];

    p([], 0);
    return result;
}


const STATIC_PATH = `${__dirname}/../../static/structured/`;

let crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8'), (key, value) => {
	if (key === 'date_added') {
		return new Date(value);
	}
	return value;
}) as (CrewMember & { _comboIds?: string[][] }) [];

let items = JSON.parse(fs.readFileSync(STATIC_PATH + 'items.json', 'utf-8')) as EquipmentItem[];
let skill_bufs = JSON.parse(fs.readFileSync(STATIC_PATH + 'skill_bufs.json', 'utf-8'));

interface ItemBonusInfo {
    bonusText: string[];
    bonuses: { [key: string]: Skill };
}

interface ItemWithBonus {
	item: EquipmentItem;
	bonusInfo: ItemBonusInfo;
}


const SKILLS = {
	command_skill: 'CMD',
	science_skill: 'SCI',
	security_skill: 'SEC',
	engineering_skill: 'ENG',
	diplomacy_skill: 'DIP',
	medicine_skill: 'MED'
};

const RNGESUS = 1.8; // Used for chron cost calculation

function demandsPerSlot(es: EquipmentSlot, items: EquipmentItem[], dupeChecker: Set<string>, demands: IDemand[]) {
	let equipment = items.find(item => item.symbol === es.symbol);
	if (!equipment) {
		console.error(`Cannot find equipment ${es.symbol}!`);
		return 0;
	}
	if (!equipment.recipe) {
		if (dupeChecker.has(equipment.symbol)) {
			demands.find(d => d.symbol === equipment.symbol)!.count += 1;
		} else {
			dupeChecker.add(equipment.symbol);

			demands.push({
				count: 1,
				symbol: equipment.symbol,
				equipment: equipment,
				factionOnly: equipment.factionOnly
			} as IDemand);
		}

		return 0;
	}

	for (let iter of equipment.recipe.list) {
		let recipeEquipment = items.find(item => item.symbol === iter.symbol);
		if (dupeChecker.has(iter.symbol)) {
			demands.find(d => d.symbol === iter.symbol)!.count += iter.count;
			continue;
		}

		if (recipeEquipment!.item_sources.length === 0) {
			console.error(`Oops: equipment with no recipe and no sources: `, recipeEquipment);
		}

		dupeChecker.add(iter.symbol);

		demands.push({
			count: iter.count,
			symbol: iter.symbol,
			equipment: recipeEquipment,
			factionOnly: iter.factionOnly
		} as IDemand);
	}

	return equipment.recipe.craftCost;
}


function populateSkillOrder(crew: CrewMember) {
	const output = [] as Skill[];
	Object.entries(crew.base_skills).map(([key, value]) => {
		value.skill = key;
		output.push(value);
	});

	Object.values(crew.skill_data).forEach((data) => {
		Object.entries(data.base_skills).forEach(([key, value]) => {
			value.skill = key;
		});
	});

	Object.values(crew.intermediate_skill_data).forEach((data) => {
		Object.entries(data.base_skills).forEach(([key, value]) => {
			value.skill = key;
		});
	});

	output.sort((a, b) => b.core - a.core);

	crew.skill_order = output.map(m => m.skill!);
}

function makeTraitRanks(roster: CrewMember[]) {
	roster = [ ...roster ];

	const traitCount = {} as { [key: string]: number };
	roster.forEach((crew) => {
		crew.traits.forEach((trait) => {
			traitCount[trait] ??= 0;
			traitCount[trait]++;
		});
	});
	roster.forEach((crew) => {
		crew.ranks ??= {} as Ranks;
		let traitsum = crew.traits.map(t => traitCount[t]).reduce((p, n) => p + n, 0);
		crew.ranks.traitRank = (1 / traitsum) / crew.traits.length;
	});

	roster.sort((a, b) => a.ranks.traitRank - b.ranks.traitRank);
	roster.forEach((crew, idx) => crew.ranks.traitRank = idx + 1);
}

// TODO: this function is duplicated with equiment.ts (find a way to share code between site and scripts)
function calculateCrewDemands(crew: CrewMember, items: EquipmentItem[]) {
	let craftCost = 0;
	let demands = [] as IDemand[];
	let dupeChecker = new Set<string>();
	crew.equipment_slots.forEach(es => {
		craftCost += demandsPerSlot(es, items, dupeChecker, demands);
	});

	const reducer = (accumulator, currentValue) => accumulator + currentValue.count;

	const estimateChronitonCost = (equipment: EquipmentItem) => {
		let sources = equipment.item_sources.filter(e => e.type === 0 || e.type === 2);

		// If faction only
		if (sources.length === 0) {
			return 0;
		}

		let costCalc = [] as number[];
		for (let source of sources) {
			if (!source.cost) {
				//console.log("Mission information not available!", source);
				continue;
			}

			if (source.avg_cost) {
				costCalc.push(source.avg_cost);
			} else {
				costCalc.push((6 - source.chance_grade) * RNGESUS * source.cost);
			}
		}

		if (costCalc.length === 0) {
			console.warn('Couldnt calculate cost for equipment', equipment);
			return 0;
		}

		return costCalc.sort()[0];
	};

	return {
		craftCost,
		demands,
		factionOnlyTotal: demands.filter(d => d.factionOnly).reduce(reducer, 0),
		totalChronCost: Math.floor(demands.reduce((a, c) => a + estimateChronitonCost(c.equipment!), 0))
	};
}

function calcRank(scoring: (crew: CrewMember) => number, field: string, alias?: string) {
	crewlist
		.map(crew => ({ crew, score: scoring(crew) }))
		.sort((a, b) => b.score - a.score)
		.forEach((entry, idx) => {
			if (entry.score && entry.score > 0) {
				if (alias) {
					entry.crew.ranks[alias] = {
						name: field,
						rank: idx + 1
					};
				} else {
					entry.crew.ranks[field] = idx + 1;
				}
			}
		});
}

function getCrewMarkDown(crewSymbol: string) {
	if (!fs.existsSync(`${STATIC_PATH}/../crew/${crewSymbol}.md`)) {
		console.log(`Crew ${crewSymbol} not found!`);
		return undefined;
	} else {
		const converter = new showdown.Converter({ metadata: true });
		let markdownContent = fs.readFileSync(`${STATIC_PATH}/../crew/${crewSymbol}.md`, 'utf8');
		converter.makeHtml(markdownContent);
		let meta = converter.getMetadata(undefined);

		markdownContent = markdownContent.slice(markdownContent.indexOf('---', 4) + 4).trim();

		return { meta, markdownContent };
	}
}

function main() {
	let alldemands = [] as IDemand[];
	let perTrait = {};
	for (let crew of crewlist) {
		let demands = calculateCrewDemands(crew, items);
		crew.totalChronCost = demands.totalChronCost;
		crew.factionOnlyTotal = demands.factionOnlyTotal;
		crew.craftCost = demands.craftCost;

		crew.ranks = {} as Ranks;

		for (let demand of demands.demands) {
			let ad = alldemands.find(d => d.symbol === demand.symbol);
			if (ad) {
				ad.count += demand.count;
			} else {
				alldemands.push(demand);
			}
		}

		crew.traits_named.concat(crew.traits_hidden).forEach(trait => {
			if (perTrait[trait]) {
				perTrait[trait]++;
			} else {
				perTrait[trait] = 1;
			}
		});
	}

	alldemands = alldemands.sort((a, b) => b.count - a.count);

	let perFaction = {};
	for (let demand of alldemands) {
		if (demand.factionOnly) {
			demand.equipment!.item_sources.forEach(isrc => {
				let pf = perFaction[isrc.name];
				if (pf) {
					pf.count += demand.count;
					if (demand.equipment!.item_sources.length === 1) {
						pf.exclusive += demand.count;
					}
				} else {
					perFaction[isrc.name] = {
						count: demand.count,
						exclusive: demand.equipment!.item_sources.length === 1 ? demand.count : 0
					};
				}
			});
		}
	}

	alldemands = alldemands.map(demand => ({
		count: demand.count,
		factionOnly: demand.factionOnly,
		symbol: demand.symbol
	} as IDemand));

	perFaction = Object.keys(perFaction)
		.map(key => ({
			name: key.replace(' Transmission', ''),
			count: perFaction[key].count,
			exclusive: perFaction[key].exclusive
		}))
		.sort((a, b) => a.exclusive - b.exclusive);

	perTrait = Object.keys(perTrait)
		.map(key => ({ name: key, count: perTrait[key] }))
		.sort((a, b) => b.count - a.count);

	fs.writeFileSync(STATIC_PATH + 'misc_stats.json', JSON.stringify({ alldemands, perFaction, perTrait }));

	let getSkillWithBonus = (crew_skills: BaseSkills, skillName: string, skillType: string) => {
		return crew_skills[skillName][skillType] * (skill_bufs[skillName.replace('_skill', '')][skillType] + 1.1);
	};

	calcRank(crew => {
		let voyTotal = 0;
		for (let skill in SKILLS) {
			if (crew.base_skills[skill]) {
				let voyScore = getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
				voyTotal += voyScore;
			}
		}

		return Math.ceil(voyTotal);
	}, 'voyRank');

	calcRank(crew => {
		let gauntletTotal = 0;
		for (let skill in SKILLS) {
			if (crew.base_skills[skill]) {
				let gauntletScore = (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
				gauntletTotal += gauntletScore;
			}
		}

		return Math.ceil(gauntletTotal);
	}, 'gauntletRank');

	calcRank(crew => {
		return crew.totalChronCost + crew.factionOnlyTotal * 30;
	}, 'chronCostRank');

	crewlist.forEach((crew) => populateSkillOrder(crew));
	makeTraitRanks(crewlist);

	let skillNames = [] as string[];
	for (let skill in SKILLS) {
		skillNames.push(skill);

		calcRank(crew => {
			if (crew.base_skills[skill]) {
				return Math.ceil(getSkillWithBonus(crew.base_skills, skill, 'core'));
			}

			return 0;
		}, `B_${SKILLS[skill]}`);

		calcRank(crew => {
			if (crew.base_skills[skill]) {
				return Math.ceil(getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2);
			}

			return 0;
		}, `A_${SKILLS[skill]}`);
	}

	for (let i = 0; i < skillNames.length - 1; i++) {
		for (let j = i + 1; j < skillNames.length; j++) {
			calcRank(crew => {
				let vTotal = 0;
				let vTertiary = 0;
				for (let skill in SKILLS) {
					if (crew.base_skills[skill]) {
						let vScore = getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;

						if (skill === skillNames[i] || skill === skillNames[j]) {
							vTotal += vScore;
						} else {
							vTertiary += vScore;
						}
					}
				}

				return Math.ceil(vTotal);
			}, `V_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}`);

			calcRank(crew => {
				let gTotal = 0;
				let gTertiary = 0;
				for (let skill in SKILLS) {
					if (crew.base_skills[skill]) {
						let gScore = (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;

						if (skill === skillNames[i] || skill === skillNames[j]) {
							gTotal += gScore;
						} else {
							gTertiary += gScore;
						}
					}
				}

				return Math.ceil(gTotal);
			}, `G_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}`);

			for (let k = j + 1; k < skillNames.length; k++) {
				calcRank(crew => {
					let vtTotal = 0;
					for (let skill in SKILLS) {
						if (crew.base_skills[skill]) {
							if (crew.base_skills[skillNames[i]] && crew.base_skills[skillNames[j]] && crew.base_skills[skillNames[k]]) {
								let vtScore = getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
								vtTotal += vtScore;
							}
						}
					}
					return Math.ceil(vtTotal);
				}, `${[SKILLS[skillNames[i]], SKILLS[skillNames[j]], SKILLS[skillNames[k]]].sort().join(' / ')}`, 'voyTriplet');
			}
		}
	}

	// Add markdown data
	for (let crew of crewlist) {
		let mdData = getCrewMarkDown(crew.symbol) as any;
		if (!mdData) {
			console.log(`Crew ${crew.name} not found!`);
		} else {
			crew.bigbook_tier = mdData.meta.bigbook_tier ? Number.parseInt(mdData.meta.bigbook_tier) : -1;
			//crew.events = mdData.meta.events ? Number.parseInt(mdData.meta.events) : 0;
			crew.in_portal = !!mdData.meta.in_portal;

			if (mdData.meta.date) {
				// Date is in European format :) "dd/mm/yyyy"
				let m = mdData.meta.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
				if (m) {
					crew.date_added = new Date(m[3], m[2] - 1, m[1]);
				}
			}

			if (!crew.date_added) {
				crew.date_added = new Date();
			}

			if (typeof crew.date_added === 'string') crew.date_added = new Date(crew.date_added);

			if (!crew.obtained) {
				crew.obtained = mdData.meta.obtained ? mdData.meta.obtained : 'N/A';
			}
			crew.markdownContent = mdData.markdownContent;
		}
	}

	// Calculate optimised polestars
	let polestarCombos = {} as { [key:string]: { count: number, crew: string[], polestars: string[] }};
	for (let crew of crewlist) {
		if (!crew.in_portal) continue;
		let polestars = crew.traits.slice();
		polestars.push('crew_max_rarity_'+crew.max_rarity);
		for (let skill in crew.base_skills) {
			if (crew.base_skills[skill]) polestars.push(skill);
		}
		let onePolestarCombos = polestars.slice().map((pol) => [pol]);

		let twoPolestarCombos = getPermutations<string, string>(polestars, 2);
		let threePolestarCombos = getPermutations<string, string>(polestars, 3);
		let fourPolestarCombos = getPermutations<string, string>(polestars, 4);

		let crewPolestarCombos = ([] as string[][]).concat(onePolestarCombos).concat(twoPolestarCombos).concat(threePolestarCombos).concat(fourPolestarCombos);
		let comboIds = [] as string[][];	// Potential list of combos to check later
		for (let combo of crewPolestarCombos) {
			let sorted = combo.sort();
			let combokey = sorted.join()
			if (!polestarCombos[combokey]) {
				polestarCombos[combokey] = {
					count: 0,
					crew: [],
					polestars: sorted,
				}
				// Only add new combos to list; if it already exists in polestarCombos,
				//	its count is > 1 and is of no use to us here
				comboIds.push(sorted);
			}
			polestarCombos[combokey].count = polestarCombos[combokey].count + 1;
			polestarCombos[combokey].crew.push(crew.symbol);
		}
		crew._comboIds = comboIds;	// Attach as temp property
	}

	const isSuperset = (test: any[], existing: any[]) =>
		existing.some(
			(subset) => test.length > subset.length && subset.every(
				(subtrait: any) => test.some(
					(testtrait) => testtrait === subtrait
				)
			)
		);

	for (let crew of crewlist) {
		if (!crew.in_portal) continue;
		let uniqueCombos = [] as any[];
		// Now double check a crew's list of combos to find counts that are still 1
		crew._comboIds?.forEach((pc) => {
			let pcj = pc.join();
			if (polestarCombos[pcj].count === 1) {
				// Ignore supersets of already perfect subsets
				if (!isSuperset(pc, uniqueCombos))
					uniqueCombos.push(polestarCombos[pcj].polestars);
			}
		});
		crew.unique_polestar_combos = uniqueCombos;
		delete crew._comboIds;	// Don't need it anymore
	}

	// Sory by date added
	crewlist = crewlist.sort((a, b) => {
		return a.date_added.getTime() - b.date_added.getTime();
	});

	processCrew(crewlist);
	postProcessQuipmentScores(crewlist, items);
	calculateTopQuipment();

	fs.writeFileSync(STATIC_PATH + 'crew.json', JSON.stringify(crewlist));

	// Calculate some skill set stats for the BigBook
	let counts = {};
	for (let crew of crewlist) {
		if ((crew.max_rarity === 4 || crew.max_rarity === 5) && Object.getOwnPropertyNames(crew.base_skills).length === 3) {
			let combo = Object.getOwnPropertyNames(crew.base_skills)
				.map(s => SKILLS[s])
				.sort()
				.join('.');

			counts[combo] = 1 + (counts[combo] || 0);
		}
	}

	/*let sortedSkillSets = Object.keys(counts)
		.map(k => ({ name: k, value: counts[k] }))
		.sort((a, b) => a.value - b.value);

	fs.writeFileSync(STATIC_PATH + 'sortedSkillSets.json', JSON.stringify(sortedSkillSets));*/

	// Static outputs (TODO: maybe these should be JSON too?)

	let csvOutput = 'crew, tier, rarity, ';

	for (let skill in SKILLS) {
		csvOutput += `${SKILLS[skill]}_core, ${SKILLS[skill]}_min, ${SKILLS[skill]}_max, `;
	}

	for (let i = 0; i < skillNames.length - 1; i++) {
		for (let j = i + 1; j < skillNames.length; j++) {
			csvOutput += `V_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}, `;
		}
	}

	for (let i = 0; i < skillNames.length - 1; i++) {
		for (let j = i + 1; j < skillNames.length; j++) {
			csvOutput += `G_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}, `;
		}
	}

	csvOutput +=
		'voyage_rank, gauntlet_rank, traits, hidden_traits, action_name, action_bonus_type, action_bonus_amount, action_initial_cooldown, action_duration, action_cooldown, bonus_ability, trigger, uses_per_battle, penalty_type, penalty_amount, accuracy, crit_bonus, crit_chance, evasion, charge_phases, short_name, image_name, symbol\r\n';

	for (let crew of crewlist) {
		let crewLine = `"${crew.name.replace(/"/g, '')}",`;

		let mdData = getCrewMarkDown(crew.symbol) as any;
		if (mdData && mdData.meta && mdData.meta.bigbook_tier && mdData.meta.bigbook_tier < 20 && mdData.meta.bigbook_tier > 0) {
			crewLine += `${mdData.meta.bigbook_tier},`;
		} else {
			crewLine += '0,';
		}

		crewLine += `${crew.max_rarity}, `;

		for (let skill in SKILLS) {
			if (crew.base_skills[skill]) {
				crewLine += `${crew.base_skills[skill].core},${crew.base_skills[skill].range_min},${crew.base_skills[skill].range_max},`;
			} else {
				crewLine += '0,0,0,';
			}
		}

		for (let i = 0; i < skillNames.length - 1; i++) {
			for (let j = i + 1; j < skillNames.length; j++) {
				crewLine += crew.ranks[`V_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}`] + ',';
			}
		}

		for (let i = 0; i < skillNames.length - 1; i++) {
			for (let j = i + 1; j < skillNames.length; j++) {
				crewLine += crew.ranks[`G_${SKILLS[skillNames[i]]}_${SKILLS[skillNames[j]]}`] + ',';
			}
		}

		crewLine += crew.ranks.voyRank + ',' + crew.ranks.gauntletRank + ',';
		crewLine += `"${crew.traits_named.join(', ').replace(/"/g, '')}","${crew.traits_hidden.join(', ').replace(/"/g, '')}",`;
		crewLine += `"${crew.action.name}",${crew.action.bonus_type}, ${crew.action.bonus_amount}, ${crew.action.initial_cooldown}, ${crew.action.duration}, ${crew.action.cooldown}, `;
		crewLine += `${crew.action.ability ? crew.action.ability.type : ''}, ${crew.action.ability ? crew.action.ability.condition : ''}, `;
		crewLine += `${crew.action.limit || ''}, ${crew.action.penalty ? crew.action.penalty.type : ''}, ${crew.action.penalty ? crew.action.penalty.amount : ''
			}, `;
		crewLine += `${crew.ship_battle.accuracy || ''}, ${crew.ship_battle.crit_bonus || ''}, ${crew.ship_battle.crit_chance || ''}, ${crew
			.ship_battle.evasion || ''}, ${!!crew.action.charge_phases},`;
		crewLine += `"${crew.short_name}",${crew.imageUrlPortrait},${crew.symbol}`;

		crewLine = crewLine.replace(/undefined/g, '0');

		csvOutput += `${crewLine}\r\n`;
	}

	fs.writeFileSync(STATIC_PATH + 'crew.csv', csvOutput);

	// Calculate equipment matrix

	/*alldemands = alldemands.slice(0, 200);
	let matrixCsv = 'crew,level,equipment_name,craft_cost,' + alldemands.map(d => d.symbol).join(',') + ',f\n';

	for (let crew of crewlist) {
		crew.equipment_slots.forEach(es => {
			let demands = [];
			let dupeChecker = new Set();
			let cost = demandsPerSlot(es, items, dupeChecker, demands);

			let crewLine = `"${crew.name.replace(/"/g, '')}",${es.level},${es.symbol},${cost},`;
			for (let dem of alldemands) {
				let count = 0;
				if (dupeChecker.has(dem.symbol)) {
					count = demands.find(d => d.symbol === dem.symbol).count;
				}
				crewLine += `${count},`;
			}

			matrixCsv += `${crewLine}0\n`;
		});
	}

	fs.writeFileSync(STATIC_PATH + 'equipment_matrix.csv', matrixCsv);*/
}

function updateExcelSheet() {
	let crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8'));

	let workbook = new ExcelJS.Workbook();
	workbook.creator = 'DataCore';
	workbook.lastModifiedBy = 'DataCore';
	workbook.created = new Date(2020, 1, 1);
	workbook.modified = new Date(2020, 1, 1);
	workbook.lastPrinted = new Date(2020, 1, 1);

	var crewsheet = workbook.addWorksheet('Crew', {
		properties: { tabColor: { argb: 'FFC0000' } },
		views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
	});

	crewsheet.autoFilter = 'A2:AW2';

	crewsheet.columns = [
		{ header: ['', 'Name'], key: 'name', width: 32 },
		{ header: ['', 'Rarity'], key: 'max_rarity', width: 6 },
		{ header: ['', 'Short name'], key: 'short_name', width: 16 },
		{ header: ['', 'Series'], key: 'series', width: 20 },
		{ header: ['Command', '#1'], key: 'command_skill1', width: 6 },
		{ header: ['', '#2'], key: 'command_skill2', width: 6 },
		{ header: ['', '#3'], key: 'command_skill3', width: 6 },
		{ header: ['', '#4'], key: 'command_skill4', width: 6 },
		{ header: ['', '#5'], key: 'command_skill5', width: 6 },
		{ header: ['', 'Min'], key: 'command_skillmin', width: 6 },
		{ header: ['', 'Max'], key: 'command_skillmax', width: 6 },
		{ header: ['Diplomacy', '#1'], key: 'diplomacy_skill1', width: 6 },
		{ header: ['', '#2'], key: 'diplomacy_skill2', width: 6 },
		{ header: ['', '#3'], key: 'diplomacy_skill3', width: 6 },
		{ header: ['', '#4'], key: 'diplomacy_skill4', width: 6 },
		{ header: ['', '#5'], key: 'diplomacy_skill5', width: 6 },
		{ header: ['', 'Min'], key: 'diplomacy_skillmin', width: 6 },
		{ header: ['', 'Max'], key: 'diplomacy_skillmax', width: 6 },
		{ header: ['Engineering', '#1'], key: 'engineering_skill1', width: 6 },
		{ header: ['', '#2'], key: 'engineering_skill2', width: 6 },
		{ header: ['', '#3'], key: 'engineering_skill3', width: 6 },
		{ header: ['', '#4'], key: 'engineering_skill4', width: 6 },
		{ header: ['', '#5'], key: 'engineering_skill5', width: 6 },
		{ header: ['', 'Min'], key: 'engineering_skillmin', width: 6 },
		{ header: ['', 'Max'], key: 'engineering_skillmax', width: 6 },
		{ header: ['Security', '#1'], key: 'security_skill1', width: 6 },
		{ header: ['', '#2'], key: 'security_skill2', width: 6 },
		{ header: ['', '#3'], key: 'security_skill3', width: 6 },
		{ header: ['', '#4'], key: 'security_skill4', width: 6 },
		{ header: ['', '#5'], key: 'security_skill5', width: 6 },
		{ header: ['', 'Min'], key: 'security_skillmin', width: 6 },
		{ header: ['', 'Max'], key: 'security_skillmax', width: 6 },
		{ header: ['Science', '#1'], key: 'science_skill1', width: 6 },
		{ header: ['', '#2'], key: 'science_skill2', width: 6 },
		{ header: ['', '#3'], key: 'science_skill3', width: 6 },
		{ header: ['', '#4'], key: 'science_skill4', width: 6 },
		{ header: ['', '#5'], key: 'science_skill5', width: 6 },
		{ header: ['', 'Min'], key: 'science_skillmin', width: 6 },
		{ header: ['', 'Max'], key: 'science_skillmax', width: 6 },
		{ header: ['Medicine', '#1'], key: 'medicine_skill1', width: 6 },
		{ header: ['', '#2'], key: 'medicine_skill2', width: 6 },
		{ header: ['', '#3'], key: 'medicine_skill3', width: 6 },
		{ header: ['', '#4'], key: 'medicine_skill4', width: 6 },
		{ header: ['', '#5'], key: 'medicine_skill5', width: 6 },
		{ header: ['', 'Min'], key: 'medicine_skillmin', width: 6 },
		{ header: ['', 'Max'], key: 'medicine_skillmax', width: 6 },
		{ header: ['', 'Traits'], key: 'traits', width: 40 },
		{ header: ['', '(Part) Alien'], key: 'is_alien', width: 8 },
		{ header: ['', 'Female'], key: 'is_female', width: 8 }
	];

	crewsheet.mergeCells('E1:K1');
	crewsheet.mergeCells('L1:R1');
	crewsheet.mergeCells('S1:Y1');
	crewsheet.mergeCells('Z1:AF1');
	crewsheet.mergeCells('AG1:AM1');
	crewsheet.mergeCells('AN1:AT1');

	crewsheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
	crewsheet.getRow(1).font = { bold: true };
	crewsheet.getRow(2).font = { bold: true };

	crewsheet.getColumn(1).font = { bold: true };
	crewsheet.getColumn(2).alignment = { vertical: 'middle', horizontal: 'center' };
	crewsheet.getColumn(3).alignment = { vertical: 'middle', horizontal: 'center' };
	crewsheet.getColumn(4).alignment = { vertical: 'middle', horizontal: 'center' };

	crewsheet.getColumn(4).border = { right: { style: 'thick' } };
	crewsheet.getColumn(11).border = { right: { style: 'thick' } };
	crewsheet.getColumn(18).border = { right: { style: 'thick' } };
	crewsheet.getColumn(25).border = { right: { style: 'thick' } };
	crewsheet.getColumn(32).border = { right: { style: 'thick' } };
	crewsheet.getColumn(39).border = { right: { style: 'thick' } };
	crewsheet.getColumn(46).border = { right: { style: 'thick' } };
	crewsheet.getColumn(49).border = { right: { style: 'thick' } };

	crewsheet.getCell('E1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE599' } };
	crewsheet.getCell('L1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF93C47D' } };
	crewsheet.getCell('S1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C4587' } };
	crewsheet.getCell('Z1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA9999' } };
	crewsheet.getCell('AG1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9DAF8' } };
	crewsheet.getCell('AN1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF38761D' } };

	crewsheet.getCell('S1').font = { color: { argb: 'FFFFFFFF' } };
	crewsheet.getCell('AN1').font = { color: { argb: 'FFFFFFFF' } };

	function getSeriesName(short) {
		if (short === 'tos') {
			return 'The Original Series';
		}

		if (short === 'tas') {
			return 'The Animated Series';
		}

		if (short === 'tng') {
			return 'The Next Generation';
		}

		if (short === 'ent') {
			return 'Enterprise';
		}

		if (short === 'voy') {
			return 'Voyager';
		}

		if (short === 'ds9') {
			return 'Deep Space Nine';
		}

		if (short === 'dsc') {
			return 'Discovery';
		}

		if (short === 'pic') {
			return 'Picard';
		}

		if (short === 'low') {
			return 'Lower Decks';
		}

		if (short === 'snw') {
			return 'Strange New Worlds';
		}

		if (short === 'vst') {
			return 'Very Short Treks';
		}

		if (short === 'original') {
			return 'Star Trek Timelines Originals';
		}

		if (!short) {
			return 'Movies';
		}

		return short;
	}

	function getSkillColumns(crew: CrewMember, skillName: string) {
		let ret = {};

		for (let i = 1; i <= 5; i++) {
			ret[`${skillName}${i}`] = '';
		}

		ret[`${skillName}min`] = '';
		ret[`${skillName}max`] = '';

		if (!crew.base_skills[skillName] || !crew.base_skills[skillName].core) {
			return ret;
		}

		ret[`${skillName}${crew.max_rarity}`] = crew.base_skills[skillName].core;
		ret[`${skillName}min`] = crew.base_skills[skillName].range_min;
		ret[`${skillName}max`] = crew.base_skills[skillName].range_max;

		crew.skill_data.forEach(sd => {
			ret[`${skillName}${sd.rarity}`] = sd.base_skills[skillName].core;
		});

		return ret;
	}

	crewlist = crewlist.sort((a, b) => a.name.localeCompare(b.name));

	for (let crew of crewlist) {
		let row = {
			name: crew.name,
			max_rarity: crew.max_rarity,
			short_name: crew.short_name,
			series: getSeriesName(crew.series),
			traits: crew.traits_named.join(','),
			is_alien: crew.traits_hidden.includes('nonhuman'),
			is_female: crew.traits_hidden.includes('female')
		};

		Object.assign(row, getSkillColumns(crew, 'command_skill'));
		Object.assign(row, getSkillColumns(crew, 'diplomacy_skill'));
		Object.assign(row, getSkillColumns(crew, 'engineering_skill'));
		Object.assign(row, getSkillColumns(crew, 'security_skill'));
		Object.assign(row, getSkillColumns(crew, 'science_skill'));
		Object.assign(row, getSkillColumns(crew, 'medicine_skill'));

		crewsheet.addRow(row);
	}

	workbook.xlsx.writeFile(STATIC_PATH + 'crew.xlsx');
}

function generateMissions() {
	// TODO: 'disputes.json', 'missionsfull.json'
	//generate per-episode page after processing

	let disputes = JSON.parse(fs.readFileSync(STATIC_PATH + 'disputes.json', 'utf-8'));
	let missionsfull = JSON.parse(fs.readFileSync(STATIC_PATH + 'missionsfull.json', 'utf-8')) as Mission[];
	let cadet = JSON.parse(fs.readFileSync(STATIC_PATH + 'cadet.txt', 'utf-8')) as Mission[];

	let episodes = [] as Mission[];
	for (let mission of missionsfull) {
		if (mission.episode !== undefined) {
			episodes.push(mission);
		}
	}

	for (let dispute of disputes) {
		if (dispute.exclude_from_timeline) {
			continue;
		}

		dispute.quests = [];
		for (let mission_id of dispute.mission_ids) {
			let mission = missionsfull.find(m => m.id === mission_id);
			if (!mission) {
				console.error(mission_id);
			} else {
				dispute.quests = dispute.quests.concat(mission.quests);
			}
		}
		delete dispute.mission_ids;
		episodes.push(dispute);
	}

	episodes = episodes.sort((a, b) => a.episode - b.episode);

	fs.writeFileSync(STATIC_PATH + 'episodes.json', JSON.stringify(episodes));

	postProcessCadetItems(items, cadet);
	fs.writeFileSync(STATIC_PATH + 'items.json', JSON.stringify(items));
}

function isQuipmentMatch<T extends CrewMember>(crew: T, item: EquipmentItem): boolean {
	if (item.kwipment) {
		if (!item.max_rarity_requirement) return false;
		const bonus = getItemBonuses(item);

		let mrq = item.max_rarity_requirement;
		let rr = mrq >= crew.max_rarity;

		if (!!item.traits_requirement?.length) {
			if (item.traits_requirement_operator === "and") {
				rr &&= item.traits_requirement?.every(t => crew.traits.includes(t) || crew.traits_hidden.includes(t));
			}
			else {
				rr &&= item.traits_requirement?.some(t => crew.traits.includes(t) || crew.traits_hidden.includes(t));
			}
		}

		rr &&= Object.keys(bonus.bonuses).some(skill => skill in crew.base_skills);
		return rr;
	}

	return false;
}

function calcQuipmentScore<T extends CrewMember>(crew: T, quipment: ItemWithBonus[], overallOnly?: boolean) {
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

	Object.keys(SKILLS).forEach(sk => {
		if (crew.quipment_scores) {
			crew.quipment_scores[sk] = qps.map(m => Object.values(m.bonusInfo.bonuses).filter(f => f.skill === sk).map((n: Skill) => n.core + n.range_min + n.range_max)).flat().reduce((p, n) => p + n, 0) * crew.max_rarity;
		}
	});
}


function calculateTopQuipment() {

	const scores = [] as QuipmentScores[];
	for (let i = 0; i < 5; i++) {
		scores.push({
			quipment_score: 0,
			quipment_scores: {
				command_skill: 0,
				diplomacy_skill: 0,
				medicine_skill: 0,
				science_skill: 0,
				engineering_skill: 0,
				security_skill: 0,
				trait_limited: 0
			} as SkillQuipmentScores
		} as QuipmentScores);
	}

	const qkeys = Object.keys(scores[0].quipment_scores as SkillQuipmentScores);

	for (let c of crewlist) {
		const r = c.max_rarity - 1;
		const skscore = scores[r].quipment_scores as SkillQuipmentScores;

		if (!c.quipment_score || !c.quipment_scores) continue;
		if (c.quipment_score > (scores[r].quipment_score ?? 0)) {
			scores[r].quipment_score = c.quipment_score;
		}
		for (let key of qkeys) {
			if (c.quipment_scores[key] > skscore[key]) {
				skscore[key] = c.quipment_scores[key];
			}
		}
	}

	for (let c of crewlist) {
		const r = c.max_rarity - 1;
		const skscore = scores[r].quipment_scores as SkillQuipmentScores;
		const escore = scores[r].quipment_score as number;
		if (c.quipment_score && escore) {
			c.quipment_grade = c.quipment_score / escore;
		}
		if (c.quipment_scores) {
			Object.keys(c.quipment_scores).forEach((key) => {
				if (key in skscore) {
					c.quipment_grades ??= {
						command_skill: 0,
						diplomacy_skill: 0,
						medicine_skill: 0,
						science_skill: 0,
						engineering_skill: 0,
						security_skill: 0,
						trait_limited: 0
					}
					c.quipment_grades[key] = (c.quipment_scores as SkillQuipmentScores)[key] / skscore[key];
				}
			})
		}
	}

	fs.writeFileSync(STATIC_PATH + "top_quipment_scores.json", JSON.stringify(scores));
	return scores;
}

export function getSkillOrder<T extends CrewMember>(crew: T) {
	const sk = [] as ComputedSkill[];

	for (let skill of Object.keys(SKILLS)) {
		if (skill in crew.base_skills && !!crew.base_skills[skill].core) {
			sk.push({ ...crew.base_skills[skill], skill: skill });
		}
	}

	sk.sort((a, b) => b.core - a.core);
	const output = [] as string[];

	if (sk.length > 0 && sk[0].skill) {
		output.push(sk[0].skill);
	}
	if (sk.length > 1 && sk[1].skill) {
		output.push(sk[1].skill);
	}
	if (sk.length > 2 && sk[2].skill) {
		output.push(sk[2].skill);
	}

	return output;
}


const STATS_CONFIG: { [index: number]: { symbol: string, skill: string, stat: string } } = {
	2: { symbol: 'engineering_skill_core', skill: 'engineering_skill', stat: 'core' },
	3: { symbol: 'engineering_skill_range_min', skill: 'engineering_skill', stat: 'range_min' },
	4: { symbol: 'engineering_skill_range_max', skill: 'engineering_skill', stat: 'range_max' },
	6: { symbol: 'command_skill_core', skill: 'command_skill', stat: 'core' },
	7: { symbol: 'command_skill_range_min', skill: 'command_skill', stat: 'range_min' },
	8: { symbol: 'command_skill_range_max', skill: 'command_skill', stat: 'range_max' },
	14: { symbol: 'science_skill_core', skill: 'science_skill', stat: 'core' },
	15: { symbol: 'science_skill_range_min', skill: 'science_skill', stat: 'range_min' },
	16: { symbol: 'science_skill_range_max', skill: 'science_skill', stat: 'range_max' },
	18: { symbol: 'diplomacy_skill_core', skill: 'diplomacy_skill', stat: 'core' },
	19: { symbol: 'diplomacy_skill_range_min', skill: 'diplomacy_skill', stat: 'range_min' },
	20: { symbol: 'diplomacy_skill_range_max', skill: 'diplomacy_skill', stat: 'range_max' },
	22: { symbol: 'security_skill_core', skill: 'security_skill', stat: 'core' },
	23: { symbol: 'security_skill_range_min', skill: 'security_skill', stat: 'range_min' },
	24: { symbol: 'security_skill_range_max', skill: 'security_skill', stat: 'range_max' },
	26: { symbol: 'medicine_skill_core', skill: 'medicine_skill', stat: 'core' },
	27: { symbol: 'medicine_skill_range_min', skill: 'medicine_skill', stat: 'range_min' },
	28: { symbol: 'medicine_skill_range_max', skill: 'medicine_skill', stat: 'range_max' }
};


export function getItemBonuses(item: EquipmentItem): ItemBonusInfo {
    let bonusText = [] as string[];
    let bonuses = {} as { [key: string]: Skill };

    if (item.bonuses) {
        for (let [key, value] of Object.entries(item.bonuses)) {
            let bonus = STATS_CONFIG[Number.parseInt(key)];
            if (bonus) {
                bonusText.push(`+${value} ${bonus.symbol}`);
                bonuses[bonus.skill] ??= { core: 0, range_min: 0, range_max: 0 } as Skill;
                bonuses[bonus.skill][bonus.stat] = value;
                bonuses[bonus.skill].skill = bonus.skill;
            } else {
                // TODO: what kind of bonus is this?
            }
        }
    }

    return {
        bonusText,
        bonuses
    };
}

function getItemWithBonus(item: EquipmentItem) {
	return {
		item,
		bonusInfo: getItemBonuses(item)
	} as ItemWithBonus;
}

function processCrew(result: CrewMember[]): CrewMember[] {
	result.forEach((item) => {
		item.skill_order = getSkillOrder(item);
		item.action.cycle_time = item.action.cooldown + item.action.duration;
		if (typeof item.date_added === 'string') {
			item.date_added = new Date(item.date_added);
		}
	});

	return result;
}

function postProcessQuipmentScores(crew: CrewMember[], items: EquipmentItem[]) {
	const quipment = items.filter(f => f.type === 14).map(item => getItemWithBonus(item));
	crew.forEach(crew => {
		calcQuipmentScore(crew, quipment);
	});
}

function postProcessCadetItems(items: EquipmentItem[], cadet: Mission[]): void {
	const cadetforitem = cadet.filter(f => f.cadet);

	if (cadetforitem?.length) {
		for(const item of items) {
			for (let ep of cadetforitem) {
				let quests = ep.quests.filter(q => q.quest_type === 'ConflictQuest' && q.mastery_levels?.some(ml => ml.rewards?.some(r => r.potential_rewards?.some(px => px.symbol === item.symbol))));
				if (quests?.length) {
					for (let quest of quests) {
						if (quest.mastery_levels?.length) {
							let x = 0;
							for (let ml of quest.mastery_levels) {
								if (ml.rewards?.some(r => r.potential_rewards?.some(pr => pr.symbol === item.symbol))) {
									let mx = ml.rewards.map(r => r.potential_rewards?.length).reduce((prev, curr) => Math.max(prev ?? 0, curr ?? 0)) ?? 0;
									mx = (1/mx) * 1.80;
									let qitem = {
										type: 4,
										mastery: x,
										name: quest.name,
										energy_quotient: 1,
										chance_grade: 5 * mx,
										mission_symbol: quest.symbol,
										cost: 1,
										avg_cost: 1/mx,
										cadet_mission: ep.episode_title,
										cadet_symbol: ep.symbol
									} as EquipmentItemSource;
									if (!item.item_sources.find(f => f.mission_symbol === quest.symbol)) {
										item.item_sources.push(qitem);
									}
								}
								x++;
							}
						}
					}
				}
			}
		}
	}
}

function processShips(): void {
	let ship_schematics = JSON.parse(fs.readFileSync(STATIC_PATH + 'ship_schematics.json', 'utf-8')) as Schematics[];
	let battle_stations = JSON.parse(fs.readFileSync(STATIC_PATH + 'battle_stations.json', 'utf-8')) as BattleStations[];
	let data = { ship_schematics, battle_stations };
	if (data.battle_stations.length && data.ship_schematics.length) {
		for (let sch of data.ship_schematics) {
			let battle = data.battle_stations.find(b => b.symbol === sch.ship.symbol);
			if (battle) {
				sch.ship.battle_stations = battle.battle_stations;
			}
		}

		fs.writeFileSync(STATIC_PATH + "ship_schematics.json", JSON.stringify(data.ship_schematics));
	}
}

main();
updateExcelSheet();
generateMissions();
