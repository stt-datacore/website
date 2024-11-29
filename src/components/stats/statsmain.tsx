import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { skillSum } from "../../utils/crewutils";
import { Grid, Label, Step } from "semantic-ui-react";
import CONFIG from "../CONFIG";
import { StatLabel } from "../statlabel";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { Highs, SkoBucket, EpochDiff, StatsDisplayMode, IStatsContext } from "./model";
import { findHigh, skillIcon } from './utils';
import { StatTrendsTable } from "./table";
import { StatsPrefsPanel } from "./prefspanel";
import { useStateWithStorage } from "../../utils/storage";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { StatsContext } from "./dataprovider";



export const StatTrendsComponent = () => {
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const crew = [...globalContext.core.crew].sort((a, b) => a.date_added.getTime() - b.date_added.getTime());
    const { t, tfmt } = globalContext.localized;

    const [avgVelocity, setAvgVelocity] = React.useState(0);
    const [meanVelocity, setMeanVelocity] = React.useState(0);
    const [avgDaysBetween, setAvgDaysBetween] = React.useState(0);
    const [meanDaysBetween, setMeanDaysBetween] = React.useState(0);
    const { epochDiffs, skillKey, displayMode, setDisplayMode, crewCount } = statsContext;

    React.useEffect(() => {
        if (epochDiffs?.length) {
            const vels = epochDiffs.map(diff => diff.velocity);
            vels.sort((a, b) => a - b);
            const days = epochDiffs.map(diff => diff.day_diff);
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
    }, [epochDiffs]);

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

    return (
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
                <StatTrendsTable skillKey={skillKey} />}

            </div>)

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
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.last_release')} value={crew.find(f => f.symbol === epochDiffs[0]?.symbols[0])?.date_added?.toDateString() || ''} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{ padding: '0 0.5em' }}>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </div>)

    }
}
