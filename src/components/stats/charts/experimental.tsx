import { CalendarData, Datum } from "@nivo/calendar";
import React from "react"
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { Highs, EpochDiff, GraphPropsCommon, SkoBucket, GraphSeries } from "../model";
import { GameEpoch, filterHighs, filterEpochDiffs, filterFlatData, epochToDate, dateToEpoch, statFilterCrew, OptionsPanelFlexRow, OptionsPanelFlexColumn, skillIcon, keyToNames, getSkillOrderDebutData, SkillColors } from "../utils";
import { AreaBumpSerie, Bump, BumpSerieMouseHandler, ResponsiveAreaBump, ResponsiveBump } from "@nivo/bump";
import CONFIG from "../../CONFIG";


import themes from "../../nivo_themes";
import { shortToSkill, skillSum } from "../../../utils/crewutils";
import { useStateWithStorage } from "../../../utils/storage";
import { Checkbox } from "semantic-ui-react";
import { ResponsiveSwarmPlot, SwarmPlot } from "@nivo/swarmplot";
import { printNCrew } from "../../../utils/misc";

interface MapConfig {
    considerCounts: boolean;
    considerPower: boolean;
}

export const ExperimentalChart1 = (props: GraphPropsCommon) => {

    const { useFilters } = props;
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { filterConfig } = statsContext;

    const [areaData, setAreaData] = React.useState<GraphSeries[]>([]);
    const [ready, setReady] = React.useState(false);
    const [readyCount, setReadyCount] = React.useState(0);

    const nowEpoch = dateToEpoch();
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    React.useEffect(() => {
        if (!crew.length) return;

        const newseries = [] as GraphSeries[];
        const workCrew = useFilters ? statFilterCrew(filterConfig, crew, true) : crew;

        const data = getSkillOrderDebutData(workCrew);
        const uniqueSkos = [...new Set(workCrew.map(m => m.skill_order.join(',')))];

        const startDay = filterConfig.start_date ? dateToEpoch(new Date(filterConfig.start_date)) : 0;
        const endDay = filterConfig.end_date ? dateToEpoch(new Date(filterConfig.end_date)) : nowEpoch;

        const totalYears = (epochToDate(endDay).getUTCFullYear() - epochToDate(startDay).getUTCFullYear()) + 1;

        const seglen = Math.ceil((endDay - startDay) / (totalYears));

        for (let time = startDay; time <= endDay; time += seglen) {
            let timedata = data.filter(f =>
                // f.epoch_day >= startDay
                // &&
                f.epoch_day < time + seglen
                // &&
                // f.crew.some(c => c.new_high)
            );
            let ed = epochToDate(time);

            let newgroup = `${ed.getUTCFullYear()}-${(ed.getUTCMonth() + 1).toString().padStart(2, '0')}`;

            timedata.forEach((record) => {
                let newid = keyToNames(record.skill_order).join("/");
                let f = newseries.find(f => f.id === newid && f.group === newgroup.toString());
                if (!f) {
                    f = {
                        id: keyToNames(record.skill_order).join("/"),
                        group: newgroup.toString(),
                        density: record.crew.length,
                        power: !record.crew.length ? 0 : record.crew.map(m => m.power).reduce((p, n) => p + n) / record.crew.length,
                        low_power: record.low_power,
                        high_power: record.high_power,
                        x: 0,
                        y: 0,
                        epoch_end: record.epoch_day,
                        epoch_start: record.epoch_day,

                    };
                    f.power = Math.ceil(f.power);
                    // f.x = newgroup;
                    // f.y = f.power;
                    newseries.push(f);
                }
                else {
                    f.density += record.crew.length;
                    f.power += (!record.crew.length ? 0 : record.crew.map(m => m.power).reduce((p, n) => p + n) / record.crew.length);
                    f.power /= 2;
                    f.power = Math.ceil(f.power);
                    // f.x = newgroup;
                    // f.y = f.power;
                    if (record.low_power < f.low_power) f.low_power = record.low_power;
                    if (record.high_power > f.high_power) f.high_power = record.high_power;
                    if (record.epoch_day > f.epoch_end) f.epoch_end = record.epoch_day;
                    if (record.epoch_day < f.epoch_start) f.epoch_start = record.epoch_day;
                }
            })

        }
        setAreaData(newseries);
        setReady(false);
    }, [crew, filterConfig, useFilters]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'stretch',
            alignItems: 'center',
            gap: '1em',
            margin: '1em 0'
        }}>

            {!!areaData?.length && [areaData].map((swarmData, idx) => {
                return <div style={{ height: `90em`, width: '100%' }} key={`stats_year_calendar_${swarmData.length ? swarmData[0].power : '0'}_${idx}`}>

                    <SwarmPlot
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
                                50,
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
                                let max = swarm.high_power;
                                let min = swarm.low_power;
                                let inc = swarm.density;
                                return (<div className="ui segment" style={flexCol}>
                                    <div style={{...flexRow, borderBottom: '2px solid', padding: '0.25em 0', justifyContent: 'center', alignItems: 'center'}}>
                                        {data.data.id.split(" / ").map((skill) => {
                                            return skill.split("/").map(skill => {
                                                let icon = skillIcon(shortToSkill(skill)!);
                                                return <div key={`${skill}_bump_key_${swarm.density}+${swarm.power}`} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}><img src={icon} style={{height: '1em'}} />&nbsp;<span>{skill}</span></div>
                                            })
                                        })}
                                    </div>
                                    <span>{printNCrew(swarm.density, t, true)}</span>
                                    {/* {t('stat_trends.graphs.population_increase')}: <b>{inc ? (inc).toLocaleString() : t('global.new')}</b> */}
                                    {t('stat_trends.graphs.power_creep')}: <b>{!inc ? 'N/A' : `${Math.round((1 - (min / max)) * 100).toLocaleString()}%`}</b>
                                    {t('stat_trends.initial_release')}: <b>{epochToDate(swarm.epoch_start).toDateString()}</b>
                                    {t('stat_trends.last_release')}: <b>{epochToDate(swarm.epoch_end).toDateString()}</b>
                                </div>)
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
                </div>
            })}
        </div>)

}