import React from "react";
import { GlobalContext } from "../../../context/globalcontext";
import { StatsContext } from "../dataprovider";
import { GraphPropsCommon } from "../model";
import { getRGBSkillColors, OptionsPanelFlexColumn, OptionsPanelFlexRow, statFilterCrew } from "../utils";
import { skillSum, skillToShort } from "../../../utils/crewutils";
import themes from "../../nivo_themes";
import { CrewTiles } from "../../base/crewtiles";
import CONFIG from "../../CONFIG";
import { ResponsiveCirclePacking } from "@nivo/circle-packing";
import { ComputedDatum } from "@nivo/circle-packing";
import { DEFAULT_MOBILE_WIDTH } from "../../hovering/hoverstat";

interface CircleData {
    name: string;
    color?: string;
    children: CircleData[];
    crew: string[];
    loc?: number;
    skills: string[]
}

export const StatsCircleChart = (props: GraphPropsCommon) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const { useFilters } = props;
    const globalContext = React.useContext(GlobalContext);
    const statsContext = React.useContext(StatsContext);
    const { t } = globalContext.localized;
    const { crew } = globalContext.core;
    const { filterConfig, allHighs: outerHighs, epochDiffs: outerDiffs, flatOrder: outerOrder } = statsContext;

    const [circleData, setCircleData] = React.useState<CircleData>({} as any);
    const [zoomedElem, setZoomedElem] = React.useState<ComputedDatum<CircleData> | null>(null);

    const [zoomElect, setZoomElect] = React.useState(0);

    const RGBColors = getRGBSkillColors();

    React.useEffect(() => {
        setCircleData(buildCircleData());
    }, [globalContext.core.crew, filterConfig, useFilters]);

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'stretch',
            alignItems: 'center',
            gap: '1em',
            margin: '1em 0'
        }}>
            <div style={{...flexRow, gap: '1em', alignItems: 'center', justifyContent: 'center'}}>
                {Object.keys(CONFIG.SKILLS).sort().map(skill => {
                    return (
                        <div
                            key={`circle_legend_skill_${skill}`}
                            style={{...flexRow, gap: '0.25em'}}
                        >
                            <div style={{
                                background: RGBColors[skill],
                                border: '1px solid black',
                                margin: '0.25em',
                                width: '24px',
                                height: '24px'
                            }}>
                                &nbsp;
                            </div>
                            <span>{CONFIG.SKILLS_SHORT.find(short => short.name === skill)!.short}</span>
                        </div>
                    );
                })}
            </div>
            {!!circleData && [circleData].map((circle, idx) => {
                return <div style={{height: `800px`, width: '100%'}} key={`stats_skill_circle_${idx}`}>
                    {!!zoomedElem && !zoomElect && zoomedElem.data.crew.length > 0 &&
                    <div style={{
                        position: 'absolute',
                        zIndex: '1001',
                        margin: '1em',
                        height: 'calc(800px - 2em)',
                        width: isMobile ? 'calc(100% - 4em)' : '1100px',
                        display: 'flex',
                        flexDirection:'column',
                        alignItems: 'center',
                        justifyContent: 'center'}}
                        onClick={() => setZoomElect(1)}
                    >
                            <CrewTiles crew={zoomedElem.data.crew.map(m => crew.find(f => f.symbol === m)!)}
                                targetGroup="stat_trends_crew"
                                scrolling
                                title={getSkillOrderTitle(zoomedElem.data.name)}
                                style={{
                                    textAlign: 'center',
                                    alignSelf: 'center',
                                    backgroundColor: 'rgba(70,70,70,0.7)',
                                    padding: '1em',
                                    borderRadius: '2em'}}
                                round={true}
                                //maxCrew={30}
                                rich
                                itemHeight="8em"
                                avatarSize={64}
                                pageId='circle_stats'
                            />
                    </div>}
                    <ResponsiveCirclePacking
                        onClick={node => {
                            setZoomedElem(zoomedElem?.id === node?.id ? null : node);
                            setZoomElect(0);
                        }}
                        zoomedId={zoomedElem?.id}
                        data={circleData}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        id="name"
                        colorBy="id"
                        inheritColorFromParent={false}
                        value="loc"
                        theme={themes.dark}
                        colors={({id, data}) => {
                            return RGBColors[data.skills[data.skills.length - 1]] || '#333'
                        }}
                        childColor={{
                            from: 'color',
                            modifiers: [
                                [
                                    'brighter',
                                    0.4
                                ]
                            ]
                        }}
                        padding={4}
                        enableLabels={true}
                        //labelsFilter={n=>1===n.node.depth}
                        labelsSkipRadius={40}
                        labelTextColor={{
                            from: 'color',
                            modifiers: [
                                [
                                    'darker',
                                    2
                                ]
                            ]
                        }}
                        borderWidth={1}
                        borderColor={{
                            from: 'color',
                            modifiers: [
                                [
                                    'darker',
                                    0.5
                                ]
                            ]
                        }}
                        // defs={[
                        //     {
                        //         id: 'lines',
                        //         type: 'patternLines',
                        //         background: 'none',
                        //         color: 'inherit',
                        //         rotation: -45,
                        //         lineWidth: 5,
                        //         spacing: 8
                        //     }
                        // ]}
                        // fill={[
                        //     {
                        //         match: {
                        //             depth: 1
                        //         },
                        //         id: 'lines'
                        //     }
                        // ]}
                    />

                </div>

            })}
        </div>
    );

    function getSkillOrderTitle(key: string) {
        let shorts = key.split("/").map(short => short.trim());
        let skills = shorts.map(short => CONFIG.SKILLS_SHORT.find(sk => sk.short === short)!.name);

        return (
            <div className="ui label" style={{...flexRow, display: 'inline-flex', padding: '1em', alignItems: 'center', justifyContent: 'center', gap: '3'}}>
                {skills.map((skill, i) => {
                    let icon = `${process.env.GATSBY_ASSETS_URL}atlas/icon_${skill}.png`;
                    let name = `${shorts[i]}`;
                    return (
                        <div
                            key={`stats_skill_circles_title_${key}_${skill}`}
                            style={{...flexRow, gap: '0.25em'}}
                        >
                            {i !== 0 && <span style={{fontSize:'1.25em'}}>&nbsp;/&nbsp;</span>}
                            <img src={icon} style={{height:'20px'}} alt={name} />
                            <div style={{ paddingBottom: '4px', borderBottom: `3px solid ${RGBColors[skill]}`}}>{name}</div>
                        </div>
                    );
                })}
            </div>
        )
    }

    function buildCircleData() {
        const workcrew = statFilterCrew(filterConfig, crew);
        const circleData = {
            name: 'STT Datacore',
            children: [],
            crew: [],
            skills: []
        } as CircleData;

        let skills = Object.keys(CONFIG.SKILLS);

        for (let skill1 of skills) {
            const crew1 = workcrew.filter(f => f.skill_order.length >= 1 && f.skill_order[0] === skill1);
            crew1.sort((a, b) => {
                let r = b.max_rarity - a.max_rarity;
                if (!r) r = b.ranks.scores.overall - a.ranks.scores.overall;
                if (!r) r = a.cab_ov_rank - b.cab_ov_rank;
                if (!r) r = skillSum(Object.values(b.base_skills)) - skillSum(Object.values(a.base_skills))
                return r;
            });
            const skill1d = {
                name: `${skillToShort(skill1)}`,
                children: [],
                color: RGBColors[skill1],
                crew: crew1.filter(f => f.skill_order.length === 1).map(c => c.symbol),
                skills: [skill1]
            } as CircleData;
            skill1d.loc = skill1d.crew.length;
            for (let skill2 of skills) {
                if (skill2 === skill1) continue;
                const crew2 = crew1.filter(f => f.skill_order.length >= 2 && f.skill_order[1] === skill2);
                crew2.sort((a, b) => {
                    let r = b.max_rarity - a.max_rarity;
                    if (!r) r = b.ranks.scores.overall - a.ranks.scores.overall;
                    if (!r) r = a.cab_ov_rank - b.cab_ov_rank;
                    if (!r) r = skillSum(Object.values(b.base_skills)) - skillSum(Object.values(a.base_skills))
                    return r;
                });
                const skill2d = {
                    name: `${skill1d.name}/${skillToShort(skill2)}`,
                    children: [],
                    color: RGBColors[skill2],
                    crew: crew2.filter(f => f.skill_order.length === 2).map(c => c.symbol),
                    skills: [skill1, skill2]
                } as CircleData;
                skill2d.loc = skill2d.crew.length;
                skill1d.children.push(skill2d);
                for (let skill3 of skills) {
                    if (skill1 === skill3 || skill2 === skill3) continue;
                    const crew3 = crew2.filter(f => f.skill_order.length >= 3 && f.skill_order[2] === skill3);
                    crew3.sort((a, b) => {
                        let r = b.max_rarity - a.max_rarity;
                        if (!r) r = b.ranks.scores.overall - a.ranks.scores.overall;
                        if (!r) r = a.cab_ov_rank - b.cab_ov_rank;
                        if (!r) r = skillSum(Object.values(b.base_skills)) - skillSum(Object.values(a.base_skills))
                        return r;
                    });
                    const skill3d = {
                        name: `${skill2d.name}/${skillToShort(skill3)}`,
                        children: [],
                        color: RGBColors[skill3],
                        crew: crew3.filter(f => f.skill_order.length === 3).map(c => c.symbol),
                        skills: [skill1, skill2, skill3]
                    } as CircleData;
                    skill3d.loc = skill3d.crew.length;
                    skill2d.children.push(skill3d);
                }
            }
            circleData.children.push(skill1d);
        }
        return circleData;
    }
}