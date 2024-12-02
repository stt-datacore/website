import { Datum } from "@nivo/calendar";
import React from "react";
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { Highs, EpochDiff, GraphPropsCommon, SkoBucket, GraphSeries, SkillOrderDebutCrew } from "../model";
import { GameEpoch, filterHighs, filterEpochDiffs, filterFlatData, epochToDate, dateToEpoch, statFilterCrew, OptionsPanelFlexRow, OptionsPanelFlexColumn, skillIcon, getSkillOrderDebutData, keyToNames } from "../utils";
import { AreaBumpSerie, ResponsiveAreaBump } from "@nivo/bump";


import themes from "../../nivo_themes";
import { shortToSkill } from "../../../utils/crewutils";
import { useStateWithStorage } from "../../../utils/storage";
import { Checkbox } from "semantic-ui-react";


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
    const { filterConfig, allHighs: outerHighs, epochDiffs: outerDiffs, flatOrder: outerOrder } = statsContext;

    const [allHighs, setAllHighs] = React.useState<Highs[]>([]);
    const [epochDiffs, setEpochDiffs] = React.useState<EpochDiff[]>([]);
    const [areaData, setAreaData] = React.useState<AreaBumpSerie<Datum, any>[]>([]);
    const [flatOrder, setFlatOrder] = React.useState<SkoBucket[]>([]);
    const [rarityCount, setRarityCount] = React.useState(0);
    const [config, setConfig] = useStateWithStorage<MapConfig>(`stats_skill_area_config`, { considerCounts: true, considerPower: true }, { rememberForever: true });
    const totalYears = (((new Date()).getUTCFullYear()) - GameEpoch.getUTCFullYear()) + 1;
    const nowEpoch = dateToEpoch();
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    React.useEffect(() => {
        if (outerOrder.length) {
            if (useFilters) {
                setFlatOrder(filterFlatData(filterConfig, outerOrder));
            }
            else {
                setFlatOrder(outerOrder);
            }
        }
    }, [useFilters, filterConfig, outerOrder]);

    React.useEffect(() => {
        if (outerHighs.length) {
            if (useFilters) {
                setAllHighs(filterHighs(filterConfig, outerHighs));
            }
            else {
                setAllHighs(outerHighs);
            }
        }
    }, [useFilters, filterConfig, outerHighs]);

    React.useEffect(() => {
        if (outerDiffs.length) {
            if (useFilters) {
                setEpochDiffs(filterEpochDiffs(filterConfig, outerDiffs))
            }
            else {
                setEpochDiffs(outerDiffs);
            }
        }
    }, [useFilters, filterConfig, outerDiffs]);

    React.useEffect(() => {
        if (!crew.length) return;

        const newseries = [] as GraphSeries[];
        const workCrew = useFilters ? statFilterCrew(filterConfig, crew, true) : crew;

        const data = getSkillOrderDebutData(workCrew);
        const uniqueSkos = [...new Set(workCrew.map(m => m.skill_order.join(',')))];

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
            let ed = epochToDate(time);

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
                    f.data ??= [];
                    f.data = f.data.concat(record.crew);
                    f.x = newgroup;
                    f.y = f.power;
                    newseries.push(f);
                }
                else {
                    f.data = f.data.concat(record.crew);
                    f.x = newgroup;
                    f.y = f.power;
                    if (record.low_power < f.low_power) f.low_power = record.low_power;
                    if (record.high_power > f.high_power) f.high_power = record.high_power;
                    if (record.epoch_day > f.epoch_end) f.epoch_end = record.epoch_day;
                    if (record.epoch_day < f.epoch_start) f.epoch_start = record.epoch_day;
                }
            })
        }
        newseries.forEach((serie) => {
            let crews = serie.data as SkillOrderDebutCrew[];
            crews = crews.filter((f, idx) => crews.findIndex(f2 => f2.symbol === f.symbol) === idx);
            serie.density = crews.length;
            serie.y = serie.power = crews.map(m => m.power).reduce((p, n) => p + n) / crews.length;
        });
        let dataset = [...new Set(newseries.map(m => m.id))].map(group => {
            return {
                id: group,
                data: newseries.filter(f => f.id === group).map(d => {
                    let b = 1;
                    if (config.considerCounts) b *= d.density;
                    if (config.considerPower) b *= d.power;
                    d.y = b;
                    return d;
                })
            }
        });
        setAreaData(dataset);
        setRarityCount([...new Set(newseries.map(m => m.id))].length)
    }, [crew, filterConfig, useFilters, config]);

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

                    <div style={{...flexCol, alignSelf: 'flex-start', alignItems: 'flex-start', gap: '1em', margin: '1em 0'}}>
                        <Checkbox
                            label={t('stat_trends.graphs.map_skill_order_density')}
                            checked={config.considerCounts}
                            onChange={(e, { checked }) => setConfig({...config, considerCounts: !!checked })}
                            />

                        <Checkbox
                            label={t('stat_trends.graphs.map_skill_order_power')}
                            checked={config.considerPower}
                            onChange={(e, { checked }) => setConfig({...config, considerPower: !!checked })}
                            />

                    </div>

                    <ResponsiveAreaBump
                        data={data}
                        margin={{ top: 40, right: 100, bottom: 40, left: 40 }}
                        spacing={8}
                        theme={themes.dark}
                        tooltip={(data) => {
                            const bump = data.serie.data.data as GraphSeries[];
                            if (bump) {
                                let max = bump.map(m => m.high_power).reduce((p, n) => p > n ? p : n, 0);
                                let min = bump.map(m => m.low_power).reduce((p, n) => n < p || !p ? n : p, 0);
                                let inc = bump[bump.length - 1].density - bump[0].density;
                                return <div className="ui segment" style={flexCol}>
                                    <div style={{...flexRow, borderBottom: '2px solid', padding: '0.25em 0', justifyContent: 'center', alignItems: 'center'}}>{data.serie.data.id.split(" / ").map((skill) => {
                                        return skill.split("/").map(skill => {
                                            let icon = skillIcon(shortToSkill(skill)!);
                                            return <div key={`${skill}_bump_key_${bump.length}`} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}><img src={icon} style={{height: '1em'}} />&nbsp;<span>{skill}</span></div>
                                        })
                                    })}</div>
                                    {t('stat_trends.graphs.population_increase')}: <b>{inc ? (inc).toLocaleString() : t('global.new')}</b>
                                    {t('stat_trends.graphs.power_creep')}: <b>{bump.length < 2 || !inc ? 'N/A' : `${Math.round((1 - (min / max)) * 100).toLocaleString()}%`}</b>
                                    {t('stat_trends.initial_release')}: <b>{epochToDate(bump[0].epoch_start).toLocaleDateString()}</b>
                                    {t('stat_trends.last_release')}: <b>{epochToDate(bump[bump.length - 1].epoch_end).toLocaleDateString()}</b>
                                </div>
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
                    />
                </div>
            })}
        </div>)

}