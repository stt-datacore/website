import { CrewMember } from "../../model/crew";
import { TranslateMethod } from "../../model/player";
import { EpochDiff, Highs, SkillFilterConfig, SkoBucket } from "./model";

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
        if (test(filterConfig, entry)) {
            newdata.push(entry);
        }
    });
    return newdata;
}

export function filterHighs(filterConfig: SkillFilterConfig, highs: Highs[]) {
    const newhighs = [] as Highs[];
    highs.forEach((entry) => {
        if (test(filterConfig, entry)) {
            newhighs.push(entry);
        }
    })
    return newhighs;
}

function test<T extends { rarity: number, skills: string[] }>(filterConfig: SkillFilterConfig, entry: T) {
    let skills = entry.skills;
    let pass = true;

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

export function filterEpochDiffs(filterConfig: SkillFilterConfig, diffs: EpochDiff[]) {
    const newdiffs = [] as EpochDiff[];
    diffs.forEach((diff) => {
        let skills = diff.skills;
        let pass = true;

        if (skills.length) {
            ["primary", "secondary", "tertiary"].forEach((pos, idx) => {
                if (!pass) return;
                if (skills[idx] && idx < skills.length && (filterConfig[pos]?.length && !filterConfig[pos].includes(skills[idx]))) {
                    pass = false;
                }
                else if (idx >= skills.length && filterConfig[pos]?.length) {
                    pass = false;
                }
            });
        }
        else {
            pass = false;
        }

        if (filterConfig.rarity.length && !filterConfig.rarity.includes(diff.rarity)) pass = false;

        if (pass) {
            newdiffs.push(diff);
        }
    });
    return newdiffs;
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
