import { CalendarData, Datum } from "@nivo/calendar";
import React from "react"
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { Highs, EpochDiff, GraphPropsCommon, SkoBucket } from "../model";
import { GameEpoch, filterHighs, filterEpochDiffs, filterFlatData, epochToDate, dateToEpoch, statFilterCrew } from "../utils";
import { AreaBumpSerie, ResponsiveAreaBump } from "@nivo/bump";
import CONFIG from "../../CONFIG";


import themes from "../../nivo_themes";
import { skillSum } from "../../../utils/crewutils";

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

    const totalYears = (((new Date()).getUTCFullYear()) - GameEpoch.getUTCFullYear()) + 1;
    const nowEpoch = dateToEpoch();

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
        const seglen = nowEpoch / 5;
            uniqueSkos.forEach(skill => {
                let currCrew = workCrew.filter(f => f.skill_order.join(",") === skill);
                if (!currCrew.length) return;

                const newObj = {
                    id: `${skill.split(",").map(skill => CONFIG.SKILLS_SHORT.find(f => f.name === skill)?.short).join(" / ")}`,
                    data: [] as { x: number, y: number }[]
                }
                for (let time = 0; time < nowEpoch; time += seglen) {
                    let compCrew = workCrew.filter(f => {
                        let e = dateToEpoch(new Date(f.date_added));
                        if (e < (time + seglen)) return true;
                        return false;
                    });
                    let segCrew = currCrew.filter(f => {
                        let e = dateToEpoch(new Date(f.date_added));
                        if (e < (time + seglen)) return true;
                        return false;
                    });
                    let comppower = compCrew.length ? compCrew.map(sg => skillSum(Object.values(sg.base_skills))).reduce((p, n) => p + n) : 0;
                    let power = segCrew.length ? segCrew.map(sg => skillSum(Object.values(sg.base_skills))).reduce((p, n) => p + n) : 0;

                    newObj.data.push({
                        x: Math.floor(time),
                        y: (comppower * (power / comppower)) //* segCrew.length // (segCrew.length / compCrew.length) * 100
                    })
                }
                newseries.push(newObj);
            });
        setRarityCount(uniqueSkos.length);
        setAreaData(newseries);
    }, [crew, filterConfig]);

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
                    <ResponsiveAreaBump
                        data={data}
                        margin={{ top: 40, right: 140, bottom: 40, left: 40 }}
                        spacing={8}
                        theme={themes.dark}
                        //blendMode="multiply"

                        // fill={[
                        //     {
                        //         match: {
                        //             id: 'CoffeeScript'
                        //         },
                        //         id: 'dots'
                        //     },
                        //     {
                        //         match: {
                        //             id: 'TypeScript'
                        //         },
                        //         id: 'lines'
                        //     }
                        // ]}
                        // startLabel="id"
                        // endLabel="id"
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