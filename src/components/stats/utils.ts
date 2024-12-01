import { BaseSkills, CrewMember } from "../../model/crew";
import { TranslateMethod } from "../../model/player";
import { skillSum } from "../../utils/crewutils";
import CONFIG from "../CONFIG";
import { EpochDiff, Highs, SkillFilterConfig, SkillOrderDebut, SkoBucket } from "./model";

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

export function formatElapsedDays(days: number, t: TranslateMethod): string {
    if (days === 0) return t('duration.same_time');

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
        if (Math.abs(d1.getDate() - d2.getDate()) >= 15) val++;
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


export function filterBuckets(filterConfig: SkillFilterConfig, buckets: { [key: string]: SkoBucket[] }) {
    const newbuckets = {} as { [key: string]: SkoBucket[] };
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

export function filterFlatData(filterConfig: SkillFilterConfig, data: SkoBucket[]) {
    const newdata = [] as SkoBucket[];
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

export function statFilterCrew<T extends CrewMember>(filterConfig: SkillFilterConfig, crew: T[]) {
    const newcrew = [] as T[];
    crew.forEach((c) => {
        if (filterConfig.obtainedFilter.length) {
            if (!passObtained(c, filterConfig.obtainedFilter)) return;
        }
        if (test(filterConfig, { rarity: c.max_rarity, skills: c.skill_order, date: c.date_added })) {
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
    let filter = data.filter(f => f.date_added.getTime() < subject.date_added.getTime() && f.skill_order.join() === subject.skill_order.join())
                    .filter(f => skillSum(Object.values(f.base_skills)) > power).sort((a, b) => skillSum(Object.values(b.base_skills)) - skillSum(Object.values(a.base_skills)));
    if (filter.length === 0) return 1;
    return skillSum(Object.values(filter[0].base_skills)) / power;
}

export function skillsToKey(skills: string[] | BaseSkills) {
    if (Array.isArray(skills)) {
        return skills.join(",")
    }
    else {
        return Object.keys(skills).join(",")
    }
}

export function keyToSkills(key: string) {
    return key.replace(/\//g, ',').split(",").map(m => m.trim());
}

export function keyToNames(key: string, short = true) {
    if (short) {
        return keyToSkills(key).map(m => CONFIG.SKILLS_SHORT.find(f => f.name === m)?.short || '')
    }
    else {
        return keyToSkills(key).map(m => CONFIG.SKILLS[m] || '')
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
        let ed = dateToEpoch(c.date_added);
        epochData[ed] ??= [];
        let key = skillsToKey(c.skill_order);
        let f = epochData[ed].find(fe => fe.skill_order === key);
        if (!f) {
            f = {
                skill_order: key,
                crew: [{ symbol: c.symbol, power, rank_at_debut: 0, new_high: false }],
                epoch_day: ed,
                high_power: power,
                low_power: power
            }
            epochData[ed].push(f);
        }
        else {
            f.crew.push(
                { symbol: c.symbol, power, rank_at_debut: 0, new_high: false }
            )
            if (power > f.high_power) f.high_power = power;
            if (power < f.low_power) f.low_power = power;
        }
    });

    const rawdata = Object.values(epochData).flat()
    rawdata.sort((a, b) => a.epoch_day - b.epoch_day || a.skill_order.localeCompare(b.skill_order));

    const currhigh = {} as {[key:string]: number };
    const currlow = {} as {[key:string]: number };

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
            }
            for (let record of records) {
                record.high_power = currhigh[record.skill_order];
                record.low_power = currlow[record.skill_order];
                record.crew.forEach((c) => {
                    c.rank_at_debut = (c.power / record.high_power);
                    c.new_high = c.rank_at_debut === 1;
                });
            }
        }
    }

    return rawdata;
}