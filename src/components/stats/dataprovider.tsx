import React from 'react';
import { EpochDiff, Highs, IStatsContext, SkillFilterConfig, SkoBucket, StatsDisplayMode } from './model';
import { useStateWithStorage } from '../../utils/storage';
import { GlobalContext } from '../../context/globalcontext';
import { crewCopy, skillSum } from '../../utils/crewutils';
import { configSkillFilters, dateToEpoch, findHigh, passObtained } from './utils';
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
    const { crew: globalCrew } = globalContext.core;
    const [displayMode, setDisplayMode] = useStateWithStorage<StatsDisplayMode>(`stats_display_mode`, 'crew', { rememberForever: true });
    const [filterConfig, internalSetFilterConfig] = useStateWithStorage<SkillFilterConfig>(`stats_page_skill_filter_config`, defaultContextData.filterConfig, { rememberForever: true });

    const [allHighs, setAllHighs] = React.useState([] as Highs[]);
    const [skoBuckets, setSkoBuckets] = React.useState({} as { [key: string]: SkoBucket[] });
    const [flatOrder, setFlatOrder] = React.useState([] as SkoBucket[]);
    const [epochDiffs, setEpochDiffs] = React.useState([] as EpochDiff[]);
    const [uniqueObtained, setUniqueObtained] = React.useState([] as string[]);
    const [masterCrew, setMasterCrew] = React.useState<CrewMember[]>([]);
    const [prefiteredCrew, setPrefilteredCrew] = React.useState<CrewMember[]>([]);

    React.useEffect(() => {
        if (!globalCrew.length) return;
        const obtainlist = [] as string[];

        for (let c of globalCrew) {
            if (!obtainlist.includes(c.obtained)) obtainlist.push(c.obtained);
        }
        obtainlist.sort();
        const crew = crewCopy(globalCrew)
            .sort((a, b) => a.date_added.getTime() - b.date_added.getTime());

        setUniqueObtained(obtainlist);
        setMasterCrew(crew);
        setFilterConfig(filterConfig);
    }, [globalCrew]);

    React.useEffect(() => {
        if (!masterCrew.length) return;
        const filteredCrew = masterCrew
            .filter(c => !filterConfig.obtainedFilter.length || passObtained(c, filterConfig.obtainedFilter))
            .filter(c => {
                if (filterConfig.start_date) {
                    let d = new Date(filterConfig.start_date);
                    if (c.date_added.getTime() < d.getTime()) return false;
                }
                if (filterConfig.end_date) {
                    let d = new Date(filterConfig.end_date);
                    if (c.date_added.getTime() > d.getTime()) return false;
                }
                return true;
            })
        setPrefilteredCrew(filteredCrew);
    }, [masterCrew, filterConfig]);

    React.useEffect(() => {
        if (!prefiteredCrew.length) return;
        const crew = prefiteredCrew;
        const skoBuckets = {} as { [key: string]: SkoBucket[] };
        const flat = [] as SkoBucket[];
        const allHighs = [] as Highs[];
        const obtainlist = [] as string[];
        for (let c of crew) {
            if (!obtainlist.includes(c.obtained)) obtainlist.push(c.obtained);
            const aggregates = Object.values(c.base_skills).map(skill => skillSum(skill));
            const epoch_day = dateToEpoch(c.date_added);

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
                        rarity: c.max_rarity,
                        crew: c
                    });
                    flat.push({
                        symbol: c.symbol,
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
            let curr = {} as { [key: string]: SkoBucket };
            flat.filter(f => f.rarity === rarity).forEach((entry) => {
                let key = entry.skills.join(",");
                if (curr[key]) curr[key].next = entry;
                entry.prev = curr[key];
                curr[key] = entry;
            });
        }

        flat.sort((a, b) => b.epoch_day - a.epoch_day || b.rarity - a.rarity);
        setFlatOrder(flat);
        setSkoBuckets(skoBuckets);
        setAllHighs(allHighs);
    }, [prefiteredCrew]);

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
                    rarity: curr.rarity,
                    crew: [next.crew, curr.crew]
                };
                let avgdiff = diff.skill_diffs.reduce((p, n) => p + n, 0) / diff.skill_diffs.length;
                if (avgdiff && diff.day_diff) diff.velocity = avgdiff / diff.day_diff;
                newdiffs.push(diff);
            }

            setEpochDiffs(newdiffs);
        }
    }, [flatOrder]);

    const contextData: IStatsContext = {
        allHighs,
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
}
