import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { Button, Grid, Icon, Label, Message, Step } from "semantic-ui-react";
import CONFIG from "../CONFIG";
import { StatLabel } from "../statlabel";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { filterEpochDiffs, filterFlatData, formatElapsedDays, makeFilterCombos, skillIcon } from './utils';
import { StatTrendsTable } from "./tables/releasetable";
import { StatsPrefsPanel } from "./prefspanel";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { StatsContext } from "./dataprovider";
import { Skill } from "../../model/crew";
import { ChartsView } from "./chartsview";
import { EpochDiff } from "./model";
import { TraitStatsTable } from "./tables/traittable";
import { ItemStatsTable } from "./tables/itemtable";
import { PortalUpdateTable } from "./tables/portal_update";

export const StatTrendsComponent = () => {
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const crew = [...globalContext.core.crew].sort((a, b) => a.date_added.getTime() - b.date_added.getTime());
    const { t } = globalContext.localized;

    const [totalPowerDiff, setTotalPowerDiff] = React.useState([] as (Skill & { rarity: number})[]);
    const [avgVelocity, setAvgVelocity] = React.useState(0);
    const [meanVelocity, setMeanVelocity] = React.useState(0);
    const [avgDaysBetween, setAvgDaysBetween] = React.useState(0);
    const [meanDaysBetween, setMeanDaysBetween] = React.useState(0);

    const { epochDiffs: outerDiffs, displayMode, setDisplayMode, filterConfig, flatOrder: outerOrder } = statsContext;

    const [epochDiffs, setEpochDiffs] = React.useState<EpochDiff[]>([]);
    const [crewCount, setCrewCount] = React.useState(0);
    const [refresh, setRefresh] = React.useState(false);

    React.useEffect(() => {
        const filterDiffs = filterEpochDiffs(filterConfig, outerDiffs);

        if (filterDiffs?.length) {
            const vels = filterDiffs.map(diff => diff.velocity);
            vels.sort((a, b) => a - b);
            const days = filterDiffs.map(diff => diff.day_diff);
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
        setEpochDiffs(filterDiffs);
    }, [outerDiffs, filterConfig]);

    React.useEffect(() => {
        const skilldiffs = [] as (Skill & { rarity: number })[];
        const byTime = filterFlatData(filterConfig, outerOrder).sort((a, b) => a.epoch_day - b.epoch_day);

        for (let rarity = 1; rarity <= 5; rarity++) {
            [0, 1, 2].forEach((skillPos) => {
                Object.keys(CONFIG.SKILLS).forEach((skill) => {
                    let founddiff = skilldiffs.find(sd => sd.rarity === rarity && sd.skill === skill);
                    if (founddiff) return;

                    let older = byTime.findIndex(fi => fi.rarity === rarity && fi.skills.length > skillPos && fi.skills[skillPos] === skill);
                    let newer = byTime.findLastIndex(fi => fi.rarity === rarity && fi.skills.length > skillPos && fi.skills[skillPos] === skill);

                    if (newer >= 0 && older >= 0) {
                        let oldval = byTime[older].aggregates[skillPos];
                        let newval = byTime[newer].aggregates[skillPos];

                        let diff = newval - oldval;

                        skilldiffs.push({
                            core: diff,
                            skill,
                            range_max: 0,
                            range_min: 0,
                            rarity: rarity
                        });
                    }
                });
            });
        }

        const uniqueSymbols = [...new Set(byTime.map(m => m.symbol))];
        setCrewCount(uniqueSymbols.length);
        setTotalPowerDiff(skilldiffs);
    }, [outerOrder, filterConfig]);

    const gridWidth = 8;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const statsStyle: React.CSSProperties = { width: '100%', height: '3em', margin: 0 };
    const skillDecors = [] as JSX.Element[];

    let sst = '';

    if (filterConfig.primary.length || filterConfig.secondary.length || filterConfig.tertiary.length) {
        const fcs = makeFilterCombos(filterConfig, false);
        fcs.forEach((skillKey) => {
            const preskill = skillKey.split(",").filter(f => f);
            if (skillKey.trim()) {
                const newelem = [] as JSX.Element[];
                preskill.forEach((text, idx) => {
                    if (!text) return;
                    if (idx) newelem.push(<>&nbsp;/&nbsp;</>);
                    newelem.push(<span>
                        {text !== '*' && <><img src={skillIcon(text)} style={{ height: '0.75em' }} />&nbsp;
                        {CONFIG.SKILLS_SHORT.find(f => f.name === text)?.short}</>}
                        {text === '*' ? '*' : ''}
                    </span>)
                });
                skillDecors.push(<Label color='green' style={{border: '1px solid gray', borderRadius: '1em'}}>{newelem}</Label>)
            }

            if (sst) sst += "; ";
            sst += preskill.map(m => CONFIG.SKILLS_SHORT.find(f => f.name === m)?.short ?? m)
                .join(" / ").trim();

        });
    }
    if (!sst) skillDecors.push(<span>{t('roster_summary.skills.combos.all')}</span>);

    return (
            <div>
                <Message color='orange'>
                    <Message.Header>
                        {t('global.work_in_progress.title')}
                    </Message.Header>
                    <Message.Content>
                        {t('global.work_in_progress.heading')}
                    </Message.Content>

                </Message>
                <CrewHoverStat targetGroup="stat_trends_crew" />

                <Step.Group fluid>
                    <Step active={displayMode === 'crew'} onClick={() => setDisplayMode('crew')}
                        style={{width: isMobile ? undefined : '20%'}}>
                        <Step.Title>{t('stat_trends.sections.crew.title')}</Step.Title>
                        <Step.Description>{t('stat_trends.sections.crew.description')}</Step.Description>
                    </Step>
                    <Step active={displayMode === 'traits'} onClick={() => setDisplayMode('traits')}
                        style={{width: isMobile ? undefined : '20%'}}>
                        <Step.Title>{t('stat_trends.sections.traits.title')}</Step.Title>
                        <Step.Description>{t('stat_trends.sections.traits.description')}</Step.Description>
                    </Step>
                    <Step active={displayMode === 'portal_update'} onClick={() => setDisplayMode('portal_update')}
                        style={{width: isMobile ? undefined : '20%'}}>
                        <Step.Title>{t('stat_trends.sections.portal_update.title')}</Step.Title>
                        <Step.Description>{t('stat_trends.sections.portal_update.description')}</Step.Description>
                    </Step>
                    <Step active={displayMode === 'items'} onClick={() => setDisplayMode('items')}
                        style={{width: isMobile ? undefined : '20%'}}>

                        <Step.Title>
                            {t('stat_trends.sections.items.title')}
                            <Label corner='right'>
                                <Icon name='refresh' style={{cursor: 'pointer'}} onClick={()=> setRefresh(true)} />
                            </Label>
                        </Step.Title>
                        <Step.Description>{t('stat_trends.sections.items.description')}</Step.Description>
                    </Step>
                    <Step active={displayMode === 'graphs'} onClick={() => setDisplayMode('graphs')}
                        style={{width: isMobile ? undefined : '20%'}}>
                        <Step.Title>{t('stat_trends.sections.graphs.title')}</Step.Title>
                        <Step.Description>{t('stat_trends.sections.graphs.description')}</Step.Description>
                    </Step>
                </Step.Group>

                {!['traits', 'items', 'portal_update'].includes(displayMode) && <React.Fragment>
                    <StatsPrefsPanel />
                    {renderStatsInfo()}
                </React.Fragment>}

                {displayMode === 'crew' && <StatTrendsTable prefilteredDiffs={epochDiffs} />}
                {displayMode === 'traits' && <TraitStatsTable />}
                {displayMode === 'items' && <ItemStatsTable refresh={refresh} setRefresh={setRefresh} />}
                {displayMode === 'graphs' && <ChartsView />}
                {displayMode === 'portal_update' && <PortalUpdateTable />}
            </div>)

    function renderStatsInfo() {
        const useRarities = filterConfig.rarity.length ? filterConfig.rarity : [1,2,3,4,5];

        return (
            <div className="ui segment">
                <Grid style={{ margin: '1em -1em', gap: '0' }}>
                    <Grid.Row style={{ padding: '0.5em' }}>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em', height: '100%' }}>
                            <Label style={{ textAlign: 'center', width: "100%", height: '100%' }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'space-evenly',
                                    height: '100%',
                                    gap: '0.5em'
                                }}>
                                <div style={{fontSize: '2em'}}>{skillDecors}</div>
                                <Label color='blue'>
                                    {crewCount.toLocaleString()} {t('base.crewmen')}
                                </Label>
                                </div>
                            </Label>
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em', height: '100%'  }}>
                            <Label style={{ textAlign: 'center', width: "100%", height: '100%' }}>
                            <h2>{t('stat_trends.total_power_difference')}</h2>
                            {useRarities.map((rarity, idx) =><div key={`power_diff_rarity_head_${rarity}`}>
                                <h4 style={{marginTop: idx ? '1em' : undefined, color:CONFIG.RARITIES[rarity].color}}>{CONFIG.RARITIES[rarity].name}</h4>
                                <Label color='blue' className='ui segment' style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap',
                                    gap: '1em', marginBottom: idx === useRarities.length - 1 ? '0.5em' : undefined
                                    }}>
                                    {totalPowerDiff.filter(f => f.rarity === rarity).map((skill) => {
                                        return <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.5em'}}>
                                            <img src={skillIcon(skill.skill)} style={{height: '1.2em'}} />
                                            {skill.core > 0 ? "+" : ""}{skill.core.toFixed(2)}
                                        </div>
                                    })}
                                </Label>
                            </div>)}
                            </Label>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row style={{ padding: '0.5em' }}>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.average_velocity')} value={avgVelocity?.toFixed(2)} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.average_time_between_releases')}
                                value={formatElapsedDays(avgDaysBetween, t)} />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row style={{ padding: '0.5em' }}>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.mean_velocity')} value={meanVelocity?.toFixed(2)} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.mean_time_between_releases')}
                                value={formatElapsedDays(meanDaysBetween, t)} />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row style={{ padding: '0.5em' }}>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.last_release')} value={crew.find(f => f.symbol === epochDiffs[0]?.symbols[0])?.date_added?.toDateString() || ''} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </div>)

    }
}
