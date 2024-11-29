import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { skillSum } from "../../utils/crewutils";
import { Grid, Label, Step, StepGroup } from "semantic-ui-react";
import CONFIG from "../CONFIG";
import { StatLabel } from "../statlabel";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { Highs, SkoBucket, PassDiff, findHigh, skillIcon } from "./model";
import { StatTrendsTable } from "./table";
import { StatsPrefsPanel } from "./prefspanel";
import { useStateWithStorage } from "../../utils/storage";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";

export type StatsDisplayMode = 'crew' | 'graphs';
export interface IStatsContext {
    skillKey: string;
    setSkillKey: (value: string) => void;
    flatOrder: SkoBucket[];
    setFlatOrder: (value: SkoBucket[]) => void;
    obtainedFilter?: string[];
    setObtainedFilter: (value?: string[]) => void;
    uniqueObtained: string[]
    skoBuckets: { [key: string]: SkoBucket[] },
    displayMode: StatsDisplayMode;
    setDisplayMode: (value: StatsDisplayMode) => void
}

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
    setDisplayMode: () => false
} as IStatsContext;

export const StatsContext = React.createContext(defaultContextData);

export const StatTrendsComponent = () => {
    const globalContext = React.useContext(GlobalContext);
    const crew = [...globalContext.core.crew].sort((a, b) => a.date_added.getTime() - b.date_added.getTime());
    const { t, tfmt } = globalContext.localized;
    const [allHighs, setAllHighs] = React.useState([] as Highs[]);

    const [displayMode, setDisplayMode] = useStateWithStorage<StatsDisplayMode>(`stats_display_mode`, 'crew');
    const [skoBuckets, setSkoBuckets] = React.useState({} as { [key: string]: SkoBucket[] });
    const [flatOrder, setFlatOrder] = React.useState([] as SkoBucket[]);
    const [skillKey, setSkillKey] = React.useState("");
    const [passDiffs, setPassDiffs] = React.useState([] as PassDiff[]);
    const [avgVelocity, setAvgVelocity] = React.useState(0);
    const [meanVelocity, setMeanVelocity] = React.useState(0);
    const [avgDaysBetween, setAvgDaysBetween] = React.useState(0);
    const [meanDaysBetween, setMeanDaysBetween] = React.useState(0);
    const [uniqueObtained, setUniqueObtained] = React.useState([] as string[]);
    const [obtainedFilter, setObtainedFilter] = React.useState([] as string[] | undefined);
    const [crewCount, setCrewCount] = React.useState(0);
    const gameEpoch = new Date("2016-01-01T00:00:00Z");

    React.useEffect(() => {
        const skoBuckets = {} as { [key: string]: SkoBucket[] };
        const flat = [] as SkoBucket[];
        const allHighs = [] as Highs[];
        const obtained = [] as string[];
        for (let c of crew) {
            if (!obtained.includes(c.obtained)) obtained.push(c.obtained);

            const aggregates = Object.values(c.base_skills).map(skill => skillSum(skill));
            const epoch_day = Math.floor(((new Date(c.date_added)).getTime() - gameEpoch.getTime()) / (1000 * 60 * 60 * 24));

            if (c.max_rarity !== 5) continue;

            [1, 2, 3].forEach((n) => {
                if (c.skill_order.length >= n) {
                    let skd = c.skill_order.slice(0, n);
                    let sko = skd.join(",");

                    let levels = skd.map(m => skillSum(c.base_skills[m]));
                    //let aggregate_sum = c.skill_order.map(m => skillSum(c.base_skills[m])).reduce((p, n) => p + n, 0);
                    let aggregate_sum = levels.reduce((p, n) => p + n, 0);
                    let high = findHigh(epoch_day, skd, allHighs);
                    if (!high || high.aggregate_sum < aggregate_sum) {
                        allHighs.push({
                            crew: c,
                            skills: skd,
                            aggregates: levels,
                            epoch_day,
                            aggregate_sum
                        });
                    }
                    if (c.symbol === 'quark_bar_owner_crew') {
                        console.log('break');
                    }
                    skoBuckets[sko] ??= [];
                    skoBuckets[sko].push({
                        symbol: c.symbol,
                        aggregates,
                        epoch_day,
                        skills: skd
                    });
                }
            });

            flat.push({
                symbol: c.symbol,
                aggregates,
                epoch_day,
                skills: c.skill_order
            });
        }
        obtained.sort();
        setUniqueObtained(obtained);
        setSkoBuckets(skoBuckets);
        setAllHighs(allHighs);
        flat.sort((a, b) => a.epoch_day - b.epoch_day);
        setFlatOrder(flat);
    }, [globalContext.core.crew]);

    const passObtained = (symbol: string, obtained: string[]) => {
        let fc = crew.find(f => f.symbol === symbol);
        if (!fc) return false;
        if (obtained.includes(fc.obtained)) return true;
        if (obtained.includes("Event/Pack/Giveaway") && (fc.obtained === 'Mega' || fc.obtained === 'Event' || fc.obtained === 'Pack/Giveaway')) return true;
        if (obtained.includes("Event") && (fc.obtained === 'Event/Pack/Giveaway' || fc.obtained === 'Mega')) return true;
        if (obtained.includes("Pack/Giveaway") && fc.obtained === 'Event/Pack/Giveaway') return true;
        return false;
    }

    React.useEffect(() => {
        let work: SkoBucket[] = [];
        if (skillKey && skoBuckets && Object.keys(skoBuckets).length) {
            work = skoBuckets[skillKey];
        }
        else if (flatOrder?.length) {
            work = flatOrder;
        }
        else {
            return;
        }

        if (obtainedFilter) work = work.filter(f => !obtainedFilter.length || passObtained(f.symbol, obtainedFilter));
        if (work?.length) {
            let tc = 1;
            work.sort((a, b) => a.epoch_day - b.epoch_day);
            let newdiffs = [] as PassDiff[];
            let c = work.length;
            let s = work[0].skills.length;
            for (let i = 1; i < c; i++) {
                tc++;
                let dd = work[i].epoch_day - work[i - 1].epoch_day;
                let sd = [] as number[];
                for (let j = 0; j < s; j++) {
                    sd.push(work[i].aggregates[j] - work[i - 1].aggregates[j]);
                }
                let diff: PassDiff = {
                    symbols: [work[i].symbol, work[i - 1].symbol],
                    day_diff: dd,
                    epoch_days: [work[i].epoch_day, work[i - 1].epoch_day],
                    skill_diffs: sd,
                    skills: work[0].skills,
                    velocity: 0,
                    aggregates: [work[i].aggregates, work[i - 1].aggregates]
                };
                let avgdiff = diff.skill_diffs.reduce((p, n) => p + n, 0) / diff.skill_diffs.length;
                if (avgdiff && diff.day_diff) diff.velocity = avgdiff / diff.day_diff;
                newdiffs.push(diff);
            }
            newdiffs.reverse();
            setCrewCount(tc);
            setPassDiffs(newdiffs);
        }
    }, [skillKey, skoBuckets, flatOrder, obtainedFilter]);

    React.useEffect(() => {
        if (passDiffs?.length) {
            const vels = passDiffs.map(diff => diff.velocity);
            vels.sort((a, b) => a - b);
            const days = passDiffs.map(diff => diff.day_diff);
            days.sort((a, b) => a - b);
            const avgDays = days.reduce((p, n) => p + n, 0) / vels.length;
            const avgVel = vels.reduce((p, n) => p + n, 0) / vels.length;
            let meanVel = avgVel;
            let meanDays = avgDays;
            if (vels.length > 1) {
                meanVel = vels[Math.floor(vels.length / 2)];
                meanDays = days[Math.floor(vels.length / 2)];
            }
            setAvgVelocity(avgVel);
            setMeanVelocity(meanVel);
            setAvgDaysBetween(avgDays);
            setMeanDaysBetween(meanDays);
        }
        else {
            setAvgVelocity(0);
            setMeanVelocity(0);
            setAvgDaysBetween(0);
            setMeanDaysBetween(0);
        }
    }, [passDiffs]);

    const gridWidth = 5;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const statsStyle: React.CSSProperties = { width: '100%', height: '3em', margin: 0 };

    const preskill = skillKey.split(",").filter(f => f);
    const skillDecors = [] as JSX.Element[];

    if (skillKey.trim()) {
        preskill.forEach((text) => {
            if (!text) return;
            if (skillDecors.length) skillDecors.push(<>&nbsp;/&nbsp;</>);
            skillDecors.push(<span>
                <img src={skillIcon(text)} style={{ height: '0.75em' }} />&nbsp;
                {CONFIG.SKILLS_SHORT.find(f => f.name === text)?.short}
            </span>)
        })
    }

    if (preskill.length) {
        while (preskill.length < 3) {
            preskill.push('*');
            skillDecors.push(<span>&nbsp;/&nbsp;*</span>);
        }
    }
    else {
        skillDecors.push(<span>{t('roster_summary.skills.combos.all')}</span>)
    }

    const shortSkillTitle = preskill.map(m => CONFIG.SKILLS_SHORT.find(f => f.name === m)?.short ?? m)
        .join(" / ").trim() || t('roster_summary.skills.combos.all');

    const contextData = {
        skillKey,
        setSkillKey,
        flatOrder,
        setFlatOrder,
        obtainedFilter,
        setObtainedFilter,
        skoBuckets,
        uniqueObtained,
        displayMode,
        setDisplayMode
    } as IStatsContext;

    return (
        <StatsContext.Provider value={contextData}>
            <div>
                <CrewHoverStat targetGroup="stat_trends_crew" />
                <StatsPrefsPanel />
                <h3>
                    {tfmt('global.viewing_stats_for_x', {
                        x: <b style={{ textDecoration: 'underline' }}>{shortSkillTitle}</b>
                    })}<div style={{ height: '1em' }} />
                </h3>
                {renderStatsInfo()}

                <Step.Group fluid>
                    <Step active={displayMode === 'crew'} onClick={() => setDisplayMode('crew')}
                        style={{width: isMobile ? undefined : '50%'}}>
                        <Step.Title>{t('stat_trends.sections.crew.title')}</Step.Title>
                        <Step.Description>{t('stat_trends.sections.crew.description')}</Step.Description>
                    </Step>
                    <Step active={displayMode === 'graphs'} onClick={() => setDisplayMode('graphs')}
                        style={{width: isMobile ? undefined : '50%'}}>
                        <Step.Title>{t('stat_trends.sections.graphs.title')}</Step.Title>
                        <Step.Description>{t('stat_trends.sections.graphs.description')}</Step.Description>
                    </Step>
                </Step.Group>
                {displayMode === 'crew' &&
                <StatTrendsTable skillKey={skillKey} allHighs={allHighs} passDiffs={passDiffs} />}

            </div>
        </StatsContext.Provider>)

    function renderStatsInfo() {
        return (
            <div className="ui segment">
                <Label style={{ textAlign: 'center' }}>
                    <h2>{skillDecors}</h2>
                    <div className='ui segment' style={{ backgroundColor: 'navy' }}>{crewCount} {t('base.crewmen')}</div>
                </Label>
                <Grid style={{ margin: '1em -1em', gap: '0' }}>
                    <Grid.Row style={{ padding: '0.5em' }}>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.average_velocity')} value={avgVelocity?.toFixed(2)} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.average_time_between_releases')}
                                value={t('duration.n_days', { days: avgDaysBetween?.toFixed() })} />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row style={{ padding: '0.5em' }}>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.mean_velocity')} value={meanVelocity?.toFixed(2)} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.mean_time_between_releases')}
                                value={t('duration.n_days', { days: meanDaysBetween?.toFixed() })} />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row style={{ padding: '0.5em' }}>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.last_release')} value={crew.find(f => f.symbol === passDiffs[0]?.symbols[0])?.date_added?.toDateString() || ''} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </div>)

    }
}
