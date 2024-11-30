import React, { useState } from 'react';
import { EpochDiff, Highs, IStatsContext, SkillFilterConfig, SkoBucket, StatsDisplayMode } from './model';
import { useStateWithStorage } from '../../utils/storage';
import { GlobalContext } from '../../context/globalcontext';
import { crewCopy, skillSum } from '../../utils/crewutils';
import { configSkillFilters, filterFlatData, findHigh } from './utils';
import CONFIG from '../CONFIG';
import { CrewMember } from '../../model/crew';

const defaultContextData = {
    skillKey: '',
    setSkillKey: () => false,
    flatOrder: [],
    setFlatOrder: () => false,
    obtainedFilter: [],
    setObtainedFilter: () => false,
    uniqueObtained: [],
    skoBuckets: {},
    displayMode: 'crew',
    setDisplayMode: () => false,
    epochDiffs: [],
    allHighs: [],
    crewCount: 0,
    filterConfig: configSkillFilters([]),
    setFilterConfig: () => false
} as IStatsContext;

export const StatsContext = React.createContext(defaultContextData);

export const StatsDataProvider = (props: { children: JSX.Element }) => {
    const { children } = props;
    const globalContext = React.useContext(GlobalContext);

    const [displayMode, setDisplayMode] = useStateWithStorage<StatsDisplayMode>(`stats_display_mode`, 'crew', { rememberForever: true });
    const [filterConfig, internalSetFilterConfig] = useStateWithStorage<SkillFilterConfig>(`stats_page_skill_filter_config`, defaultContextData.filterConfig, { rememberForever: true });

    const [allHighs, setAllHighs] = React.useState([] as Highs[]);
    const [skoBuckets, setSkoBuckets] = React.useState({} as { [key: string]: SkoBucket[] });
    const [flatOrder, setFlatOrder] = React.useState([] as SkoBucket[]);
    const [epochDiffs, setEpochDiffs] = React.useState([] as EpochDiff[]);
    const [uniqueObtained, setUniqueObtained] = React.useState([] as string[]);
    const [crewCount, setCrewCount] = React.useState(0);

    const gameEpoch = new Date("2016-01-01T00:00:00Z");

    React.useEffect(() => {
        if (!globalContext.core.crew.length) return;
        const crew = crewCopy(globalContext.core.crew).sort((a, b) => a.date_added.getTime() - b.date_added.getTime());
        const skoBuckets = {} as { [key: string]: SkoBucket[] };
        const flat = [] as SkoBucket[];
        const allHighs = [] as Highs[];
        const obtained = [] as string[];
        for (let c of crew) {
            if (!obtained.includes(c.obtained)) obtained.push(c.obtained);

            const aggregates = Object.values(c.base_skills).map(skill => skillSum(skill));
            const epoch_day = Math.floor(((new Date(c.date_added)).getTime() - gameEpoch.getTime()) / (1000 * 60 * 60 * 24));

            [1, 2, 3].forEach((n) => {
                if (c.skill_order.length >= n) {
                    let skd = c.skill_order.slice(0, n);
                    let sko = skd.join(",");

                    let levels = skd.map(m => skillSum(c.base_skills[m]));
                    let aggregate_sum = levels.reduce((p, n) => p + n, 0);
                    let high = findHigh(epoch_day, skd, allHighs, c.max_rarity);
                    if (!high || high.aggregate_sum < aggregate_sum) {
                        allHighs.push({
                            crew: c,
                            skills: skd,
                            aggregates: levels,
                            epoch_day,
                            aggregate_sum,
                            rarity: c.max_rarity
                        });
                    }
                    skoBuckets[sko] ??= [];
                    skoBuckets[sko].push({
                        symbol: c.symbol,
                        aggregates,
                        epoch_day,
                        skills: skd,
                        rarity: c.max_rarity
                    });
                    flat.push({
                        symbol: c.symbol,
                        aggregates,
                        epoch_day,
                        skills: skd,
                        rarity: c.max_rarity
                    });
                }
            });
        }

        for (let rarity = 1; rarity <= 5; rarity++) {
            let curr = {} as { [key: string]: SkoBucket };
            flat.filter(f => f.rarity === rarity).forEach((entry) => {
                let key = entry.skills.join(",");
                if (curr[key]) curr[key].next = entry;
                entry.prev = curr[key];
                curr[key] = entry;
            });
        }

        obtained.sort();
        flat.sort((a, b) => b.epoch_day - a.epoch_day || b.rarity - a.rarity);

        setFilterConfig(filterConfig);
        setUniqueObtained(obtained);
        setFlatOrder(flat);
        setSkoBuckets(skoBuckets);
        setAllHighs(allHighs);

    }, [globalContext.core.crew]);

    React.useEffect(() => {
        let work: SkoBucket[] = [];
        if (flatOrder?.length) {
            work = [...flatOrder];
        }
        else {
            return;
        }

        if (work?.length) {
            work.sort((a, b) => b.epoch_day - a.epoch_day || b.rarity - a.rarity);

            let newdiffs = [] as EpochDiff[];
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
                    rarity: curr.rarity
                };
                let avgdiff = diff.skill_diffs.reduce((p, n) => p + n, 0) / diff.skill_diffs.length;
                if (avgdiff && diff.day_diff) diff.velocity = avgdiff / diff.day_diff;
                newdiffs.push(diff);
            }

            //newdiffs.reverse();

            setCrewCount([...new Set(work.map(w => w.symbol)) ].length);
            setEpochDiffs(newdiffs);
        }
    }, [flatOrder, filterConfig]);

    const contextData: IStatsContext = {
        allHighs,
        crewCount,
        displayMode,
        epochDiffs,
        filterConfig,
        flatOrder,
        setDisplayMode,
        setFilterConfig,
        setFlatOrder,
        skoBuckets,
        uniqueObtained,
    };

    return (
        <StatsContext.Provider value={contextData}>
            {children}
        </StatsContext.Provider>)

    function setFilterConfig(config: SkillFilterConfig) {
        internalSetFilterConfig(configSkillFilters(globalContext.core.crew, config));
    }

    function passObtained(symbol: string, obtained: string[]) {
        let fc = globalContext.core.crew.find(f => f.symbol === symbol);
        if (!fc) return false;
        if (obtained.includes(fc.obtained)) return true;
        if (obtained.includes("Event/Pack/Giveaway") && (fc.obtained === 'Mega' || fc.obtained === 'Event' || fc.obtained === 'Pack/Giveaway')) return true;
        if (obtained.includes("Event") && (fc.obtained === 'Event/Pack/Giveaway' || fc.obtained === 'Mega')) return true;
        if (obtained.includes("Pack/Giveaway") && fc.obtained === 'Event/Pack/Giveaway') return true;
        return false;
    }

}
