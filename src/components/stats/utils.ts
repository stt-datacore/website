import { CrewMember } from "../../model/crew";
import { TranslateMethod } from "../../model/player";
import { EpochDiff, Highs, SkillFilterConfig, SkoBucket } from "./model";

export function findHigh(epoch_day: number, skills: string[], data: Highs[], day_only = false) {
    let ssj = skills.join();
    data.sort((a, b) => b.epoch_day - a.epoch_day);
    return data.find(f => f.epoch_day <= epoch_day && (day_only || f.skills.join() === ssj));
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
    const config: SkillFilterConfig = {
        avail_primary: [],
        primary: [],
        avail_secondary: [],
        secondary: [],
        avail_tertiary: [],
        tertiary: [],
        ...currConfig
    }

    if (!data?.length) return config;

    let curr_crew = [ ...data ];

    ["primary", "secondary", "tertiary"].forEach((key, idx) => {
        const new_skills = [] as string[];
        const avail_skills = [...new Set(curr_crew.filter(f => f.skill_order.length > idx).map(m => m.skill_order[idx]))];
        config[`available_${key}`] = avail_skills;

        for (let skill of config[key]) {
            if (avail_skills.includes(skill)) {
                new_skills.push(skill);
            }
        }

        config[key] = new_skills;
        curr_crew = curr_crew.filter(f => !config[key].length || (f.skill_order.length > idx && config[key].includes(f.skill_order[idx])));
    });

    return config;
}


export function filterBuckets(filterConfig: SkillFilterConfig, buckets: { [key: string]: SkoBucket[] }) {
    const newbuckets = {} as { [key: string]: SkoBucket[] };
    Object.entries(buckets).forEach(([skill_order, entries]) => {
        let skills = skill_order.split(",");
        let pass = true;

        if (skills.length) {
            ["primary", "secondary", "tertiary"].forEach((pos, idx) => {
                if (!pass) return;
                if (idx < skills.length && (filterConfig[pos]?.length && !filterConfig[pos].includes(skills[idx]))) {
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

        if (pass) {
            newbuckets[skill_order] = entries;
        }
    });
    return newbuckets;
}

export function filterFlatData(filterConfig: SkillFilterConfig, data: SkoBucket[]) {
    const newdata = [] as SkoBucket[];
    data.forEach((entry) => {
        let skills = entry.skills;
        let pass = true;

        if (skills.length) {
            ["primary", "secondary", "tertiary"].forEach((pos, idx) => {
                if (!pass) return;
                if (idx < skills.length && (filterConfig[pos]?.length && !filterConfig[pos].includes(skills[idx]))) {
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

        if (pass) {
            newdata.push(entry);
        }
    });
    return newdata;
}

export function filterHighs(filterConfig: SkillFilterConfig, highs: Highs[]) {
    const newhighs = [] as Highs[];
    highs.forEach((entry) => {
        let skills = entry.skills;
        let pass = true;

        if (skills.length) {
            ["primary", "secondary", "tertiary"].forEach((pos, idx) => {
                if (!pass) return;
                if (idx < skills.length && (filterConfig[pos]?.length && !filterConfig[pos].includes(skills[idx]))) {
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

        if (pass) {
            newhighs.push(entry);
        }
    })
    return newhighs;
}

export function filterEpochDiffs(filterConfig: SkillFilterConfig, diffs: EpochDiff[]) {
    const newdiffs = [] as EpochDiff[];
    diffs.forEach((diff) => {
        let skills = diff.skills;
        let pass = true;

        if (skills.length) {
            ["primary", "secondary", "tertiary"].forEach((pos, idx) => {
                if (!pass) return;
                if (idx < skills.length && (filterConfig[pos]?.length && !filterConfig[pos].includes(skills[idx]))) {
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

        if (pass) {
            newdiffs.push(diff);
        }
    });
    return newdiffs;
}
