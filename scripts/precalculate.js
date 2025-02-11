const fs = require('fs');
const showdown = require('showdown');
const ExcelJS = require('exceljs');
require('lodash.combinations');
const _ = require('lodash');

const STATIC_PATH = `${__dirname}/../static/structured/`;

let crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json'), ((key, value) => {
	if (key === 'date_added') {
		return new Date(value);
	}
	return value;
}));
let items = JSON.parse(fs.readFileSync(STATIC_PATH + 'items.json'));
let skill_bufs = JSON.parse(fs.readFileSync(STATIC_PATH + 'skill_bufs.json'));

const SKILLS = {
	command_skill: 'CMD',
	science_skill: 'SCI',
	security_skill: 'SEC',
	engineering_skill: 'ENG',
	diplomacy_skill: 'DIP',
	medicine_skill: 'MED'
};

const RNGESUS = 1.8; // Used for chron cost calculation

function demandsPerSlot(es, items, dupeChecker, demands) {
	let equipment = items.find(item => item.symbol === es.symbol);
	if (!equipment) {
		console.error(`Cannot find equipment ${es.symbol}!`);
		return 0;
	}
	if (!equipment.recipe) {
		if (dupeChecker.has(equipment.symbol)) {
			demands.find(d => d.symbol === equipment.symbol).count += 1;
		} else {
			dupeChecker.add(equipment.symbol);

			demands.push({
				count: 1,
				symbol: equipment.symbol,
				equipment: equipment,
				factionOnly: equipment.factionOnly
			});
		}

		return 0;
	}

	for (let iter of equipment.recipe.list) {
		let recipeEquipment = items.find(item => item.symbol === iter.symbol);
		if (dupeChecker.has(iter.symbol)) {
			demands.find(d => d.symbol === iter.symbol).count += iter.count;
			continue;
		}

		if (recipeEquipment.item_sources.length === 0) {
			console.error(`Oops: equipment with no recipe and no sources: `, recipeEquipment);
		}

		dupeChecker.add(iter.symbol);

		demands.push({
			count: iter.count,
			symbol: iter.symbol,
			equipment: recipeEquipment,
			factionOnly: iter.factionOnly
		});
	}

	return equipment.recipe.craftCost;
}

function populateSkillOrder(crew) {
	const output = [];
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
	crew.skill_order = output.map(m => m.skill);
}

function makeTraitRanks(roster) {
	roster = [ ...roster ];

	const traitCount = {};
	roster.forEach((crew) => {
		crew.traits.forEach((trait) => {
			traitCount[trait] ??= 0;
			traitCount[trait]++;
		});
	});
	roster.forEach((crew) => {
		crew.ranks ??= {};
		let traitsum = crew.traits.map(t => traitCount[t]).reduce((p, n) => p + n, 0);
		crew.ranks.traitRank = (1 / traitsum) / crew.traits.length;
	});

	roster.sort((a, b) => a.ranks.traitRank - b.ranks.traitRank);
	roster.forEach((crew, idx) => crew.ranks.traitRank = idx + 1);
}

// TODO: this function is duplicated with equiment.ts (find a way to share code between site and scripts)
function calculateCrewDemands(crew, items) {
	let craftCost = 0;
	let demands = [];
	let dupeChecker = new Set();
	crew.equipment_slots.forEach(es => {
		craftCost += demandsPerSlot(es, items, dupeChecker, demands);
	});

	const reducer = (accumulator, currentValue) => accumulator + currentValue.count;

	const estimateChronitonCost = equipment => {
		let sources = equipment.item_sources.filter(e => e.type === 0 || e.type === 2);

		// If faction only
		if (sources.length === 0) {
			return 0;
		}

		let costCalc = [];
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
		totalChronCost: Math.floor(demands.reduce((a, c) => a + estimateChronitonCost(c.equipment), 0))
	};
}

function calcRank(scoring, field, alias = false) {
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

function getCrewMarkDown(crewSymbol) {
	if (!fs.existsSync(`${STATIC_PATH}/../crew/${crewSymbol}.md`)) {
		console.log(`Crew ${crew.name} not found!`);
		return undefined;
	} else {
		const converter = new showdown.Converter({ metadata: true });
		let markdownContent = fs.readFileSync(`${STATIC_PATH}/../crew/${crewSymbol}.md`, 'utf8');
		converter.makeHtml(markdownContent);
		let meta = converter.getMetadata();

		markdownContent = markdownContent.slice(markdownContent.indexOf('---', 4) + 4).trim();

		return { meta, markdownContent };
	}
}

function main() {
	let alldemands = [];
	let perTrait = {};
	for (let crew of crewlist) {
		let demands = calculateCrewDemands(crew, items);
		crew.totalChronCost = demands.totalChronCost;
		crew.factionOnlyTotal = demands.factionOnlyTotal;
		crew.craftCost = demands.craftCost;

		crew.ranks = {};

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
			demand.equipment.item_sources.forEach(isrc => {
				let pf = perFaction[isrc.name];
				if (pf) {
					pf.count += demand.count;
					if (demand.equipment.item_sources.length === 1) {
						pf.exclusive += demand.count;
					}
				} else {
					perFaction[isrc.name] = {
						count: demand.count,
						exclusive: demand.equipment.item_sources.length === 1 ? demand.count : 0
					};
				}
			});
		}
	}

	alldemands = alldemands.map(demand => ({
		count: demand.count,
		factionOnly: demand.factionOnly,
		symbol: demand.symbol
	}));

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

	let getSkillWithBonus = (crew_skills, skillName, skillType) => {
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

	let skillNames = [];
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
		let mdData = getCrewMarkDown(crew.symbol);
		if (!mdData) {
			console.log(`Crew ${crew.name} not found!`);
		} else {
			crew.bigbook_tier = -1; // mdData.meta.bigbook_tier ? Number.parseInt(mdData.meta.bigbook_tier) : undefined;
			crew.events = mdData.meta.events ? Number.parseInt(mdData.meta.events) : 0;

			// if (crew.is_craftable) {
			// 	crew.in_portal = true;
			// }
			// else {
			// 	crew.in_portal = !!mdData.meta.in_portal;
			// }

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
	let polestarCombos = {};
	for (let crew of crewlist) {
		if (!crew.in_portal) continue;
		let polestars = crew.traits.slice();
		polestars.push('crew_max_rarity_'+crew.max_rarity);
		for (let skill in crew.base_skills) {
			if (crew.base_skills[skill]) polestars.push(skill);
		}
		let onePolestarCombos = polestars.slice().map((pol) => [pol]);
		let twoPolestarCombos = _.combinations(polestars, 2);
		let threePolestarCombos = _.combinations(polestars, 3);
		let fourPolestarCombos = _.combinations(polestars, 4);
		let crewPolestarCombos = [].concat(onePolestarCombos).concat(twoPolestarCombos).concat(threePolestarCombos).concat(fourPolestarCombos);
		let comboIds = [];	// Potential list of combos to check later
		for (let combo of crewPolestarCombos) {
			let sorted = combo.sort();
			if (!polestarCombos[sorted]) {
				polestarCombos[sorted] = {
					count: 0,
					crew: [],
					polestars: sorted,
				}
				// Only add new combos to list; if it already exists in polestarCombos,
				//	its count is > 1 and is of no use to us here
				comboIds.push(sorted);
			}
			polestarCombos[sorted].count = polestarCombos[sorted].count + 1;
			polestarCombos[sorted].crew.push(crew.symbol);
		}
		crew._comboIds = comboIds;	// Attach as temp property
	}

	const isSuperset = (test, existing) =>
		existing.some(
			(subset) => test.length > subset.length && subset.every(
				(subtrait) => test.some(
					(testtrait) => testtrait === subtrait
				)
			)
		);

	for (let crew of crewlist) {
		if (!crew.in_portal) continue;
		let uniqueCombos = [];
		// Now double check a crew's list of combos to find counts that are still 1
		crew._comboIds.forEach((pc) => {
			if (polestarCombos[pc].count === 1) {
				// Ignore supersets of already perfect subsets
				if (!isSuperset(pc, uniqueCombos))
					uniqueCombos.push(polestarCombos[pc].polestars);
			}
		});
		crew.unique_polestar_combos = uniqueCombos;
		delete crew._comboIds;	// Don't need it anymore
	}

	// Sory by date added
	crewlist = crewlist.sort((a, b) => a.date_added.getTime() - b.date_added.getTime());

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

		let mdData = getCrewMarkDown(crew.symbol);
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
	let crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json'));

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

	function getSkillColumns(crew, skillName) {
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

	let disputes = JSON.parse(fs.readFileSync(STATIC_PATH + 'disputes.json'));
	let missionsfull = JSON.parse(fs.readFileSync(STATIC_PATH + 'missionsfull.json'));

	let episodes = [];
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
}

main();
updateExcelSheet();
generateMissions();
