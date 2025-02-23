import React from 'react';
import { EpochDiff, Highs, IStatsContext, SkillFilterConfig, EpochItem, StatsDisplayMode } from './model';
import { useStateWithStorage } from '../../utils/storage';
import { GlobalContext } from '../../context/globalcontext';
import { crewCopy, skillSum } from '../../utils/crewutils';
import { configSkillFilters, createStatsDataSet, dateToEpoch, findHigh, passObtained } from './utils';
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
    const [skoBuckets, setSkoBuckets] = React.useState({} as { [key: string]: EpochItem[] });
    const [flatOrder, setFlatOrder] = React.useState([] as EpochItem[]);
    const [epochDiffs, setEpochDiffs] = React.useState([] as EpochDiff[]);
    const [uniqueObtained, setUniqueObtained] = React.useState([] as string[]);
    const [masterCrew, setMasterCrew] = React.useState<CrewMember[]>([]);
    const [prefilteredCrew, setPrefilteredCrew] = React.useState<CrewMember[]>([]);

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
        if (!prefilteredCrew.length) return;

        const {
            highs: allHighs,
            flatData: flat,
            skoBuckets,
            obtainedList: obtainlist,
            epochDiffs
        } = createStatsDataSet(prefilteredCrew);

        setFlatOrder(flat);
        setSkoBuckets(skoBuckets);
        setAllHighs(allHighs);
        setUniqueObtained(obtainlist);
        setEpochDiffs(epochDiffs);
    }, [prefilteredCrew]);

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
