import { Datum } from "@nivo/calendar";
import React from "react";
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { GraphPropsCommon, GraphSeries, SkillFilterConfig, SkillOrderDebutCrew } from "../model";
import { epochToDate, OptionsPanelFlexRow, OptionsPanelFlexColumn, skillIcon, SkillColors, dateToEpoch, getSkillOrderDebutData, keyToNames, statFilterCrew } from "../utils";
import { AreaBump, AreaBumpSerie, Bump, DefaultBumpDatum, ResponsiveAreaBump } from "@nivo/bump";

import themes from "../../nivo_themes";
import { crewCopy, shortToSkill } from "../../../utils/crewutils";
import { useStateWithStorage } from "../../../utils/storage";
import { Checkbox, Dropdown } from "semantic-ui-react";
import { printNCrew } from "../../../utils/misc";
import { SwarmPlot } from "@nivo/swarmplot";
import { CrewMember } from "../../../model/crew";
import { AvatarView } from "../../item_presenters/avatarview";
import { PointProps } from "@nivo/bump/dist/types/bump/Point";
import CONFIG from "../../CONFIG";

interface MapConfig {
    considerCounts: boolean;
    considerPower: boolean;
}

export const StatsCreepGraphs = (props: GraphPropsCommon) => {

    const { useFilters } = props;
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { filterConfig } = statsContext;

    const [areaSeries, setAreaSeries] = React.useState<AreaBumpSerie<Datum, any>[]>([]);
    const [bumpSeries, setBumpSeries] = React.useState<AreaBumpSerie<Datum, any>[]>([]);
    const [swarmSeries, setSwarmSeries] = React.useState<GraphSeries[]>([]);
    const [rarityCount, setRarityCount] = React.useState(0);
    const [config, setConfig] = useStateWithStorage<MapConfig>(`stats_skill_area_config`, { considerCounts: true, considerPower: true }, { rememberForever: true });
    const [graphType, setGraphType] = useStateWithStorage('stat_trends_power_creep_graph_type', 'areabump', { rememberForever: true });

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    React.useEffect(() => {
        if (!crew.length) return;

        const { series } = computeSwarmSeries(filterConfig, crew, useFilters);
        const bump = series.filter(f => (f.data as SkillOrderDebutCrew[]).some(c => c.new_high))
                    .map(c => {
                        let s = (c.data as SkillOrderDebutCrew[]).sort((a, b) => b.power - a.power);
                        return {
                            ...c,
                            data: s
                        }
                    });

        const areaSeries = [...new Set(series.map(m => m.id))].map(group => {
            return {
                id: group,
                data: series.filter(f => f.id === group).map(d => {
                    let b = 1;
                    if (config.considerCounts) b *= d.density;
                    if (config.considerPower) b *= (1 - (d.power / d.high_power));
                    d.y = b;
                    return d;
                })
            }
        });

        const bumpSeries = [...new Set(bump.map(m => m.id))].map(group => {
            return {
                id: group,
                data: series.filter(f => f.id === group).map(d => {
                    let b = 1;
                    if (config.considerCounts) b *= d.density;
                    if (config.considerPower) b *= d.high_power;
                    return { ...d, y: -b };
                })
            }
        });

        setBumpSeries(bumpSeries);
        setAreaSeries(areaSeries);
        setSwarmSeries(series);
        setRarityCount([...new Set(series.map(m => m.id))].length)
    }, [crew, filterConfig, useFilters, config]);

    const graphTypes = [
        { key: 'areabump', value: 'areabump', text: t('graph.area_bump') },
        { key: 'swarm', value: 'swarm', text: t('graph.swarm') },
    ];

    if (filterConfig.primary.length || filterConfig.secondary.length || filterConfig.tertiary.length) {
        graphTypes.push(
            { key: 'bump', value: 'bump', text: t('graph.bump') }
        )
    }
    else if (graphType === 'bump') {
        setGraphType('areabump');
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'stretch',
            alignItems: 'center',
            gap: '1em',
            margin: '1em 0'
        }}>
            {!!areaSeries?.length &&
                <div style={{ height: `${rarityCount * 3}em`, width: '100%' }}>
                    <div style={{ ...flexCol, alignSelf: 'flex-start', alignItems: 'flex-start', gap: '1em', margin: '1em 0' }}>
                        <Checkbox
                            label={t('stat_trends.graphs.map_skill_order_density')}
                            checked={config.considerCounts}
                            onChange={(e, { checked }) => setConfig({ ...config, considerCounts: !!checked })}
                        />

                        <Checkbox
                            label={t('stat_trends.graphs.map_skill_order_power')}
                            checked={config.considerPower}
                            onChange={(e, { checked }) => setConfig({ ...config, considerPower: !!checked })}
                        />
                        <div style={{...flexCol}}>
                            <span style={{alignSelf: 'flex-start'}}>{t('graph.type')}</span>
                            <Dropdown
                                selection
                                value={graphType}
                                options={graphTypes}
                                onChange={(e, { value }) => setGraphType(value as string)}
                            />
                        </div>
                    </div>
                    <div style={{overflowX: 'auto', overflowY: 'visible'}}>
                        {graphType === 'swarm' && renderSwarmPlot()}
                        {graphType === 'bump' && renderBumpGraph()}
                    </div>
                    {graphType === 'areabump' && renderAreaBumpGraph()}
                </div>}
        </div>)

    function renderAreaBumpTooltip(bump: GraphSeries[]) {
        let max = bump.map(m => m.high_power).reduce((p, n) => p > n ? p : n, 0);
        let min = bump.map(m => m.low_power).reduce((p, n) => n < p || !p ? n : p, 0);
        let inc = bump[bump.length - 1].density - bump[0].density;
        return <div className="ui segment" style={{...flexCol, zIndex: '1001'}}>
            <div style={{ ...flexRow, borderBottom: '2px solid ' + CONFIG.RARITIES[bump[0].rarity].color, padding: '0.25em 0', justifyContent: 'center', alignItems: 'center' }}>{bump[0].id.split(" / ").map((skill) => {
                return skill.replace(/ \(.+/, '').split("/").map(skill => {
                    let icon = skillIcon(shortToSkill(skill)!);
                    return <div key={`${skill}_bump_key_${bump.length}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={icon} style={{ height: '1em' }} />&nbsp;<span>{skill}</span></div>
                })
            })}</div>
            {t('stat_trends.graphs.population_increase')}: <b>{inc ? (inc).toLocaleString() : t('global.new')}</b>
            {t('stat_trends.graphs.power_creep')}: <b>{bump.length < 2 || !inc ? 'N/A' : `${Math.round((1 - (min / max)) * 100).toLocaleString()}%`}</b>
            {t('stat_trends.initial_release')}: <b>{epochToDate(bump[0].epoch_start).toLocaleDateString()}</b>
            {t('stat_trends.last_release')}: <b>{epochToDate(bump[bump.length - 1].epoch_end).toLocaleDateString()}</b>
        </div>
    }

    function renderSwarmTooltip(swarm: GraphSeries, high_crew = false) {
        let max = swarm.high_power;
        let min = swarm.low_power;
        let inc = swarm.density;
        let symbol = swarm.data?.find((f) => f.power === swarm.high_power)?.symbol;
        let crew = symbol ? globalContext.core.crew.find(f => f.symbol === symbol) : undefined;

        return (<div className="ui segment" style={{...flexCol, zIndex: '1001'}}>
            <div style={{ ...flexRow, borderBottom: '2px solid ' + CONFIG.RARITIES[swarm.rarity].color, padding: '0.25em 0', justifyContent: 'center', alignItems: 'center' }}>
                {swarm.id.split(" / ").map((skill) => {
                    return skill.replace(/ \(.+/, '').split("/").map(skill => {
                        let icon = skillIcon(shortToSkill(skill)!);
                        return <div key={`${skill}_bump_key_${swarm.density}+${swarm.power}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={icon} style={{ height: '1em' }} />&nbsp;<span>{skill}</span></div>
                    })
                })}
            </div>
            <span>{printNCrew(swarm.density, t)}</span>
            {/* {t('stat_trends.graphs.population_increase')}: <b>{inc ? (inc).toLocaleString() : t('global.new')}</b> */}
            {t('stat_trends.graphs.power_creep')}: <b>{!inc ? 'N/A' : `${Math.round((1 - (min / max)) * 100).toLocaleString()}%`}</b>
            {t('stat_trends.initial_release')}: <b>{epochToDate(swarm.epoch_start).toDateString()}</b>
            {t('stat_trends.last_release')}: <b>{epochToDate(swarm.epoch_end).toDateString()}</b>
            {!!crew && high_crew && <div style={flexCol}>
                <AvatarView
                    mode='crew'
                    item={crew}
                    size={48}
                    />
                <i>{crew.name}</i>
            </div>}
        </div>)
    }

    function renderAreaBumpGraph() {
        return (
            <ResponsiveAreaBump
                // width={1100}
                // height={1100}
                data={areaSeries}
                margin={{ top: 40, right: 120, bottom: 40, left: 40 }}
                spacing={8}
                theme={themes.dark}
                tooltip={(data) => {
                    const bump = data.serie.data.data as GraphSeries[];
                    if (bump) {
                        return renderAreaBumpTooltip(bump);
                    }
                    return <></>
                }}
                axisTop={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: -36,
                    truncateTickAt: 0
                }}
                axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: 32,
                    truncateTickAt: 0
                }}
            />)
    }

    function renderSwarmPlot() {
        return <SwarmPlot
            width={1100}
            height={1100}
            data={swarmSeries}
            groups={[...new Set(swarmSeries.map(m => m.group))]}
            groupBy="group"
            //identity="id"
            value="power"
            valueFormat=".2f"
            valueScale={{
                type: 'linear',
                min: swarmSeries.reduce((p, n) => n.power < p || !p ? n.power : p, 0) - 100,
                max: swarmSeries.reduce((p, n) => n.power > p ? n.power : p, 0) + 100,
                reverse: false
            }}
            size={{
                key: 'density',
                values: [
                    1,
                    40
                ],
                sizes: [
                    6,
                    20,
                ]
            }}
            colorBy="id"
            colors={(data) => SkillColors[shortToSkill(data.data.id.replace(/ \(.+/, '').split("/")[0])!]}
            //animate={false}
            theme={themes.dark}
            forceStrength={4}
            simulationIterations={100}
            borderColor={{
                from: 'color',
                modifiers: [
                    [
                        'darker',
                        0.6
                    ],
                    [
                        'opacity',
                        0.5
                    ]
                ]
            }}
            tooltip={(data) => {
                const swarm = data.data as any as GraphSeries;
                if (swarm) {
                    return renderSwarmTooltip(swarm);
                }
                return <></>
            }}
            margin={{ top: 200, right: 100, bottom: 80, left: 100 }}
            axisTop={{
                //orient: 'top',
                tickSize: 10,
                tickPadding: 5,
                tickRotation: 0,
                //legend: 'group if vertical, price if horizontal',
                legendPosition: 'middle',
                legendOffset: -46,
                truncateTickAt: 0
            }}
            axisRight={{
                //orient: 'right',
                tickSize: 10,
                tickPadding: 5,
                tickRotation: 0,
                //legend: 'price if vertical, group if horizontal',
                legendPosition: 'middle',
                legendOffset: 76,
                truncateTickAt: 0
            }}
            axisBottom={{
                //orient: 'bottom',
                tickSize: 10,
                tickPadding: 5,
                tickRotation: 0,
                //legend: 'group if vertical, price if horizontal',
                legendPosition: 'middle',
                legendOffset: 46,
                truncateTickAt: 0
            }}
            axisLeft={{
                //orient: 'left',
                tickSize: 10,
                tickPadding: 5,
                tickRotation: 0,
                //legend: 'price if vertical, group if horizontal',
                legendPosition: 'middle',
                legendOffset: -76,
                truncateTickAt: 0
            }}
        />
    }

    function renderBumpGraph() {
        return <Bump
            width={1100}
            height={1100}
            data={bumpSeries}
            colors={{ scheme: 'spectral' }}
            lineWidth={3}
            activeLineWidth={6}
            inactiveLineWidth={3}
            inactiveOpacity={0.15}
            axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: -36,
                truncateTickAt: 0
            }}
            axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 32,
                truncateTickAt: 0
            }}
            axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legendPosition: 'middle',
                legendOffset: -250,
                truncateTickAt: 0,
            }}
            axisRight={{
                // tickSize: 5,
                // tickPadding: 5,
                // tickRotation: 0,
                // legend: 'ranking',
                // legendPosition: 'middle',
                // legendOffset: -40,
                // truncateTickAt: 0

            }}
            layers={['grid', 'labels', 'lines', 'points']}
            margin={{ top: 200, right: 30, bottom: 40, left: 300 }}
            interpolation={'smooth'}
            xPadding={10}
            xOuterPadding={0}
            yOuterPadding={0}
            theme={themes.dark}
            opacity={1}
            activeOpacity={1}
            startLabel={(series) => series.id}
            startLabelPadding={40}
            startLabelTextColor={'white'}
            endLabel={(series) => ''}
            endLabelPadding={1}
            endLabelTextColor={'transparent'}
            enableGridX={true}
            enableGridY={true}
            isInteractive={true}
            defaultActiveSerieIds={[]}
            role={''}
            pointSize={10}
            activePointSize={10}
            inactivePointSize={10}
            pointBorderWidth={1}
            activePointBorderWidth={1}
            inactivePointBorderWidth={1}
            pointColor={{
                from: 'serie.color'
            }}
            pointBorderColor={{
                from: 'serie.color'
              }}
            //pointComponent={(props) => PointComponent(props)}
            useMesh={false}
            debugMesh={false}
            pointTooltip={(data) => {
                return renderSwarmTooltip(data.point.serie.data)
            }}
            lineTooltip={(data) => {
                return renderAreaBumpTooltip(data.serie.data.data)
            }}
            animate={true}
            renderWrapper={true}
        />
    }

    function computeSwarmSeries(filterConfig: SkillFilterConfig, crew: CrewMember[], useFilters = true) {
        const nowEpoch = dateToEpoch();
        const series = [] as GraphSeries[];
        const workCrew = useFilters ? statFilterCrew(filterConfig, crew, true) : crew;

        const data = getSkillOrderDebutData(workCrew);

        const startDay = filterConfig.start_date ? dateToEpoch(new Date(filterConfig.start_date)) : 0;
        const endDay = filterConfig.end_date ? dateToEpoch(new Date(filterConfig.end_date)) : nowEpoch;

        const totalYears = (epochToDate(endDay).getUTCFullYear() - epochToDate(startDay).getUTCFullYear()) + 1;

        let seglen = 0;

        if (endDay - startDay > (365 * 2)) {
            seglen = Math.ceil((endDay - startDay) / (totalYears + 1));
        }
        else if (endDay - startDay > 31)  {
            seglen = Math.ceil((endDay - startDay) / 4)
        }
        else {
            seglen = Math.ceil((endDay - startDay) / 7)
        }

        let segments = 0;

        for (let time = startDay; time <= endDay; time += seglen) {
            segments++;

            let timedata = data.filter(f =>
                f.epoch_day <= time + seglen
                && f.epoch_day <= endDay
            );
            let ed = epochToDate(Math.min(time + (seglen - 1), endDay));

            let newgroup = '';

            if (endDay - startDay > (365 * 2)) {
                newgroup = `${ed.getUTCFullYear()}`;
            }
            else if (endDay - startDay > 31)  {
                newgroup = `${ed.getUTCFullYear()}-${(ed.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            }
            else {
                newgroup = `${ed.getUTCFullYear()}-${(ed.getUTCMonth() + 1).toString().padStart(2, '0')}-${(ed.getUTCDate()).toString().padStart(2, '0')}`;
            }

            timedata.forEach((record) => {
                let newid = keyToNames(record.skill_order).join("/");
                if (!useFilters || filterConfig.rarity.length !== 1) {
                    newid += ` (${record.rarity})`;
                }
                let f = series.find(f => f.id === newid && f.group === newgroup.toString());
                if (!f) {
                    f = {
                        id: newid,
                        group: newgroup.toString(),
                        density: record.crew.length,
                        power: !record.crew.length ? 0 : record.crew.map(m => m.power).reduce((p, n) => p + n) / record.crew.length,
                        low_power: record.low_power,
                        high_power: record.high_power,
                        x: 0,
                        y: 0,
                        epoch_end: record.epoch_day,
                        epoch_start: record.epoch_day,
                        rarity: record.rarity
                    };
                    f.power = Math.ceil(f.power);
                    f.data ??= [];
                    f.data = f.data.concat(record.crew);
                    f.x = newgroup;
                    f.y = f.power;
                    series.push(f);
                }
                else {
                    f.data = f.data!.concat(record.crew);
                    f.x = newgroup;
                    f.y = f.power;
                    if (record.low_power < f.low_power) f.low_power = record.low_power;
                    if (record.high_power > f.high_power) f.high_power = record.high_power;
                    if (record.epoch_day > f.epoch_end) f.epoch_end = record.epoch_day;
                    if (record.epoch_day < f.epoch_start) f.epoch_start = record.epoch_day;
                }
            })
        }

        series.forEach((serie) => {
            let crews = serie.data as SkillOrderDebutCrew[];
            crews = crews.filter((f, idx) => crews.findIndex(f2 => f2.symbol === f.symbol) === idx);
            serie.density = crews.length;
            serie.y = serie.power = crews.map(m => m.power).reduce((p, n) => p + n) / crews.length;
        });

        return { series, segments };
    }

    function getGraphAverage(series: GraphSeries) {

    }
}

const PointComponent = (props: PointProps<DefaultBumpDatum, any>): JSX.Element => {
    const crew = React.useContext(GlobalContext).core.crew;
    let cmarr = props.point.serie.data.data as GraphSeries[];
    let x = Number(props.point.id.split(".")[1]);
    let cm = cmarr[x].data![0];
    if (cm?.symbol) {
        let f = crew.find(fe => fe.symbol === cm.symbol);
        if (!f) {
            return <></>
        }
        else {
            return <div style={{zIndex: 100}}><img src={`${process.env.GATSBY_ASSETS_URL}${f.imageUrlPortrait}`}
                    style={{height: '20px', borderRadius: '10px'}} />
                    </div>
        }
    }
    else {
        return <></>
    }
}

