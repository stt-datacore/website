"use strict";
// const fs = require('fs');
// const showdown = require('showdown');
// const ExcelJS = require('exceljs');
// require('lodash.combinations');
// const _ = require('lodash');
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getItemBonuses = exports.getSkillOrder = void 0;
var _ = require("lodash");
require("lodash.combinations");
var fs = require("fs");
var showdown = require("showdown");
var ExcelJS = require("exceljs");
var STATIC_PATH = "".concat(__dirname, "/../static/structured/");
var crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8'));
var items = JSON.parse(fs.readFileSync(STATIC_PATH + 'items.json', 'utf-8'));
var skill_bufs = JSON.parse(fs.readFileSync(STATIC_PATH + 'skill_bufs.json', 'utf-8'));
var SKILLS = {
    command_skill: 'CMD',
    science_skill: 'SCI',
    security_skill: 'SEC',
    engineering_skill: 'ENG',
    diplomacy_skill: 'DIP',
    medicine_skill: 'MED'
};
var RNGESUS = 1.8; // Used for chron cost calculation
function demandsPerSlot(es, items, dupeChecker, demands) {
    var equipment = items.find(function (item) { return item.symbol === es.symbol; });
    if (!equipment) {
        console.error("Cannot find equipment ".concat(es.symbol, "!"));
        return 0;
    }
    if (!equipment.recipe) {
        if (dupeChecker.has(equipment.symbol)) {
            demands.find(function (d) { return d.symbol === equipment.symbol; }).count += 1;
        }
        else {
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
    var _loop_1 = function (iter) {
        var recipeEquipment = items.find(function (item) { return item.symbol === iter.symbol; });
        if (dupeChecker.has(iter.symbol)) {
            demands.find(function (d) { return d.symbol === iter.symbol; }).count += iter.count;
            return "continue";
        }
        if (recipeEquipment.item_sources.length === 0) {
            console.error("Oops: equipment with no recipe and no sources: ", recipeEquipment);
        }
        dupeChecker.add(iter.symbol);
        demands.push({
            count: iter.count,
            symbol: iter.symbol,
            equipment: recipeEquipment,
            factionOnly: iter.factionOnly
        });
    };
    for (var _i = 0, _a = equipment.recipe.list; _i < _a.length; _i++) {
        var iter = _a[_i];
        _loop_1(iter);
    }
    return equipment.recipe.craftCost;
}
// TODO: this function is duplicated with equiment.ts (find a way to share code between site and scripts)
function calculateCrewDemands(crew, items) {
    var craftCost = 0;
    var demands = [];
    var dupeChecker = new Set();
    crew.equipment_slots.forEach(function (es) {
        craftCost += demandsPerSlot(es, items, dupeChecker, demands);
    });
    var reducer = function (accumulator, currentValue) { return accumulator + currentValue.count; };
    var estimateChronitonCost = function (equipment) {
        var sources = equipment.item_sources.filter(function (e) { return e.type === 0 || e.type === 2; });
        // If faction only
        if (sources.length === 0) {
            return 0;
        }
        var costCalc = [];
        for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
            var source = sources_1[_i];
            if (!source.cost) {
                //console.log("Mission information not available!", source);
                continue;
            }
            if (source.avg_cost) {
                costCalc.push(source.avg_cost);
            }
            else {
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
        craftCost: craftCost,
        demands: demands,
        factionOnlyTotal: demands.filter(function (d) { return d.factionOnly; }).reduce(reducer, 0),
        totalChronCost: Math.floor(demands.reduce(function (a, c) { return a + estimateChronitonCost(c.equipment); }, 0))
    };
}
function calcRank(scoring, field, alias) {
    crewlist
        .map(function (crew) { return ({ crew: crew, score: scoring(crew) }); })
        .sort(function (a, b) { return b.score - a.score; })
        .forEach(function (entry, idx) {
        if (entry.score && entry.score > 0) {
            if (alias) {
                entry.crew.ranks[alias] = {
                    name: field,
                    rank: idx + 1
                };
            }
            else {
                entry.crew.ranks[field] = idx + 1;
            }
        }
    });
}
function getCrewMarkDown(crewSymbol) {
    if (!fs.existsSync("".concat(STATIC_PATH, "/../crew/").concat(crewSymbol, ".md"))) {
        console.log("Crew ".concat(crewSymbol, " not found!"));
        return undefined;
    }
    else {
        var converter = new showdown.Converter({ metadata: true });
        var markdownContent = fs.readFileSync("".concat(STATIC_PATH, "/../crew/").concat(crewSymbol, ".md"), 'utf8');
        converter.makeHtml(markdownContent);
        var meta = converter.getMetadata();
        markdownContent = markdownContent.slice(markdownContent.indexOf('---', 4) + 4).trim();
        return { meta: meta, markdownContent: markdownContent };
    }
}
function main() {
    var _a;
    var alldemands = [];
    var perTrait = {};
    for (var _i = 0, crewlist_1 = crewlist; _i < crewlist_1.length; _i++) {
        var crew = crewlist_1[_i];
        var demands = calculateCrewDemands(crew, items);
        crew.totalChronCost = demands.totalChronCost;
        crew.factionOnlyTotal = demands.factionOnlyTotal;
        crew.craftCost = demands.craftCost;
        crew.ranks = {};
        var _loop_2 = function (demand) {
            var ad = alldemands.find(function (d) { return d.symbol === demand.symbol; });
            if (ad) {
                ad.count += demand.count;
            }
            else {
                alldemands.push(demand);
            }
        };
        for (var _b = 0, _c = demands.demands; _b < _c.length; _b++) {
            var demand = _c[_b];
            _loop_2(demand);
        }
        crew.traits_named.concat(crew.traits_hidden).forEach(function (trait) {
            if (perTrait[trait]) {
                perTrait[trait]++;
            }
            else {
                perTrait[trait] = 1;
            }
        });
    }
    alldemands = alldemands.sort(function (a, b) { return b.count - a.count; });
    var perFaction = {};
    var _loop_3 = function (demand) {
        if (demand.factionOnly) {
            demand.equipment.item_sources.forEach(function (isrc) {
                var pf = perFaction[isrc.name];
                if (pf) {
                    pf.count += demand.count;
                    if (demand.equipment.item_sources.length === 1) {
                        pf.exclusive += demand.count;
                    }
                }
                else {
                    perFaction[isrc.name] = {
                        count: demand.count,
                        exclusive: demand.equipment.item_sources.length === 1 ? demand.count : 0
                    };
                }
            });
        }
    };
    for (var _d = 0, alldemands_1 = alldemands; _d < alldemands_1.length; _d++) {
        var demand = alldemands_1[_d];
        _loop_3(demand);
    }
    alldemands = alldemands.map(function (demand) { return ({
        count: demand.count,
        factionOnly: demand.factionOnly,
        symbol: demand.symbol
    }); });
    perFaction = Object.keys(perFaction)
        .map(function (key) { return ({
        name: key.replace(' Transmission', ''),
        count: perFaction[key].count,
        exclusive: perFaction[key].exclusive
    }); })
        .sort(function (a, b) { return a.exclusive - b.exclusive; });
    perTrait = Object.keys(perTrait)
        .map(function (key) { return ({ name: key, count: perTrait[key] }); })
        .sort(function (a, b) { return b.count - a.count; });
    fs.writeFileSync(STATIC_PATH + 'misc_stats.json', JSON.stringify({ alldemands: alldemands, perFaction: perFaction, perTrait: perTrait }));
    var getSkillWithBonus = function (crew_skills, skillName, skillType) {
        return crew_skills[skillName][skillType] * (skill_bufs[skillName.replace('_skill', '')][skillType] + 1.1);
    };
    calcRank(function (crew) {
        var voyTotal = 0;
        for (var skill in SKILLS) {
            if (crew.base_skills[skill]) {
                var voyScore = getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
                voyTotal += voyScore;
            }
        }
        return Math.ceil(voyTotal);
    }, 'voyRank');
    calcRank(function (crew) {
        var gauntletTotal = 0;
        for (var skill in SKILLS) {
            if (crew.base_skills[skill]) {
                var gauntletScore = (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
                gauntletTotal += gauntletScore;
            }
        }
        return Math.ceil(gauntletTotal);
    }, 'gauntletRank');
    calcRank(function (crew) {
        return crew.totalChronCost + crew.factionOnlyTotal * 30;
    }, 'chronCostRank');
    var skillNames = [];
    var _loop_4 = function (skill) {
        skillNames.push(skill);
        calcRank(function (crew) {
            if (crew.base_skills[skill]) {
                return Math.ceil(getSkillWithBonus(crew.base_skills, skill, 'core'));
            }
            return 0;
        }, "B_".concat(SKILLS[skill]));
        calcRank(function (crew) {
            if (crew.base_skills[skill]) {
                return Math.ceil(getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2);
            }
            return 0;
        }, "A_".concat(SKILLS[skill]));
    };
    for (var skill in SKILLS) {
        _loop_4(skill);
    }
    var _loop_5 = function (i) {
        var _loop_7 = function (j) {
            calcRank(function (crew) {
                var vTotal = 0;
                var vTertiary = 0;
                for (var skill in SKILLS) {
                    if (crew.base_skills[skill]) {
                        var vScore = getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
                        if (skill === skillNames[i] || skill === skillNames[j]) {
                            vTotal += vScore;
                        }
                        else {
                            vTertiary += vScore;
                        }
                    }
                }
                return Math.ceil(vTotal);
            }, "V_".concat(SKILLS[skillNames[i]], "_").concat(SKILLS[skillNames[j]]));
            calcRank(function (crew) {
                var gTotal = 0;
                var gTertiary = 0;
                for (var skill in SKILLS) {
                    if (crew.base_skills[skill]) {
                        var gScore = (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
                        if (skill === skillNames[i] || skill === skillNames[j]) {
                            gTotal += gScore;
                        }
                        else {
                            gTertiary += gScore;
                        }
                    }
                }
                return Math.ceil(gTotal);
            }, "G_".concat(SKILLS[skillNames[i]], "_").concat(SKILLS[skillNames[j]]));
            var _loop_8 = function (k) {
                calcRank(function (crew) {
                    var vtTotal = 0;
                    for (var skill in SKILLS) {
                        if (crew.base_skills[skill]) {
                            if (crew.base_skills[skillNames[i]] && crew.base_skills[skillNames[j]] && crew.base_skills[skillNames[k]]) {
                                var vtScore = getSkillWithBonus(crew.base_skills, skill, 'core') + (getSkillWithBonus(crew.base_skills, skill, 'range_min') + getSkillWithBonus(crew.base_skills, skill, 'range_max')) / 2;
                                vtTotal += vtScore;
                            }
                        }
                    }
                    return Math.ceil(vtTotal);
                }, "".concat([SKILLS[skillNames[i]], SKILLS[skillNames[j]], SKILLS[skillNames[k]]].sort().join(' / ')), 'voyTriplet');
            };
            for (var k = j + 1; k < skillNames.length; k++) {
                _loop_8(k);
            }
        };
        for (var j = i + 1; j < skillNames.length; j++) {
            _loop_7(j);
        }
    };
    for (var i = 0; i < skillNames.length - 1; i++) {
        _loop_5(i);
    }
    // Add markdown data
    for (var _e = 0, crewlist_2 = crewlist; _e < crewlist_2.length; _e++) {
        var crew = crewlist_2[_e];
        var mdData = getCrewMarkDown(crew.symbol);
        if (!mdData) {
            console.log("Crew ".concat(crew.name, " not found!"));
        }
        else {
            crew.bigbook_tier = mdData.meta.bigbook_tier ? Number.parseInt(mdData.meta.bigbook_tier) : -1;
            //crew.events = mdData.meta.events ? Number.parseInt(mdData.meta.events) : 0;
            crew.in_portal = !!mdData.meta.in_portal;
            crew.date_added = new Date();
            if (mdData.meta.date) {
                // Date is in European format :) "dd/mm/yyyy"
                var m = mdData.meta.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (m) {
                    crew.date_added = new Date(m[3], m[2] - 1, m[1]);
                }
            }
            if (!crew.obtained) {
                crew.obtained = mdData.meta.obtained ? mdData.meta.obtained : 'N/A';
            }
            crew.markdownContent = mdData.markdownContent;
        }
    }
    // Calculate optimised polestars
    var polestarCombos = {};
    for (var _f = 0, crewlist_3 = crewlist; _f < crewlist_3.length; _f++) {
        var crew = crewlist_3[_f];
        if (!crew.in_portal)
            continue;
        var polestars = crew.traits.slice();
        polestars.push('crew_max_rarity_' + crew.max_rarity);
        for (var skill in crew.base_skills) {
            if (crew.base_skills[skill])
                polestars.push(skill);
        }
        var onePolestarCombos = polestars.slice().map(function (pol) { return [pol]; });
        var twoPolestarCombos = _.combinations(polestars, 2);
        var threePolestarCombos = _.combinations(polestars, 3);
        var fourPolestarCombos = _.combinations(polestars, 4);
        var crewPolestarCombos = [].concat(onePolestarCombos).concat(twoPolestarCombos).concat(threePolestarCombos).concat(fourPolestarCombos);
        var comboIds = []; // Potential list of combos to check later
        for (var _g = 0, crewPolestarCombos_1 = crewPolestarCombos; _g < crewPolestarCombos_1.length; _g++) {
            var combo = crewPolestarCombos_1[_g];
            var sorted = combo.sort();
            var combokey = sorted.join();
            if (!polestarCombos[combokey]) {
                polestarCombos[combokey] = {
                    count: 0,
                    crew: [],
                    polestars: sorted,
                };
                // Only add new combos to list; if it already exists in polestarCombos,
                //	its count is > 1 and is of no use to us here
                comboIds.push(sorted);
            }
            polestarCombos[combokey].count = polestarCombos[combokey].count + 1;
            polestarCombos[combokey].crew.push(crew.symbol);
        }
        crew._comboIds = comboIds; // Attach as temp property
    }
    var isSuperset = function (test, existing) {
        return existing.some(function (subset) { return test.length > subset.length && subset.every(function (subtrait) { return test.some(function (testtrait) { return testtrait === subtrait; }); }); });
    };
    var _loop_6 = function (crew) {
        if (!crew.in_portal)
            return "continue";
        var uniqueCombos = [];
        // Now double check a crew's list of combos to find counts that are still 1
        (_a = crew._comboIds) === null || _a === void 0 ? void 0 : _a.forEach(function (pc) {
            var pcj = pc.join();
            if (polestarCombos[pcj].count === 1) {
                // Ignore supersets of already perfect subsets
                if (!isSuperset(pc, uniqueCombos))
                    uniqueCombos.push(polestarCombos[pcj].polestars);
            }
        });
        crew.unique_polestar_combos = uniqueCombos;
        delete crew._comboIds; // Don't need it anymore
    };
    for (var _h = 0, crewlist_4 = crewlist; _h < crewlist_4.length; _h++) {
        var crew = crewlist_4[_h];
        _loop_6(crew);
    }
    // Sory by date added
    crewlist = crewlist.sort(function (a, b) {
        if (typeof a.date_added === 'string') {
            a.date_added = new Date(a.date_added);
        }
        if (typeof b.date_added === 'string') {
            b.date_added = new Date(b.date_added);
        }
        return a.date_added.getTime() - b.date_added.getTime();
    });
    processCrew(crewlist);
    postProcessQuipmentScores(crewlist, items);
    fs.writeFileSync(STATIC_PATH + 'crew.json', JSON.stringify(crewlist));
    // Calculate some skill set stats for the BigBook
    var counts = {};
    for (var _j = 0, crewlist_5 = crewlist; _j < crewlist_5.length; _j++) {
        var crew = crewlist_5[_j];
        if ((crew.max_rarity === 4 || crew.max_rarity === 5) && Object.getOwnPropertyNames(crew.base_skills).length === 3) {
            var combo = Object.getOwnPropertyNames(crew.base_skills)
                .map(function (s) { return SKILLS[s]; })
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
    var csvOutput = 'crew, tier, rarity, ';
    for (var skill in SKILLS) {
        csvOutput += "".concat(SKILLS[skill], "_core, ").concat(SKILLS[skill], "_min, ").concat(SKILLS[skill], "_max, ");
    }
    for (var i = 0; i < skillNames.length - 1; i++) {
        for (var j = i + 1; j < skillNames.length; j++) {
            csvOutput += "V_".concat(SKILLS[skillNames[i]], "_").concat(SKILLS[skillNames[j]], ", ");
        }
    }
    for (var i = 0; i < skillNames.length - 1; i++) {
        for (var j = i + 1; j < skillNames.length; j++) {
            csvOutput += "G_".concat(SKILLS[skillNames[i]], "_").concat(SKILLS[skillNames[j]], ", ");
        }
    }
    csvOutput +=
        'voyage_rank, gauntlet_rank, traits, hidden_traits, action_name, action_bonus_type, action_bonus_amount, action_initial_cooldown, action_duration, action_cooldown, bonus_ability, trigger, uses_per_battle, penalty_type, penalty_amount, accuracy, crit_bonus, crit_chance, evasion, charge_phases, short_name, image_name, symbol\r\n';
    for (var _k = 0, crewlist_6 = crewlist; _k < crewlist_6.length; _k++) {
        var crew = crewlist_6[_k];
        var crewLine = "\"".concat(crew.name.replace(/"/g, ''), "\",");
        var mdData = getCrewMarkDown(crew.symbol);
        if (mdData && mdData.meta && mdData.meta.bigbook_tier && mdData.meta.bigbook_tier < 20 && mdData.meta.bigbook_tier > 0) {
            crewLine += "".concat(mdData.meta.bigbook_tier, ",");
        }
        else {
            crewLine += '0,';
        }
        crewLine += "".concat(crew.max_rarity, ", ");
        for (var skill in SKILLS) {
            if (crew.base_skills[skill]) {
                crewLine += "".concat(crew.base_skills[skill].core, ",").concat(crew.base_skills[skill].range_min, ",").concat(crew.base_skills[skill].range_max, ",");
            }
            else {
                crewLine += '0,0,0,';
            }
        }
        for (var i = 0; i < skillNames.length - 1; i++) {
            for (var j = i + 1; j < skillNames.length; j++) {
                crewLine += crew.ranks["V_".concat(SKILLS[skillNames[i]], "_").concat(SKILLS[skillNames[j]])] + ',';
            }
        }
        for (var i = 0; i < skillNames.length - 1; i++) {
            for (var j = i + 1; j < skillNames.length; j++) {
                crewLine += crew.ranks["G_".concat(SKILLS[skillNames[i]], "_").concat(SKILLS[skillNames[j]])] + ',';
            }
        }
        crewLine += crew.ranks.voyRank + ',' + crew.ranks.gauntletRank + ',';
        crewLine += "\"".concat(crew.traits_named.join(', ').replace(/"/g, ''), "\",\"").concat(crew.traits_hidden.join(', ').replace(/"/g, ''), "\",");
        crewLine += "\"".concat(crew.action.name, "\",").concat(crew.action.bonus_type, ", ").concat(crew.action.bonus_amount, ", ").concat(crew.action.initial_cooldown, ", ").concat(crew.action.duration, ", ").concat(crew.action.cooldown, ", ");
        crewLine += "".concat(crew.action.ability ? crew.action.ability.type : '', ", ").concat(crew.action.ability ? crew.action.ability.condition : '', ", ");
        crewLine += "".concat(crew.action.limit || '', ", ").concat(crew.action.penalty ? crew.action.penalty.type : '', ", ").concat(crew.action.penalty ? crew.action.penalty.amount : '', ", ");
        crewLine += "".concat(crew.ship_battle.accuracy || '', ", ").concat(crew.ship_battle.crit_bonus || '', ", ").concat(crew.ship_battle.crit_chance || '', ", ").concat(crew
            .ship_battle.evasion || '', ", ").concat(!!crew.action.charge_phases, ",");
        crewLine += "\"".concat(crew.short_name, "\",").concat(crew.imageUrlPortrait, ",").concat(crew.symbol);
        crewLine = crewLine.replace(/undefined/g, '0');
        csvOutput += "".concat(crewLine, "\r\n");
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
    var crewlist = JSON.parse(fs.readFileSync(STATIC_PATH + 'crew.json', 'utf-8'));
    var workbook = new ExcelJS.Workbook();
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
        if (!short) {
            return 'Movies';
        }
        return short;
    }
    function getSkillColumns(crew, skillName) {
        var ret = {};
        for (var i = 1; i <= 5; i++) {
            ret["".concat(skillName).concat(i)] = '';
        }
        ret["".concat(skillName, "min")] = '';
        ret["".concat(skillName, "max")] = '';
        if (!crew.base_skills[skillName] || !crew.base_skills[skillName].core) {
            return ret;
        }
        ret["".concat(skillName).concat(crew.max_rarity)] = crew.base_skills[skillName].core;
        ret["".concat(skillName, "min")] = crew.base_skills[skillName].range_min;
        ret["".concat(skillName, "max")] = crew.base_skills[skillName].range_max;
        crew.skill_data.forEach(function (sd) {
            ret["".concat(skillName).concat(sd.rarity)] = sd.base_skills[skillName].core;
        });
        return ret;
    }
    crewlist = crewlist.sort(function (a, b) { return a.name.localeCompare(b.name); });
    for (var _i = 0, crewlist_7 = crewlist; _i < crewlist_7.length; _i++) {
        var crew = crewlist_7[_i];
        var row = {
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
    var disputes = JSON.parse(fs.readFileSync(STATIC_PATH + 'disputes.json', 'utf-8'));
    var missionsfull = JSON.parse(fs.readFileSync(STATIC_PATH + 'missionsfull.json', 'utf-8'));
    var episodes = [];
    for (var _i = 0, missionsfull_1 = missionsfull; _i < missionsfull_1.length; _i++) {
        var mission = missionsfull_1[_i];
        if (mission.episode !== undefined) {
            episodes.push(mission);
        }
    }
    for (var _a = 0, disputes_1 = disputes; _a < disputes_1.length; _a++) {
        var dispute = disputes_1[_a];
        if (dispute.exclude_from_timeline) {
            continue;
        }
        dispute.quests = [];
        var _loop_9 = function (mission_id) {
            var mission = missionsfull.find(function (m) { return m.id === mission_id; });
            if (!mission) {
                console.error(mission_id);
            }
            else {
                dispute.quests = dispute.quests.concat(mission.quests);
            }
        };
        for (var _b = 0, _c = dispute.mission_ids; _b < _c.length; _b++) {
            var mission_id = _c[_b];
            _loop_9(mission_id);
        }
        delete dispute.mission_ids;
        episodes.push(dispute);
    }
    episodes = episodes.sort(function (a, b) { return a.episode - b.episode; });
    fs.writeFileSync(STATIC_PATH + 'episodes.json', JSON.stringify(episodes));
}
function isQuipmentMatch(crew, item) {
    var _a, _b, _c;
    if (item.kwipment) {
        if (!item.max_rarity_requirement)
            return false;
        var bonus = getItemBonuses(item);
        var mrq = item.max_rarity_requirement;
        var rr = mrq >= crew.max_rarity;
        if (!!((_a = item.traits_requirement) === null || _a === void 0 ? void 0 : _a.length)) {
            if (item.traits_requirement_operator === "and") {
                rr && (rr = (_b = item.traits_requirement) === null || _b === void 0 ? void 0 : _b.every(function (t) { return crew.traits.includes(t) || crew.traits_hidden.includes(t); }));
            }
            else {
                rr && (rr = (_c = item.traits_requirement) === null || _c === void 0 ? void 0 : _c.some(function (t) { return crew.traits.includes(t) || crew.traits_hidden.includes(t); }));
            }
        }
        rr && (rr = Object.keys(bonus.bonuses).some(function (skill) { return skill in crew.base_skills; }));
        return rr;
    }
    return false;
}
function calcQuipmentScore(crew, quipment, overallOnly) {
    var _a;
    var qps = quipment.filter(function (f) { return isQuipmentMatch(crew, f.item); });
    crew.quipment_score = qps.map(function (m) { return Object.values(m.bonusInfo.bonuses).map(function (n) { return n.skill && n.skill in crew.base_skills && crew.base_skills[n.skill].core ? n.core + n.range_min + n.range_max : 0; }); }).flat().reduce(function (p, n) { return p + n; }, 0) * crew.max_rarity;
    if (overallOnly)
        return;
    (_a = crew.quipment_scores) !== null && _a !== void 0 ? _a : (crew.quipment_scores = {
        command_skill: 0,
        medicine_skill: 0,
        diplomacy_skill: 0,
        science_skill: 0,
        security_skill: 0,
        engineering_skill: 0,
        trait_limited: 0
    });
    crew.quipment_scores.trait_limited = qps.filter(function (f) { var _a; return !!((_a = f.item.traits_requirement) === null || _a === void 0 ? void 0 : _a.length); }).map(function (m) { return Object.values(m.bonusInfo.bonuses).map(function (n) { return n.core + n.range_min + n.range_max; }); }).flat().reduce(function (p, n) { return p + n; }, 0) * crew.max_rarity;
    Object.keys(SKILLS).forEach(function (sk) {
        if (crew.quipment_scores) {
            crew.quipment_scores[sk] = qps.map(function (m) { return Object.values(m.bonusInfo.bonuses).filter(function (f) { return f.skill === sk; }).map(function (n) { return n.core + n.range_min + n.range_max; }); }).flat().reduce(function (p, n) { return p + n; }, 0) * crew.max_rarity;
        }
    });
}
function calculateTopQuipment(crew) {
    var _a, _b;
    var scores = [];
    for (var i = 0; i < 5; i++) {
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
            },
            voyage_quotient: 0,
            voyage_quotients: {
                command_skill: 0,
                diplomacy_skill: 0,
                medicine_skill: 0,
                science_skill: 0,
                engineering_skill: 0,
                security_skill: 0,
                trait_limited: 0
            }
        });
    }
    var qkeys = Object.keys(scores[0].quipment_scores);
    for (var _i = 0, crew_1 = crew; _i < crew_1.length; _i++) {
        var c = crew_1[_i];
        var r = c.max_rarity - 1;
        var skscore = scores[r].quipment_scores;
        if (!c.quipment_score || !c.quipment_scores)
            continue;
        if (c.quipment_score > ((_a = scores[r].quipment_score) !== null && _a !== void 0 ? _a : 0)) {
            scores[r].quipment_score = c.quipment_score;
        }
        for (var _c = 0, qkeys_1 = qkeys; _c < qkeys_1.length; _c++) {
            var key = qkeys_1[_c];
            if (c.quipment_scores[key] > skscore[key]) {
                skscore[key] = c.quipment_scores[key];
            }
        }
        var vqscore = scores[r].voyage_quotients;
        if (!c.voyage_quotient)
            continue;
        if (scores[r].voyage_quotient === 0 || c.voyage_quotient < ((_b = scores[r].voyage_quotient) !== null && _b !== void 0 ? _b : 0)) {
            scores[r].voyage_quotient = c.voyage_quotient;
        }
        if (!c.voyage_quotients)
            continue;
        for (var _d = 0, qkeys_2 = qkeys; _d < qkeys_2.length; _d++) {
            var key = qkeys_2[_d];
            if (c.voyage_quotients[key] > vqscore[key]) {
                vqscore[key] = c.voyage_quotients[key];
            }
        }
    }
    var _loop_10 = function (c) {
        var r = c.max_rarity - 1;
        var skscore = scores[r].quipment_scores;
        var escore = scores[r].quipment_score;
        if (c.quipment_score && escore) {
            c.quipment_grade = c.quipment_score / escore;
        }
        if (c.quipment_scores) {
            Object.keys(c.quipment_scores).forEach(function (key) {
                var _a;
                if (key in skscore) {
                    (_a = c.quipment_grades) !== null && _a !== void 0 ? _a : (c.quipment_grades = {
                        command_skill: 0,
                        diplomacy_skill: 0,
                        medicine_skill: 0,
                        science_skill: 0,
                        engineering_skill: 0,
                        security_skill: 0,
                        trait_limited: 0
                    });
                    c.quipment_grades[key] = c.quipment_scores[key] / skscore[key];
                }
            });
        }
    };
    for (var _e = 0, crew_2 = crew; _e < crew_2.length; _e++) {
        var c = crew_2[_e];
        _loop_10(c);
    }
    return scores;
}
function getSkillOrder(crew) {
    var sk = [];
    for (var _i = 0, _a = Object.keys(SKILLS); _i < _a.length; _i++) {
        var skill = _a[_i];
        if (skill in crew.base_skills && !!crew.base_skills[skill].core) {
            sk.push(__assign(__assign({}, crew.base_skills[skill]), { skill: skill }));
        }
    }
    sk.sort(function (a, b) { return b.core - a.core; });
    var output = [];
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
exports.getSkillOrder = getSkillOrder;
var STATS_CONFIG = {
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
function getItemBonuses(item) {
    var _a;
    var _b;
    var bonusText = [];
    var bonuses = {};
    if (item.bonuses) {
        for (var _i = 0, _c = Object.entries(item.bonuses); _i < _c.length; _i++) {
            var _d = _c[_i], key = _d[0], value = _d[1];
            var bonus = STATS_CONFIG[Number.parseInt(key)];
            if (bonus) {
                bonusText.push("+".concat(value, " ").concat(bonus.symbol));
                (_a = bonuses[_b = bonus.skill]) !== null && _a !== void 0 ? _a : (bonuses[_b] = { core: 0, range_min: 0, range_max: 0 });
                bonuses[bonus.skill][bonus.stat] = value;
                bonuses[bonus.skill].skill = bonus.skill;
            }
            else {
                // TODO: what kind of bonus is this?
            }
        }
    }
    return {
        bonusText: bonusText,
        bonuses: bonuses
    };
}
exports.getItemBonuses = getItemBonuses;
function getItemWithBonus(item) {
    return {
        item: item,
        bonusInfo: getItemBonuses(item)
    };
}
function processCrew(result) {
    result.forEach(function (item) {
        item.skill_order = getSkillOrder(item);
        item.action.cycle_time = item.action.cooldown + item.action.duration;
        if (typeof item.date_added === 'string') {
            item.date_added = new Date(item.date_added);
        }
    });
    return result;
}
function postProcessQuipmentScores(crew, items) {
    var quipment = items.filter(function (f) { return f.type === 14; }).map(function (item) { return getItemWithBonus(item); });
    crew.forEach(function (crew) {
        calcQuipmentScore(crew, quipment);
    });
}
main();
updateExcelSheet();
generateMissions();
