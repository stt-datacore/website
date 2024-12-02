import { Datum } from "@nivo/calendar";
import React from "react";
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { Highs, EpochDiff, GraphPropsCommon, SkoBucket, GraphSeries, SkillOrderDebutCrew, SkillFilterConfig } from "../model";
import { GameEpoch, filterHighs, filterEpochDiffs, filterFlatData, epochToDate, dateToEpoch, statFilterCrew, OptionsPanelFlexRow, OptionsPanelFlexColumn, skillIcon, getSkillOrderDebutData, keyToNames, computeCommonSeries, SkillColors } from "../utils";
import { AreaBumpSerie, ResponsiveAreaBump } from "@nivo/bump";


import themes from "../../nivo_themes";
import { shortToSkill } from "../../../utils/crewutils";
import { useStateWithStorage } from "../../../utils/storage";
import { Checkbox, Dropdown } from "semantic-ui-react";
import { CrewMember } from "../../../model/crew";
import { printNCrew } from "../../../utils/misc";
import { SwarmPlot } from "@nivo/swarmplot";


interface MapConfig {
    considerCounts: boolean;
    considerPower: boolean;
}

export const StatsCreepAreaGraph = (props: GraphPropsCommon) => {

    const { useFilters } = props;
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { filterConfig } = statsContext;

    const [areaData, setAreaData] = React.useState<AreaBumpSerie<Datum, any>[]>([]);
    const [swarmData, setSwarmData] = React.useState<GraphSeries[]>([]);
    const [rarityCount, setRarityCount] = React.useState(0);
    const [config, setConfig] = useStateWithStorage<MapConfig>(`stats_skill_area_config`, { considerCounts: true, considerPower: true }, { rememberForever: true });
    const [graphType, setGraphType] = useStateWithStorage('stat_trends_power_creep_graph_type', 'areabump', { rememberForever: true });

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    React.useEffect(() => {
        if (!crew.length) return;

        const { series } = computeCommonSeries(filterConfig, crew, useFilters);
        const areaData = [...new Set(series.map(m => m.id))].map(group => {
            return {
                id: group,
                data: series.filter(f => f.id === group).map(d => {
                    let b = 1;
                    if (config.considerCounts) b *= d.density;
                    if (config.considerPower) b *= d.power;
                    d.y = b;
                    return d;
                })
            }
        });
        setAreaData(areaData);
        setSwarmData(series);
        setRarityCount([...new Set(series.map(m => m.id))].length)
    }, [crew, filterConfig, useFilters, config]);

    const graphTypes = [
        { key: 'areabump', value: 'areabump', text: t('graph.area_bump') },
        { key: 'swarm', value: 'swarm', text: t('graph.swarm') },
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'stretch',
            alignItems: 'center',
            gap: '1em',
            margin: '1em 0'
        }}>
            {!!areaData?.length && [areaData].map((data, idx) => {
                return <div style={{ height: `${rarityCount * 3}em`, width: '100%' }} key={`stats_year_calendar_${data.length ? data[0].year : '0'}_${idx}`}>
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

                    {graphType === 'areabump' && renderAreaBumpGraph()}
                    {graphType === 'swarm' && renderSwarmPlot()}
                </div>
            })}
        </div>)

    function renderAreaBumpTooltip(bump: GraphSeries[]) {
        let max = bump.map(m => m.high_power).reduce((p, n) => p > n ? p : n, 0);
        let min = bump.map(m => m.low_power).reduce((p, n) => n < p || !p ? n : p, 0);
        let inc = bump[bump.length - 1].density - bump[0].density;
        return <div className="ui segment" style={flexCol}>
            <div style={{ ...flexRow, borderBottom: '2px solid', padding: '0.25em 0', justifyContent: 'center', alignItems: 'center' }}>{bump[0].id.split(" / ").map((skill) => {
                return skill.split("/").map(skill => {
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

    function renderSwarmTooltip(swarm: GraphSeries) {
        let max = swarm.high_power;
        let min = swarm.low_power;
        let inc = swarm.density;
        return (<div className="ui segment" style={flexCol}>
            <div style={{ ...flexRow, borderBottom: '2px solid', padding: '0.25em 0', justifyContent: 'center', alignItems: 'center' }}>
                {swarm.id.split(" / ").map((skill) => {
                    return skill.split("/").map(skill => {
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
        </div>)
    }

    function renderAreaBumpGraph() {
        return (
            <ResponsiveAreaBump
                data={areaData}
                margin={{ top: 40, right: 100, bottom: 40, left: 40 }}
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
            data={swarmData}
            groups={[...new Set(swarmData.map(m => m.group))]}
            groupBy="group"
            //identity="id"
            value="power"
            valueFormat=".2f"
            valueScale={{
                type: 'linear',
                min: swarmData.reduce((p, n) => n.power < p || !p ? n.power : p, 0) - 100,
                max: swarmData.reduce((p, n) => n.power > p ? n.power : p, 0) + 100,
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
            colors={(data) => SkillColors[shortToSkill(data.data.id.split("/")[0])!]}
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
            margin={{ top: 80, right: 100, bottom: 80, left: 100 }}
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

}