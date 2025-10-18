import { BaseSkills, CrewMember } from "../../model/crew";
import { Collection } from "../../model/collections";
import { TranslateMethod } from "../../model/player";
import { TraitNames } from "../../model/traits";
import { AntimatterSeatMap } from "../../model/voyage";
import { getVariantTraits, skillSum } from "../../utils/crewutils";
import CONFIG from "../CONFIG";
import { EpochDiff, GraphSeries, Highs, SkillFilterConfig, SkillOrderDebut, SkillOrderDebutCrew, EpochItem, StatsDataSets } from "./model";
import convert from 'color-convert';

export const OptionsPanelFlexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
export const OptionsPanelFlexColumn: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};

export const GameEpoch = new Date("2016-01-01T00:00:00Z");

export const SkillColors = {
    "security_skill": "#FF6347",
    "command_skill": "#DAA520",
    "science_skill": "#90EE90",
    "medicine_skill": "#7FFFD4",
    "engineering_skill": "#FFA500",
    "diplomacy_skill": "#9370DB"
}


export const HiddenTraitCols = {
    original: 34,
    dsc: 20,
    ent: 66,
    voy: 74,
    q: 31,
    evsuit: 38,
    ageofsail: 37,
    exclusive_gauntlet: 32,
    low: 54,
    tas: 54,
    vst: 54,
    crew_max_rarity_3: 16,
    crew_max_rarity_2: 15,
    crew_max_rarity_1: 14,
    niners: 29
};

export function getRGBSkillColors() {
    const output = { ... SkillColors };
    Object.keys(output).forEach((key) => {
        let res = convert.hex.rgb(output[key].slice(1));
        output[key] = `rgb(${res[0]},${res[1]},${res[2]})`
    });
    return output;
}

export function epochToDate(day: number) {
    let d = new Date(GameEpoch);
    d.setUTCDate(d.getUTCDate() + day);
    return d;
}

export function dateToEpoch(d: Date = new Date()) {
    return Math.floor((d.getTime() - GameEpoch.getTime()) / (1000 * 60 * 60 * 24));
}

export function isoDatePart(d: Date) {
    return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`
}

export function findHigh(epoch_day: number, skills: string[], data: Highs[], rarity: number, day_only = false) {
    let ssj = skills.join();
    data.sort((a, b) => b.epoch_day - a.epoch_day);
    return data.find(f => f.rarity === rarity && f.epoch_day <= epoch_day && (day_only || f.skills.join() === ssj));
}

export function skillIcon(skill: string) {
    return `${process.env.GATSBY_ASSETS_URL}/atlas/icon_${skill}.png`;
}

export function formatElapsedDays(days: number, t: TranslateMethod, ago = false): string {
    if (days === 0) {
        if (ago) {
            return t('duration.today');
        }
        else {
            return t('duration.same_time');
        }
    }
    else if (days === 1 && ago) {
        return t('duration.yesterday');
    }

    let fmt = '';
    let val = 0;
    let varname = '';

    if (days <= 14) {
        val = Math.round(days);
        fmt = `duration.n_day${val > 1 ? 's' : ''}`;
        varname = 'days';
    }
    else if (days <= 28) {
        val = Number(Math.round(days / 7).toFixed(1));
        fmt = `duration.n_week${val > 1 ? 's' : ''}`;
        varname = 'weeks';
    }
    else if (days < 365) {
        let d1 = new Date();
        let d2 = new Date();
        d2.setDate(d2.getDate() - days);
        if (d1.getFullYear() === d2.getFullYear()) {
            val = d1.getMonth() - d2.getMonth();
        }
        else {
            val = d1.getMonth() + (12 - d2.getMonth());
        }
        //if (Math.abs(d1.getDate() - d2.getDate()) >= 15) val++;
        fmt = `duration.n_month${val > 1 ? 's' : ''}`;
        varname = 'months';
    }
    else {
        val = Number((days / 365).toFixed(1));
        fmt = `duration.n_year${val > 1 ? 's' : ''}`;
        varname = 'years';
    }

    return t(fmt, { [varname]: `${val.toLocaleString()}` });
}

export function configSkillFilters(data: CrewMember[], currConfig?: SkillFilterConfig) {
    if (currConfig && !currConfig.rarity) currConfig.rarity = [];
    const config: SkillFilterConfig = {
        start_date: '',
        end_date: '',
        avail_primary: [],
        primary: [],
        avail_secondary: [],
        secondary: [],
        avail_tertiary: [],
        tertiary: [],
        primary_totals: {},
        secondary_totals: {},
        tertiary_totals: {},
        obtainedFilter: [],
        rarity: [5],
        ...currConfig
    }
    config.start_date ??= '';
    config.end_date ??= '';
    try {
        if (config.start_date) {
            let d = new Date(config.start_date);
            config.start_date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${(d.getUTCDate()).toString().padStart(2, '0')}`;
        }
        if (config.end_date) {
            let d = new Date(config.end_date);
            config.end_date = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${(d.getUTCDate()).toString().padStart(2, '0')}`;
        }
    }
    catch {
        config.start_date = '';
        config.end_date = '';
    }
    if (!data?.length) return config;

    let curr_crew = [ ...data ].filter(f => !config.rarity.length || config.rarity.includes(f.max_rarity));

    ["primary", "secondary", "tertiary"].forEach((pos, idx) => {
        const new_skills = [] as string[];
        const avail_skills = [...new Set(curr_crew.filter(f => f.skill_order.length > idx).map(m => m.skill_order[idx]))];
        config[`avail_${pos}`] = avail_skills;
        avail_skills.forEach((skill) => {
            config[`${pos}_totals`][skill] = curr_crew.filter(f => f.skill_order.length > idx && f.skill_order[idx] === skill).length;
        });

        for (let skill of config[pos]) {
            if (avail_skills.includes(skill)) {
                new_skills.push(skill);
            }
        }
        let hadnone = config[pos].includes('')
        config[pos] = new_skills;
        if (hadnone) config[pos].push('')
        curr_crew = curr_crew.filter(f => !config[pos].length || (f.skill_order.length > idx && config[pos].includes(f.skill_order[idx])));
    });
    return config;
}


export function filterBuckets(filterConfig: SkillFilterConfig, buckets: { [key: string]: EpochItem[] }) {
    const newbuckets = {} as { [key: string]: EpochItem[] };
    Object.entries(buckets).forEach(([skill_order, entries]) => {
        if (test(filterConfig, { skills: skill_order.split(","), rarity: 0 })) {
            let newentries = entries.filter(f => !filterConfig.rarity.length || filterConfig.rarity.includes(f.rarity));
            if (filterConfig.obtainedFilter.length) newentries = newentries.filter(f => passObtained(f.crew, filterConfig.obtainedFilter))
            newentries = newentries.filter(f => testDate(filterConfig, f.epoch_day));

            if (newentries.length) {
                newbuckets[skill_order] = newentries;
            }
        }
    });
    return newbuckets;
}

export function filterFlatData(filterConfig: SkillFilterConfig, data: EpochItem[]) {
    const newdata = [] as EpochItem[];
    data.forEach((entry) => {
        if (filterConfig.obtainedFilter.length && !passObtained(entry.crew, filterConfig.obtainedFilter)) return;
        if (test(filterConfig, entry)) {
            newdata.push(entry);
        }
    });
    return newdata;
}

export function filterHighs(filterConfig: SkillFilterConfig, highs: Highs[]) {
    const newhighs = [] as Highs[];
    highs.forEach((entry) => {
        if (filterConfig.obtainedFilter.length && !passObtained(entry.crew, filterConfig.obtainedFilter)) return;
        if (test(filterConfig, entry)) {
            newhighs.push(entry);
        }
    })
    return newhighs;
}

export function filterEpochDiffs(filterConfig: SkillFilterConfig, diffs: EpochDiff[]) {
    const newdiffs = [] as EpochDiff[];
    diffs.forEach((diff) => {
        if (filterConfig.obtainedFilter.length && !diff.crew.every(c => passObtained(c, filterConfig.obtainedFilter))) return;
        if (test(filterConfig, diff)) {
            newdiffs.push(diff);
        }
    });
    return newdiffs;
}

export function statFilterCrew<T extends CrewMember>(filterConfig: SkillFilterConfig, crew: T[], ignore_date = false) {
    const newcrew = [] as T[];
    crew.forEach((c) => {
        if (filterConfig.obtainedFilter.length) {
            if (!passObtained(c, filterConfig.obtainedFilter)) return;
        }
        if (test(filterConfig, { rarity: c.max_rarity, skills: c.skill_order, date: ignore_date ? undefined : c.date_added })) {
            newcrew.push(c);
        }
    });
    return newcrew;
}

function test<T extends { rarity: number, skills: string[], epoch_day?: number, date?: Date, epoch_days?: number[] }>(filterConfig: SkillFilterConfig, entry: T) {
    let skills = entry.skills;
    let pass = true;

    if (entry.date || entry.epoch_day) {
        if (!testDate(filterConfig, entry.date || entry.epoch_day)) return false;
    }

    if (entry.epoch_days) {
        if (!entry.epoch_days.some(d => testDate(filterConfig, d))) return false;
    }

    if (skills.length) {
        ["primary", "secondary", "tertiary"].forEach((pos, idx) => {
            let nonepos = filterConfig[pos].includes('');
            if (!nonepos) {
                if (!pass) return;
                if (skills[idx] && idx < skills.length && (filterConfig[pos]?.length && !filterConfig[pos].includes(skills[idx]))) {
                    pass = false;
                }
                else if (idx >= skills.length && filterConfig[pos]?.length) {
                    pass = false;
                }
            }
            else if (skills.length >= idx + 1) {
                pass = false;
            }
        });
    }
    else {
        pass = false;
    }

    if (entry.rarity && filterConfig.rarity.length && !filterConfig.rarity.includes(entry.rarity)) pass = false;
    return pass;
}

export function testDate(filterConfig: SkillFilterConfig, date?: number | string | Date) {
    if (!date || (!filterConfig.start_date && !filterConfig.end_date)) return true;
    if (typeof date === 'string') date = new Date(date);
    if (typeof date === 'number') date = epochToDate(date);

    if (filterConfig.start_date) {
        let d2 = new Date(filterConfig.start_date);
        if (date.getTime() < d2.getTime()) return false;
    }
    if (filterConfig.start_date) {
        let d2 = new Date(filterConfig.end_date);
        if (date.getTime() > d2.getTime()) return false;
    }
    return true;
}

export function makeFilterCombos(config: SkillFilterConfig, no_avail = false) {
    let a = config.primary.length ? config.primary : no_avail ? [] : config.avail_primary;
    let b = config.secondary.length ? config.secondary : no_avail ? [] : config.avail_secondary;
    let c = config.tertiary.length ? config.tertiary : no_avail ? [] : config.avail_tertiary;

    let p = [] as string[];

    for (let z1 of a) {
        if (z1 && config.primary.length) p.push(`${z1}`);
        for (let z2 of b) {
            if (z2 === z1) continue;
            //if (config.secondary.length || config.primary.length) p.push(`${z1},${z2}`);
            if (z2 && config.secondary.length) p.push(`${z1},${z2}`);
            for (let z3 of c) {
                if (z2 === z3 || z3 === z1) continue;
                //if (config.primary.length || config.tertiary.length || config.secondary.length) p.push(`${z1},${z2},${z3}`);
                if (z3 && config.tertiary.length) p.push(`${z1},${z2},${z3}`);
            }
        }
    }
    p.sort((a, b) => a.localeCompare(b));
    let fp = [] as string[];
    for (let pt of p) {
        if (!p.some(px => px.startsWith(pt) && px !== pt)) {
            let pn = pt.split(",")
            while (pn.length < 3) pn.push("*")
            fp.push(pn.join(","))
        }
    }
    return fp;
}

export function passObtained(fc: CrewMember, obtained: string[]) {
    if (!fc) return false;
    if (obtained.includes(fc.obtained)) return true;
    if (obtained.includes("Event/Pack/Giveaway") && (fc.obtained === 'Mega' || fc.obtained === 'Event' || fc.obtained === 'Pack/Giveaway')) return true;
    if (obtained.includes("Event") && (fc.obtained === 'Event/Pack/Giveaway' || fc.obtained === 'Mega')) return true;
    if (obtained.includes("Pack/Giveaway") && fc.obtained === 'Event/Pack/Giveaway') return true;
    return false;
}

export function getPowerOnDay(subject: CrewMember, data: CrewMember[]) {
    subject.date_added = new Date(subject.date_added);
    let power = skillSum(Object.values(subject.base_skills));
    let filter = data.filter(f => f.max_rarity == subject.max_rarity && f.date_added.getTime() < subject.date_added.getTime() && f.skill_order.join() === subject.skill_order.join())
                    .filter(f => skillSum(Object.values(f.base_skills)) > power).sort((a, b) => skillSum(Object.values(b.base_skills)) - skillSum(Object.values(a.base_skills)));
    if (filter.length === 0) return 1;
    return skillSum(Object.values(filter[0].base_skills)) / power;
}

export function skillsToKey(skills: string[] | BaseSkills, rarity: number) {
    if (Array.isArray(skills)) {
        return skills.join(",") + "," + rarity
    }
    else {
        return Object.keys(skills).join(",") + "," + rarity
    }
}

export function keyToSkills(key: string) {
    return key.replace(/\//g, ',').split(",").map(m => m.trim());
}

export function keyToNames(key: string, short = true) {
    if (short) {
        return keyToSkills(key).map(m => CONFIG.SKILLS_SHORT.find(f => f.name === m)?.short || '').filter(f => f)
    }
    else {
        return keyToSkills(key).map(m => CONFIG.SKILLS[m] || '').filter(f => f)
    }
}

export function skillsToNames(skills: string[] | BaseSkills, short = true) {
    if (short) {
        if (Array.isArray(skills)) {
            return skills.map(m => CONFIG.SKILLS_SHORT.find(f => f.name === m)?.short || '')
        }
        else {
            return Object.keys(skills).map(m => CONFIG.SKILLS_SHORT.find(f => f.name === m)?.short || '')
        }
    }
    else {
        if (Array.isArray(skills)) {
            return skills.map(m => CONFIG.SKILLS[m] || '')
        }
        else {
            return Object.keys(skills).map(m => CONFIG.SKILLS[m] || '')
        }
    }
}

export function getSkillOrderDebutData(data: CrewMember[]): SkillOrderDebut[] {
    const epochData = {} as { [key: string]: SkillOrderDebut[] }

    data.forEach((c) => {
        let power = skillSum(Object.values(c.base_skills));
        let core = skillSum(Object.values(c.base_skills), 'core');
        let prof = skillSum(Object.values(c.base_skills), 'proficiency');

        let ed = dateToEpoch(c.date_added);

        epochData[ed] ??= [];
        let key = skillsToKey(c.skill_order, c.max_rarity);
        let f = epochData[ed].find(fe => fe.skill_order === key);
        if (!f) {
            f = {
                skill_order: key,
                crew: [{
                    symbol: c.symbol,
                    power,
                    rank_at_debut: 0,
                    new_high: false,
                    core_power: core,
                    prof_power: prof,
                    core_new_high: false,
                    prof_new_high: false,
                    core_rank_at_debut: 0,
                    prof_rank_at_debut: 0,
                    rarity: c.max_rarity
                }],
                epoch_day: ed,
                high_power: power,
                low_power: power,
                core_high_power: core,
                core_low_power: core,
                prof_high_power: prof,
                prof_low_power: prof,
                rarity: c.max_rarity
            }
            epochData[ed].push(f);
        }
        else {
            f.crew.push({
                symbol: c.symbol,
                power,
                rank_at_debut: 0,
                new_high: false,
                core_power: core,
                prof_power: prof,
                core_new_high: false,
                prof_new_high: false,
                core_rank_at_debut: 0,
                prof_rank_at_debut: 0,
                rarity: c.max_rarity
            });

            if (power > f.high_power) f.high_power = power;
            if (power < f.low_power) f.low_power = power;

            if (core > f.core_high_power) f.core_high_power = core;
            if (core < f.core_low_power) f.core_low_power = core;

            if (prof > f.prof_high_power) f.prof_high_power = prof;
            if (prof < f.prof_low_power) f.prof_low_power = prof;
        }
    });

    const rawdata = Object.values(epochData).flat()
    if (!rawdata?.length) return [];
    rawdata.sort((a, b) => a.epoch_day - b.epoch_day || a.skill_order.localeCompare(b.skill_order));

    const currhigh = {} as {[key:string]: number };
    const currlow = {} as {[key:string]: number };
    const c_currhigh = {} as {[key:string]: number };
    const c_currlow = {} as {[key:string]: number };
    const p_currhigh = {} as {[key:string]: number };
    const p_currlow = {} as {[key:string]: number };

    const first = rawdata[0].epoch_day;
    const last = rawdata[rawdata.length - 1].epoch_day;

    for (let i = first; i <= last; i++) {
        let records = rawdata.filter(f => f.epoch_day === i);
        if (records?.length) {
            for (let record of records) {
                if (currhigh[record.skill_order] === undefined || record.high_power > currhigh[record.skill_order]) {
                    currhigh[record.skill_order] = record.high_power;
                }
                if (currlow[record.skill_order] === undefined || record.low_power < currlow[record.skill_order]) {
                    currlow[record.skill_order] = record.low_power;
                }
                if (c_currhigh[record.skill_order] === undefined || record.core_high_power > c_currhigh[record.skill_order]) {
                    c_currhigh[record.skill_order] = record.core_high_power;
                }
                if (c_currlow[record.skill_order] === undefined || record.core_low_power < c_currlow[record.skill_order]) {
                    c_currlow[record.skill_order] = record.core_low_power;
                }
                if (p_currhigh[record.skill_order] === undefined || record.prof_high_power > p_currhigh[record.skill_order]) {
                    p_currhigh[record.skill_order] = record.prof_high_power;
                }
                if (p_currlow[record.skill_order] === undefined || record.prof_low_power < p_currlow[record.skill_order]) {
                    p_currlow[record.skill_order] = record.prof_low_power;
                }
            }
            for (let record of records) {
                record.high_power = currhigh[record.skill_order];
                record.low_power = currlow[record.skill_order];
                record.core_high_power = c_currhigh[record.skill_order];
                record.core_low_power = c_currlow[record.skill_order];
                record.prof_high_power = p_currhigh[record.skill_order];
                record.prof_low_power = p_currlow[record.skill_order];
                record.crew.forEach((c) => {
                    c.rank_at_debut = (c.power / record.high_power);
                    c.core_rank_at_debut = (c.core_power / record.core_high_power);
                    c.prof_rank_at_debut = (c.prof_power / record.prof_high_power);
                    c.new_high = c.rank_at_debut === 1;
                    c.core_new_high = c.core_rank_at_debut === 1;
                    c.prof_new_high = c.prof_rank_at_debut === 1;
                });
            }
        }
    }

    return rawdata;
}

export function createStatsDataSet(prefilteredCrew: CrewMember[]) {
    const crew = prefilteredCrew;
    const skoBuckets = {} as { [key: string]: EpochItem[] };
    const flatData = [] as EpochItem[];
    const highs = [] as Highs[];
    const obtainedList = [] as string[];
    for (let c of crew) {
        if (!obtainedList.includes(c.obtained)) obtainedList.push(c.obtained);
        const aggregates = Object.values(c.base_skills).map(skill => skillSum(skill));
        const cores = Object.values(c.base_skills).map(skill => skillSum(skill, 'core'));
        const profs = Object.values(c.base_skills).map(skill => skillSum(skill, 'proficiency'));
        const epoch_day = dateToEpoch(c.date_added);

        [1, 2, 3].forEach((n) => {
            if (c.skill_order.length >= n) {
                let skd = c.skill_order.slice(0, n);
                let sko = skd.join(",");

                let levels = skd.map(m => skillSum(c.base_skills[m]));
                let levels_core = skd.map(m => skillSum(c.base_skills[m], 'core'));
                let levels_prof = skd.map(m => skillSum(c.base_skills[m], 'proficiency'));
                let aggregate_sum = levels.reduce((p, n) => p + n, 0);
                let high = findHigh(epoch_day, skd, highs, c.max_rarity);
                if (!high || high.aggregate_sum < aggregate_sum) {
                    highs.push({
                        crew: c,
                        skills: skd,
                        aggregates: levels,
                        cores: levels_core,
                        proficiences: levels_prof,
                        epoch_day,
                        aggregate_sum,
                        rarity: c.max_rarity
                    });
                }
                skoBuckets[sko] ??= [];
                skoBuckets[sko].push({
                    symbol: c.symbol,
                    cores,
                    proficiencies: profs,
                    aggregates,
                    epoch_day,
                    skills: skd,
                    rarity: c.max_rarity,
                    crew: c
                });
                flatData.push({
                    symbol: c.symbol,
                    cores,
                    proficiencies: profs,
                    aggregates,
                    epoch_day,
                    skills: skd,
                    rarity: c.max_rarity,
                    crew: c
                });
            }
        });
    }

    for (let rarity = 1; rarity <= 5; rarity++) {
        let curr = {} as { [key: string]: EpochItem };
        flatData.filter(f => f.rarity === rarity).forEach((entry) => {
            let key = entry.skills.join(",");
            if (curr[key]) curr[key].next = entry;
            entry.prev = curr[key];
            curr[key] = entry;
        });
    }

    flatData.sort((a, b) => b.epoch_day - a.epoch_day || b.rarity - a.rarity);
    const epochDiffs = [] as EpochDiff[];

    let work: EpochItem[] = [];
    if (flatData?.length) {
        work = [...flatData];
    }

    if (work?.length) {
        work.sort((a, b) => b.epoch_day - a.epoch_day || b.rarity - a.rarity);
        let c = work.length;

        for (let i = 0; i < c; i++) {
            let s = work[i].skills.length;
            let next = work[i];
            if (!next.prev && i === c - 1) break;
            let curr = next.prev ?? work[i + 1];
            if (!next.prev) continue;
            let dd = next.epoch_day - curr.epoch_day;
            let sd = [] as number[];
            for (let j = 0; j < s; j++) {
                sd.push(next.aggregates[j] - curr.aggregates[j]);
            }
            let diff: EpochDiff = {
                symbols: [next.symbol, curr.symbol],
                day_diff: dd,
                epoch_days: [next.epoch_day, curr.epoch_day],
                skill_diffs: sd,
                skills: next.skills,
                velocity: 0,
                aggregates: [next.aggregates, curr.aggregates],
                cores: [next.cores, curr.cores],
                proficiencies: [next.proficiencies, curr.proficiencies],
                rarity: curr.rarity,
                crew: [next.crew, curr.crew]
            };
            let avgdiff = diff.skill_diffs.reduce((p, n) => p + n, 0) / diff.skill_diffs.length;
            if (avgdiff && diff.day_diff) diff.velocity = avgdiff / diff.day_diff;
            epochDiffs.push(diff);
        }
    }

    return { flatData, skoBuckets, highs, obtainedList, epochDiffs } as StatsDataSets;
}


export function canGauntlet(crew: CrewMember) {
    return Object.entries(crew.ranks).some(([key, value]) => (key.startsWith("G_") && value <= 20) || (key === 'gauntletRank' && value <= 20));
}

export function canShuttle(crew: CrewMember) {
    return Object.entries(crew.ranks).some(([key, value]) => key.startsWith("B_") && value <= 20);
}

export function canVoyage(crew: CrewMember) {

    return Object.entries(crew.ranks).some(([key, value]) => (key.startsWith("V_") && value <= 20) || (key === 'voyRank' && value <= 20) || (key === 'voyTriplet' && value.rank <= 20));
}

// export function canVoyage(item: { proficiencies: number[], core: number[], traits: string[], skills: string[] }) {
//     const lookupTrait = (trait: string) => {
//         const oma = [] as string[];
//         for (let ln of AntimatterSeatMap) {
//             if (ln.name  == trait) {
//                 return ln.skills;
//             }
//         }
//         return oma;
//     }

//     let core = item.core.reduce((p, n, i) => p + (n * (1 - (i * 0.25))));
//     let profs = item.proficiencies.reduce((p, n, i) => p + (n * (1 - (i * 0.25))));

//     let raw = core + profs;

//     if (raw > 3000) return true;
//     else if (raw > 2500) {
//         let amtraits = item.traits.filter(f => {
//             let l = lookupTrait(f);
//             if (l.some(e => item.skills.includes(e))) return true;
//             return false;
//         });
//         if (amtraits.length >= 6) return true;
//         if (item.skills.length === 3 && ['engineering_skill', 'medicine_skill', 'science_skill'].includes(item.skills[2])) return true;
//     }
//     return false;
// }

export function fillGaps(data: EpochItem[]) {
    const now = dateToEpoch();

    let skos = [...new Set(data.map(d => d.skills.join()))]

    data.sort((a, b) => a.epoch_day - b.epoch_day || a.skills.join().localeCompare(b.skills.join()));

    for (let sko of skos) {
        let chunk = data.filter(f => f.skills.join() === sko);
        let missing = [] as number[];
        let start = 0;
        while (!chunk.some(c => c.epoch_day === start)) start++;

        let prevrec = undefined as EpochItem | undefined;
        for (let m = start; m <= now; m++) {
            let rec = chunk.find(f => f.epoch_day === m);

            if (rec) {
                prevrec = rec;
            }
            else if (prevrec) {
                let prevchunk = prevrec;
                let newrec = { ... prevchunk };

                newrec.epoch_day = m;
                // newrec.prev = prevchunk;

                // if (prevchunk.next) {
                //     let onext = prevchunk.next;
                //     newrec.next = onext;
                //     onext.prev = newrec;
                // }
                prevrec = newrec;
                data.push(newrec);
            }
        }
    }

    data.sort((a, b) => a.epoch_day - b.epoch_day || a.skills.join().localeCompare(b.skills.join()));
}
export interface PotentialColsData {
    trait: string,
    count: number,
    distance: number
}

export function potentialCols(crew: CrewMember[], cols: Collection[], TRAIT_NAMES: TraitNames): PotentialColsData[] {
    const rc = crew.map(c => {
        let vt = getVariantTraits(c);
        let traits1 = c.traits.filter((trait) => {
            let col = cols.find(f => f.description?.includes(">" + (TRAIT_NAMES[trait]) + "<"))
            if (col) return false;
            if (HiddenTraitCols[trait]) return false;
            return true;
        });
        let traits2 = c.traits_hidden.filter((trait) => !HiddenTraitCols[trait] && !vt.includes(trait))
        return traits1.concat(traits2);
    }).flat().sort();
    const tr = {} as {[key:string]:number};
    for (let r of rc) {
        tr[r] ??= 0;
        tr[r]++;
    }
    return Object.entries(tr).map(([key, value]) => value >= 25 && value <= 200 ? { trait: key, count: value, distance: 0 } : undefined).filter(f => f !== undefined);
}

export function computePotentialColScores(crew: CrewMember[], collections: Collection[], TRAIT_NAMES: TraitNames) {
    if (crew?.length && collections?.length && TRAIT_NAMES) {
        let moving_number = 0;
        let max_crew = 0;
        collections.forEach((c, idx) => {
            if (c.crew?.length) {
                moving_number += (c.crew.length) * (idx + 1);
                if (max_crew < c.crew.length) max_crew = c.crew.length;
            }
        });
        moving_number /= collections.map((c, i) => i + 1).reduce((p, n) => p + n, 0);
        let potential = potentialCols(crew, collections, TRAIT_NAMES);
        potential.sort((a, b) => b.count - a.count);

        let max_c = potential[0].count;
        let med = moving_number;
        for (let p of potential) {
            p.distance = Math.abs(p.count - med);
        }
        potential.sort((a, b) => b.distance - a.distance);
        for (let p of potential) {
            p.count = Number(((1 - (p.distance / max_crew)) * 10).toFixed(2))
        }
        potential.sort((a, b) => b.count - a.count);
        max_c = potential[0].count;
        for (let p of potential) {
            p.count = Number(((p.count / max_c) * 10).toFixed(2))
        }
        return potential;
    }
    else {
        return [];
    }
}