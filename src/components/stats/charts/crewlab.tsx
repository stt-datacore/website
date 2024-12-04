import React from "react";
import themes from "../../nivo_themes";
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { CrewMember } from "../../../model/crew";
import { epochToDate, OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../utils";
import { AvatarView } from "../../item_presenters/avatarview";
import { CrewDropDown } from "../../base/crewdropdown";
import { GraphPropsCommon } from "../model";
import CrewStat from "../../crewstat";
import { applyCrewBuffs, crewCopy, skillToShort } from "../../../utils/crewutils";
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
    const { crew } = globalContext.core;
    const { maxBuffs } = globalContext;
    const { playerData, buffConfig } = globalContext.player;
    const { t } = globalContext.localized;
    const statsContext = React.useContext(StatsContext);

    const [selCrew, setSelCrew] = React.useState<CrewMember[]>([]);
    const [ids, setIds] = useStateWithStorage<number[] | undefined>('crew_lab_curr_crew_ids', props.crew_ids, { rememberForever: true });
    const [workCrew, setWorkCrew] = React.useState<CrewMember[]>([]);
    const [buffMode, setBuffMode] = useStateWithStorage<PlayerBuffMode | undefined>('crew_lab_buff_mode', 'max', { rememberForever: true });
    const [lineData, setLineData] = React.useState<LineData[][]>([]);

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    React.useEffect(() => {
        if (!crew?.length) return;
        const newCrew = crewCopy(crew);

        if ((maxBuffs && buffMode === 'max') || (buffMode === 'player' && !buffConfig)) {
            newCrew.forEach((c) => {
                c.base_skills = applyCrewBuffs(c, maxBuffs!)!;
            });
        }
        else if (buffConfig && buffMode === 'player') {
            newCrew.forEach((c) => {
                c.base_skills = applyCrewBuffs(c, buffConfig!)!;
            });
        }
        newCrew.sort((a, b) => {
            let r = b.max_rarity - a.max_rarity;
            if (!r) r = a.bigbook_tier - b.bigbook_tier;
            if (!r) r = b.cab_ov_rank - a.cab_ov_rank;
            if (!r) r = a.name.localeCompare(b.name);
            return r;
        });
        setWorkCrew(newCrew);
    }, [crew, buffMode]);

    React.useEffect(() => {
        if (!selCrew) return;

        let allld: LineData[][] = [];
        selCrew.forEach((selCrew) => {
            let lastag = {} as any;
            let ld = [] as LineData[]
            let rels = statsContext.flatOrder.filter(f => selCrew.skill_order.slice(0, f.skills.length).join() === f.skills.join());
            rels.sort((a, b) => a.epoch_day - b.epoch_day);
            rels.forEach((rel, idx) => {
                if ((idx + 1) % 10) return;
                let name = rel.skills.map(m => skillToShort(m)).join("/");
                let f = ld.find(f => f.id === name);
                let ag = rel.aggregates.reduce((p, n) => p + n);
                if (!f) {
                    f = {
                        id: name,
                        data: []
                    }
                    ld.push(f);
                }
                if (!lastag[name]) lastag[name] = ag;
                if (ag > lastag[name]) {
                    lastag[name] = ag;
                }
                f.data.push({
                    x: epochToDate(rel.epoch_day),
                    y: lastag[name]
                });
            });
            if (ld?.length) allld.push(ld);
        });
        setLineData(allld);

    }, [statsContext, selCrew]);

    React.useEffect(() => {
        if (!workCrew?.length || !ids?.length) return;
        const c = workCrew.filter(f => ids.includes(f.archetype_id));
        if (c) {
            setSelCrew(c);
        }
    }, [workCrew, ids])

    return (<div style={{ ...flexCol, alignItems: 'flex-start' }}>
        <CrewDropDown
            archetypeId
            showRarity
            plain={false}
            pool={workCrew}
            multiple={false}
            selection={ids}
            setSelection={setIds}
            custom={(c) => {
                return <>{c.bigbook_tier}</>
            }}
        />
        <CrewBuffModes
            buffMode={buffMode}
            setBuffMode={setBuffMode}
            playerAvailable={!!buffConfig}
        />

        <div style={{ ...flexCol }}>
            {!!selCrew?.length &&
                selCrew.map((crew, idx) => {
                    return <div key={`scully_${crew.symbol}_${idx}`} style={flexRow}>
                            <div style={{ ...flexCol, gap: '2em', width: '340px', margin: '2em 0', marginRight: '2em' }}>
                                <h2>{crew.name}</h2>
                                <AvatarView
                                    mode='crew'
                                    item={crew}
                                    size={256}
                                />
                            </div>
                            <div style={{ ...flexCol, width: '200px' }}>
                                <h3>{t('quipment_dropdowns.mode.skill_order')}</h3>
                                <div style={{ ...flexRow }}>
                                    {crew.skill_order.map((skill) => {
                                        return <CrewStat skill_name={skill} data={crew.base_skills[skill]} />
                                    })}
                                </div>
                                {!!lineData?.length && !!lineData[idx] && !!lineData[idx].length &&
                                    <div style={{ width: '700px', height: '500px' }}>
                                        {renderLineGraph(idx)}
                                    </div>}
                            </div>
                        </div>})
            }
        </div>
    </div>)

    function renderLineGraph(idx: number) {
        return (<ResponsiveLine
            data={lineData[idx]}
            theme={themes.dark}
            animate={false}
            margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
            xScale={{ type: 'point' }}
            yScale={{
                type: 'linear',
                min: 'auto',
                max: 'auto',
                stacked: true,
                reverse: false
            }}
            yFormat=" >-.2f"
            axisTop={null}
            axisRight={null}
            axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'transportation',
                legendOffset: 36,
                legendPosition: 'middle',
                truncateTickAt: 0
            }}
            axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'count',
                legendOffset: -40,
                legendPosition: 'middle',
                truncateTickAt: 0
            }}
            pointSize={10}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'serieColor' }}
            pointLabel="data.yFormatted"
            pointLabelYOffset={-12}
            enableTouchCrosshair={true}
            useMesh={true}
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