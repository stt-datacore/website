import React from "react";
import DataPageLayout from "../components/page/datapagelayout";
import { GlobalContext } from "../context/globalcontext";
import { getHighest, prettyObtained, skillSum } from "../utils/crewutils";
import { Dropdown, DropdownItemProps, Grid, Label, Table } from "semantic-ui-react";
import CONFIG from "../components/CONFIG";
import { AvatarView } from "../components/item_presenters/avatarview";
import { CrewMember } from "../model/crew";
import { ITableConfigRow, SearchableTable } from "../components/searchabletable";
import { StatLabel } from "../components/statlabel";
import { DEFAULT_MOBILE_WIDTH } from "../components/hovering/hoverstat";
import { CrewHoverStat } from "../components/hovering/crewhoverstat";
import { PlayerCrew } from "../model/player";


const skillIcon = (skill: string) => {
    return `${process.env.GATSBY_ASSETS_URL}/atlas/icon_${skill}.png`;
}

interface SkoBucket {
    symbol: string,
    aggregates: number[],
    epoch_day: number,
    skills: string[]
}

interface PassDiff {
    symbols: string[],
    epoch_days: number[],
    day_diff: number,
    skill_diffs: number[],
    skills: string[],
    velocity: number,
    aggregates: number[][]
};

type Highs = { crew: CrewMember, aggregates: number[], aggregate_sum: number, epoch_day: number, skills: string[] };

function findHigh(epoch_day: number, skills: string[], data: Highs[], day_only = false) {
    let ssj = skills.join();
    data.sort((a, b) => b.epoch_day - a.epoch_day);
    return data.find(f => f.epoch_day <= epoch_day && (day_only || f.skills.join() === ssj));
}

const StatTrends = () => {
    const globalContext = React.useContext(GlobalContext);
    const crew = [...globalContext.core.crew].sort((a, b) => a.date_added.getTime() - b.date_added.getTime());
    const { t, tfmt } = globalContext.localized;
    const [allHighs, setAllHighs] = React.useState([] as Highs[]);

    const [skoBuckets, setSkoBuckets] = React.useState({} as {[key:string]: SkoBucket[]});
    const [flatOrder, setFlatOrder] = React.useState([] as SkoBucket[]);
    const [skillKey, setSkillKey] = React.useState("");
    const [passDiffs, setPassDiffs] = React.useState([] as PassDiff[]);
    const [avgVelocity, setAvgVelocity] = React.useState(0);
    const [meanVelocity, setMeanVelocity] = React.useState(0);
    const [avgDaysBetween, setAvgDaysBetween] = React.useState(0);
    const [meanDaysBetween, setMeanDaysBetween] = React.useState(0);
    const [uniqueObtained, setUniqueObtained] = React.useState([] as string[]);
    const [obtainedFilter, setObtainedFilter] = React.useState([] as string[]);
    const [crewCount, setCrewCount] = React.useState(0);
    const gameEpoch = new Date("2016-01-01T00:00:00Z");

    React.useEffect(() => {
        const skoBuckets = {} as {[key:string]: SkoBucket[]};
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

    const skillOpts = [] as DropdownItemProps[];

    Object.keys(skoBuckets).forEach((key) => {
        let sp = key.split(",").map(k => CONFIG.SKILLS[k]);
        while (sp.length < 3) sp.push('*')
        skillOpts.push({
            key: key,
            value: key,
            text: sp.join(" / "),
            content: <div>
                <div>{sp.join(" / ")}</div>
                <div className='ui segment' style={{backgroundColor: 'navy', padding: '0.5em', display: 'inline-block', marginTop: '0.25em', marginLeft: 0 }}>{skoBuckets[key].length}  {t('base.crewmen')}</div>
            </div>
        });
    });

    skillOpts.sort((a, b) => {
        let r = 0;
        if (!r) r = skoBuckets[b.key].length - skoBuckets[a.key].length;
        if (!r) r = (a.text! as string).localeCompare(b.text! as string);
        return r;
    })

    const obtainedOpts = [] as DropdownItemProps[];

    for (let obtained of uniqueObtained) {
        obtainedOpts.push({
            key: obtained,
            value: obtained,
            text: prettyObtained({ obtained } as PlayerCrew, t) || obtained
        })
    }

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

    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
    const flexCol: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};
    const statsStyle: React.CSSProperties = { width: '100%', height: '3em', margin: 0 };

    const preskill = skillKey.split(",").filter(f => f);
    const skillDecors = [] as JSX.Element[];

    if (skillKey.trim()) {
        preskill.forEach((text) => {
            if (!text) return;
            if (skillDecors.length) skillDecors.push(<>&nbsp;/&nbsp;</>);
            skillDecors.push(<span>
                <img src={skillIcon(text)} style={{height: '0.75em'}} />&nbsp;
                {CONFIG.SKILLS_SHORT.find(f => f.name === text)?.short}
            </span>)
        })
    }

    if (preskill.length) {
        while(preskill.length < 3) {
            preskill.push('*');
            skillDecors.push(<span>&nbsp;/&nbsp;*</span>);
        }
    }
    else {
        skillDecors.push(<span>{t('roster_summary.skills.combos.all')}</span>)
    }

    const shortSkillTitle = preskill.map(m => CONFIG.SKILLS_SHORT.find(f => f.name === m)?.short ?? m)
            .join(" / ").trim() || t('roster_summary.skills.combos.all');

    return <DataPageLayout pageTitle={t('stat_trends.title')} pageDescription={t('stat_trends.description')}>
        <div>
            <CrewHoverStat targetGroup="stat_trends_crew" />
            <div style={{...flexRow, margin: '1em 0'}}>
                <div style={{...flexCol, alignItems: 'flex-start', textAlign: 'left'}}>
                    <span>{t('global.obtained')}</span>
                    <Dropdown
                        placeholder={t('global.obtained')}
                        selection
                        clearable
                        multiple
                        value={obtainedFilter}
                        options={obtainedOpts}
                        onChange={(e, { value }) => setObtainedFilter(value as string[])}
                        />
                </div>
                <div style={{...flexCol, alignItems: 'flex-start', textAlign: 'left'}}>
                    <span>{t('quipment_dropdowns.mode.skill_order')}</span>
                    <Dropdown
                        placeholder={t('quipment_dropdowns.mode.skill_order')}
                        selection
                        clearable
                        value={skillKey}
                        options={skillOpts}
                        onChange={(e, { value }) => setSkillKey(value as string)}
                        />
                </div>
            </div>
            <h3>
            {tfmt('global.viewing_stats_for_x', {
                        x: <b style={{textDecoration: 'underline'}}>{shortSkillTitle}</b>
                    })}<div style={{height: '1em'}} />
            </h3>
            <div className="ui segment">
                <Label style={{textAlign: 'center'}}>
                    <h2>{skillDecors}</h2>
                    <div className='ui segment' style={{backgroundColor: 'navy'}}>{crewCount} {t('base.crewmen')}</div>
                </Label>
                <Grid style={{margin: '1em -1em', gap: '0'}}>
                    <Grid.Row style={{padding: '0.5em'}}>
                        <Grid.Column width={gridWidth} style={{padding: '0 0.5em'}}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.average_velocity')} value={avgVelocity?.toFixed(2)} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{padding: '0 0.5em'}}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.average_time_between_releases')}
                                value={t('duration.n_days', { days: avgDaysBetween?.toFixed() })} />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row style={{padding: '0.5em'}}>
                        <Grid.Column width={gridWidth} style={{padding: '0 0.5em'}}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.mean_velocity')} value={meanVelocity?.toFixed(2)} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{padding: '0 0.5em'}}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.mean_time_between_releases')}
                                value={t('duration.n_days', { days: meanDaysBetween?.toFixed() })} />
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row style={{padding: '0.5em'}}>
                        <Grid.Column width={gridWidth} style={{padding: '0 0.5em'}}>
                            <StatLabel style={statsStyle} title={t('stat_trends.stats.last_release')} value={crew.find(f => f.symbol === passDiffs[0]?.symbols[0])?.date_added?.toDateString() || ''} />
                        </Grid.Column>
                        <Grid.Column width={gridWidth} style={{padding: '0 0.5em'}}>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </div>

            <StatTrendsTable skillKey={skillKey} allHighs={allHighs} passDiffs={passDiffs} />
        </div>
    </DataPageLayout>
}

interface StatTrendsTableProps {
    passDiffs: PassDiff[];
    allHighs: Highs[];
    skillKey: string;
}

const StatTrendsTable = (props: StatTrendsTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { passDiffs, allHighs, skillKey } = props;

    const gameEpoch = new Date("2016-01-01T00:00:00Z");
    const nowDate = new Date();
    const daysFromEpoch = Math.floor((nowDate.getTime() - gameEpoch.getTime()) / (1000 * 60 * 60 * 24));

    const flexRow: React.CSSProperties = {display:'flex', flexDirection: 'row', alignItems:'center', justifyContent: 'flex-start', gap: '2em'};
    const flexCol: React.CSSProperties = {display:'flex', flexDirection: 'column', alignItems:'center', justifyContent: 'center', gap: '0.25em'};

    const sortAg = (a: PassDiff, b: PassDiff, idx: number) => a.aggregates[idx].reduce((p, n) => p + n, 0) - b.aggregates[idx].reduce((p, n) => p + n, 0);
    const tableConfig = [
        { width: 1, column: 'symbol[0]', title: t('stat_trends.columns.recent_crew'), customCompare: (a, b) => sortAg(a, b, 0) },
        { width: 1, column: 'symbol[1]', title: t('stat_trends.columns.prior_crew'), customCompare: (a, b) => sortAg(a, b, 1) },
        {
            width: 1,
            column: 'epoch_day',
            title: t('stat_trends.columns.epoch_day'),
            customCompare: (a: PassDiff, b: PassDiff) => {
                let r = a.epoch_days[0] - b.epoch_days[0];
                if (!r) r = a.epoch_days[1] - b.epoch_days[1];
                return r;
            }
        },
        { width: 1, column: 'day_diff', title: t('stat_trends.columns.day_diff') },
        { width: 1, column: 'velocity', title: t('stat_trends.columns.velocity') },

    ] as ITableConfigRow[]
    if (skillKey) {
        tableConfig.push({
            width: 1,
            column: 'skill_diffs',
            title: t('stat_trends.columns.skill_diffs'),
            customCompare: (a: PassDiff, b: PassDiff) => {
                return a.skill_diffs.reduce((p, n) => p + n, 0) - b.skill_diffs.reduce((p, n) => p + n, 0)
            }
        });
    }
    return (<SearchableTable
                config={tableConfig}
                data={passDiffs}
                renderTableRow={(row, idx) => renderTableRow(row, idx!)}
                filterRow={filterRow}
                />)

    function filterRow(row: any, filter: any, filterType?: string) {
        return true;
    }

    function renderTableRow(diff: PassDiff, idx: number) {

        const crews = diff.symbols.map(m => crew.find(f => f.symbol === m)!);
        const fhigh = findHigh(diff.epoch_days[0], skillKey ? diff.skills.slice(0, diff.aggregates[0].length) : [], allHighs, !skillKey);
        const newhigh = fhigh?.epoch_day === diff.epoch_days[0];

        return <Table.Row key={`passIdf_${idx}`}>
            <Table.Cell style={{textAlign: 'center'}}>
            <div style={flexRow}>
                <div style={{ ...flexCol, width: '15em'}}>
                    <AvatarView
                        item={crews[0]}
                        mode='crew'
                        symbol={diff.symbols[0]}
                        size={64}
                        targetGroup="stat_trends_crew"
                        />
                    <span>
                        {crews[0].name}
                    </span>
                    {newhigh && <Label style={{margin: '0.5em 0'}} color='blue'>{t('stat_trends.new_high')}</Label>}
                    <div style={{...flexRow, justifyContent: 'space-evenly'}}>
                        {crews[0].skill_order.map(skill => <img src={`${skillIcon(skill)}`} style={{height: '1em'}} />)}
                    </div>
                    <i>({t('stat_trends.released_n_days_ago', {
                        n: (daysFromEpoch - diff.epoch_days[0]).toLocaleString()
                    })})</i>
                </div>
            </div>
            </Table.Cell>
            <Table.Cell style={{textAlign: 'center'}}>
            <div style={flexRow}>
                <div style={{ ...flexCol, width: '15em'}}>
                    <AvatarView
                        item={crews[1]}
                        mode='crew'
                        symbol={diff.symbols[1]}
                        size={64}
                        targetGroup="stat_trends_crew"
                        />
                    {crews[1].name}
                    <div style={{...flexRow, justifyContent: 'space-evenly'}}>
                        {crews[1].skill_order.map(skill => <img src={`${skillIcon(skill)}`} style={{height: '1em'}} />)}
                    </div>
                    <i>({t('stat_trends.released_n_days_ago', {
                        n: (daysFromEpoch - diff.epoch_days[1]).toLocaleString()
                    })})</i>
                </div>
            </div>
            </Table.Cell>
            <Table.Cell>
                {diff.epoch_days[0].toLocaleString()}
            </Table.Cell>
            <Table.Cell>
                {t('duration.n_days', { days: diff.day_diff.toLocaleString() })}
            </Table.Cell>
            <Table.Cell>
                {diff.velocity.toFixed(4)}
            </Table.Cell>
            {!!skillKey && <Table.Cell>
            <div style={flexRow}>
                {diff.skill_diffs.map((n, idx) => {
                    return <div style={flexCol}>
                        <img src={`${skillIcon(diff.skills[idx])}`} style={{height: '1em'}} />
                        <span>{CONFIG.SKILLS_SHORT.find(sk => sk.name === diff.skills[idx])?.short}</span>
                        <span>{n}</span>
                    </div>
                })}
            </div>
            </Table.Cell>}
        </Table.Row>

    }

}


export default StatTrends;