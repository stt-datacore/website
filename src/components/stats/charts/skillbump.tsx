import { CalendarData, Datum } from "@nivo/calendar";
import React from "react"
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { Highs, EpochDiff, GraphPropsCommon, SkoBucket } from "../model";
import { GameEpoch, filterHighs, filterEpochDiffs, filterFlatData, epochToDate, dateToEpoch, statFilterCrew, OptionsPanelFlexRow, OptionsPanelFlexColumn, skillIcon } from "../utils";
import { AreaBumpSerie, BumpSerieMouseHandler, ResponsiveAreaBump } from "@nivo/bump";
import CONFIG from "../../CONFIG";


import themes from "../../nivo_themes";
import { shortToSkill, skillSum } from "../../../utils/crewutils";
import { useStateWithStorage } from "../../../utils/storage";
import { Checkbox } from "semantic-ui-react";

interface BumpSerie {
    x: number,
    y: number,
    density: number,
    power: number,
    segment_start: number,
    segment_end: number
}

interface MapConfig {
    considerCounts: boolean;
    considerPower: boolean;
}

export const StatsSkillAreaBump = (props: GraphPropsCommon) => {

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
        const newseries = [] as AreaBumpSerie<Datum, any>[];
        const workCrew = useFilters ? statFilterCrew(filterConfig, crew) : crew;
        const uniqueSkos = [...new Set(workCrew.map(m => m.skill_order.join(',')))];
        const seglen = nowEpoch / totalYears;
            uniqueSkos.forEach(skill => {
                let currCrew = workCrew.filter(f => f.skill_order.join(",") === skill);
                if (!currCrew.length) return;

                const newObj = {
                    id: `${skill.split(",").map(skill => CONFIG.SKILLS_SHORT.find(f => f.name === skill)?.short).join(" / ")}`,
                    data: [] as BumpSerie[]
                }
                for (let time = 0; time < nowEpoch; time += seglen) {
                    let segCrew = currCrew.filter(f => {
                        let e = dateToEpoch(new Date(f.date_added));
                        if (e <= (time + seglen)) return true;
                        return false;
                    });

                    let segment_power = segCrew.length ? segCrew.map(sg => skillSum(Object.values(sg.base_skills))).reduce((p, n) => p + n) : 0;
                    if (segCrew.length) segment_power /= segCrew.length;
                    let power = 0;
                    if (config.considerCounts && config.considerPower || (!config.considerCounts && !config.considerPower)) {
                        power = segCrew.length * segment_power;
                    }
                    else if (config.considerPower) {
                        power = segment_power;
                    }
                    else if (config.considerCounts) {
                        power = segCrew.length;
                    }
                    if (segment_power) {
                        newObj.data.push({
                            x: epochToDate(Math.floor(time + seglen)).getUTCFullYear(),
                            y: power,
                            power: segment_power,
                            density: segCrew.length,
                            segment_start: Math.floor(time),
                            segment_end: Math.floor(time + seglen)
                        });
                    }
                }
                newseries.push(newObj);
            });
        setRarityCount(uniqueSkos.length);
        setAreaData(newseries);
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
                        margin={{ top: 40, right: 140, bottom: 40, left: 40 }}
                        spacing={8}
                        theme={themes.dark}
                        tooltip={(data) => {
                            const bump = data.serie.data.data as BumpSerie[];
                            if (bump) {

                                let max = bump.map(m => m.power).reduce((p, n) => p > n ? p : n, 0);
                                let min = bump.map(m => m.power).reduce((p, n) => n < p || !p ? n : p, 0);
                                let inc = bump[bump.length - 1].density - bump[0].density;
                                return <div className="ui segment" style={flexCol}>
                                    <div style={{...flexRow, borderBottom: '2px solid', padding: '0.25em 0', justifyContent: 'center', alignItems: 'center'}}>{data.serie.data.id.split(" / ").map((skill) => {
                                        let icon = skillIcon(shortToSkill(skill)!);
                                        return <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}><img src={icon} style={{height: '1em'}} />&nbsp;<span>{skill}</span></div>
                                    })}</div>
                                    {t('stat_trends.graphs.population_increase')}: <b>{inc ? (inc).toLocaleString() : t('global.new')}</b>
                                    {t('stat_trends.graphs.power_creep')}: <b>{bump.length < 2 || !inc ? 'N/A' : `${Math.round((min / max) * 100).toLocaleString()}%`}</b>
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