import React from "react";
import themes from "../../nivo_themes";
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { CrewMember } from "../../../model/crew";
import { dateToEpoch, epochToDate, fillGaps, OptionsPanelFlexColumn, OptionsPanelFlexRow, statFilterCrew } from "../utils";
import { AvatarView } from "../../item_presenters/avatarview";
import { CrewDropDown } from "../../base/crewdropdown";
import { GraphPropsCommon } from "../model";
import CrewStat from "../../item_presenters/crewstat";
import { applyCrewBuffs, crewCopy, skillSum, skillToShort } from "../../../utils/crewutils";
import { useStateWithStorage } from "../../../utils/storage";
import { PlayerBuffMode } from "../../../model/player";
import { DropdownItemProps } from "semantic-ui-react";
import { CrewBuffModes } from "../../crewtables/commonoptions";
import { ResponsiveLine } from "@nivo/line";


export interface CrewLabProps extends GraphPropsCommon {
    crew_ids?: number[];
}

interface LineData {
    id: string;
    data: {
        x: string | Date | number,
        y: string | Date | number
    }[]
}
export const CrewLab = (props: CrewLabProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { useFilters } = props;
    const { crew } = globalContext.core;
    const { maxBuffs } = globalContext;
    const { playerData, buffConfig } = globalContext.player;
    const { t } = globalContext.localized;
    const statsContext = React.useContext(StatsContext);
    const { flatOrder, filterConfig } = statsContext;
    const [selCrew, setSelCrew] = React.useState<CrewMember[]>([]);
    const [ids, setIds] = useStateWithStorage<number[] | undefined>('crew_lab_curr_crew_ids', props.crew_ids, { rememberForever: true });
    const [workCrew, setWorkCrew] = React.useState<CrewMember[]>([]);
    const [buffMode, setBuffMode] = useStateWithStorage<PlayerBuffMode | undefined>('crew_lab_buff_mode', 'max', { rememberForever: true });
    const [lineData, setLineData] = React.useState<LineData[][]>([]);

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    React.useEffect(() => {
        if (!crew?.length) return;
        let cc = [...crew];
        if (useFilters) {
            cc = statFilterCrew(filterConfig, cc);
        }
        const newCrew = crewCopy(cc);

        if ((maxBuffs && buffMode === 'max') || (buffMode === 'player' && !buffConfig)) {
            newCrew.forEach((c) => {
                applyCrewBuffs(c, maxBuffs!)!;
            });
        }
        else if (buffConfig && buffMode === 'player') {
            newCrew.forEach((c) => {
                applyCrewBuffs(c, buffConfig!)!;
            });
        }
        newCrew.sort((a, b) => {
            let r = b.max_rarity - a.max_rarity;
            // if (!r) r = a.bigbook_tier - b.bigbook_tier;
            if (!r) r = a.cab_ov_rank - b.cab_ov_rank;
            if (!r) r = a.name.localeCompare(b.name);
            return r;
        });
        setWorkCrew(newCrew);
    }, [crew, buffMode]);

    React.useEffect(() => {
        if (!selCrew) return;

        let allld: LineData[][] = [];
        selCrew.forEach((selCrew) => {
            let ld = [] as LineData[]
            let rels = flatOrder.filter(f => selCrew.skill_order.slice(0, f.skills.length).join() === f.skills.join());
            rels.sort((a, b) => a.epoch_day - b.epoch_day || a.skills.length - b.skills.length);

            rels.forEach((rel, idx) => {
                let name = rel.skills.map(m => skillToShort(m)).join("/");
                let f = ld.find(f => f.id === name);

                let ag = rel.aggregates.slice(0, rel.skills.length).reduce((p, n) => p + n);
                // let cag = rel.cores.slice(0, rel.skills.length).reduce((p, n) => p + n);
                // let pag = rel.proficiencies.slice(0, rel.skills.length).reduce((p, n) => p + n);

                if (!f) {
                    f = {
                        id: name,
                        data: []
                    }
                    ld.push(f);
                }

                f.data.push({
                    x: epochToDate(rel.epoch_day),
                    y: ag
                });
            });
            if (ld?.length) allld.push(ld);
        });
        setLineData(allld);

    }, [flatOrder, selCrew, filterConfig]);

    React.useEffect(() => {
        if (!workCrew?.length || !ids?.length) {
            setSelCrew([]);
            return;
        }
        const c = workCrew.filter(f => ids.includes(f.archetype_id));
        if (c) {
            setSelCrew(c);
        }
    }, [workCrew, ids])

    return (<div style={{ ...flexCol, alignItems: 'flex-start' }}>
        <CrewDropDown
            archetypeId
            showRarity
            plain={true}
            pool={workCrew}
            multiple={true}
            selection={ids}
            setSelection={setIds}
        />
        <CrewBuffModes
            buffMode={buffMode}
            setBuffMode={setBuffMode}
            playerAvailable={!!buffConfig}
        />

        <div style={{ ...flexCol }}>
            {!!selCrew?.length &&
                selCrew.map((crew, idx) => {
                    let flat = flatOrder.filter(f => f.symbol === crew.symbol)
                    if (!flat) return <></>;
                    let cag = flat.map(fc => fc.aggregates.slice(0, fc.skills.length).reduce((p, n) => p + n)).sort((a, b) => a - b);
                    return (
                    <div key={`scully_${crew.symbol}_${idx}`} style={flexRow}>
                        <div style={{ ...flexCol, gap: '2em', width: '340px', margin: '2em 0', marginRight: '2em' }}>
                            <h2>{crew.name}</h2>
                            <AvatarView
                                mode='crew'
                                item={crew}
                                size={256}
                            />
                        </div>
                        <div style={{ ...flexCol }}>
                            <h3>{t('quipment_dropdowns.mode.skill_order')}</h3>
                            <div style={{ ...flexRow }}>
                                {crew.skill_order.map((skill) => {
                                    return <CrewStat skill_name={skill} data={crew[skill]} />
                                })}
                            </div>
                            {!!lineData?.length && !!lineData[idx] && !!lineData[idx].length &&
                                <div style={{ width: '700px', height: '500px' }}>
                                    {renderLineGraph(idx, cag, crew.name)}
                                </div>}
                        </div>
                    </div>)})
            }
        </div>
    </div>)

    function renderLineGraph(idx: number, scores: number[], name: string) {
        return (<ResponsiveLine
            data={lineData[idx]}
            theme={themes.dark}
            curve='basis'
            animate={false}
            margin={{ top: 50, right: 140, bottom: 90, left: 60 }}
            // xScale={{
            //         type: 'linear',
            //         max: filterConfig.end_date && useFilters ? dateToEpoch(new Date(filterConfig.end_date)) : dateToEpoch(),
            //         min: filterConfig.start_date && useFilters ? dateToEpoch(new Date(filterConfig.start_date)) : 0
            //     }}
            xScale={{
                format: '%Y-%m',
                precision: 'month',
                type: 'time',
                useUTC: true
              }}
            yScale={{
                type: 'linear',
                min: 'auto',
                max: 'auto',
                stacked: false,
                reverse: false
            }}
            yFormat=" >-.2f"
            axisTop={null}
            axisRight={null}
            axisBottom={{
                tickSize: 10,
                tickPadding: 5,
                tickRotation: 90,
                legend: t('base.release_date'),
                legendOffset: 70,
                legendPosition: 'middle',
                truncateTickAt: 0,
                tickValues: 'every 3 months',
                format: '%Y-%m'
            }}
            axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: t('event_info.score'),
                legendOffset: -45,
                legendPosition: 'middle',
                truncateTickAt: 0
            }}
            pointSize={0}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            pointLabel="data.yFormatted"
            pointLabelYOffset={-12}
            enableTouchCrosshair={true}
            useMesh={true}
            markers={scores.map(wm => ({
                axis: 'y',
                legend: name,
                legendOrientation: 'horizontal',
                textStyle: {
                  stroke: '#a9ef33'
                },
                lineStyle: {
                  stroke: 'lightgreen',
                  strokeWidth: 3,
                  strokeDasharray: [0, 2, 4]
                },
                value: wm
              })) as any}
            legends={[
                {
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 100,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: 'left-to-right',
                    itemWidth: 80,
                    itemHeight: 20,
                    itemOpacity: 0.75,
                    symbolSize: 12,
                    symbolShape: 'circle',
                    symbolBorderColor: 'rgba(0, 0, 0, .5)',
                    effects: [
                        {
                            on: 'hover',
                            style: {
                                itemBackground: 'rgba(0, 0, 0, .03)',
                                itemOpacity: 1
                            }
                        }
                    ]
                }
            ]}
        />)
    }

}