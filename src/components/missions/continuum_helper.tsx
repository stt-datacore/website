import React, { useState } from "react";
import { PlayerCrew, Reward } from "../../model/player";
import { CrewMember, Skill } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { ContinuumMission } from "../../model/continuum";
import { MissionChallenge, MissionTraitBonus, Quest, QuestFilterConfig } from "../../model/missions";
import { Notification } from "../page/notification";
import { ChallengeNodeInfo } from "./challenge_node";
import { useStateWithStorage } from "../../utils/storage";
import { QuestImportComponent } from "./quest_importer";
import { NavMapItem, PathInfo, getNodePaths, makeNavMap } from "../../utils/episodes";
import { HighlightItem, MissionMapComponent, cleanTraitSelection } from "./mission_map";
import { QuestSolverComponent } from "./solver_component";
import { IQuestCrew, QuestSolverResult } from "../../model/worker";
import { CrewConfigTable } from "../crewtables/crewconfigtable";
import { Checkbox, Grid, Table } from "semantic-ui-react";
import { IRosterCrew } from "../crewtables/model";
import { CrewItemsView } from "../item_presenters/crew_items";
import { Skills } from "../item_presenters/classic_presenter";
import CrewStat from "../crewstat";
import { appelate, arrayIntersect, arrayUnion } from "../../utils/misc";

export interface ContinuumComponentProps {
    roster: (PlayerCrew | CrewMember)[];
}

export interface TraitSelection {
    trait: string;
    selected: boolean;
    questId: number;
}

export interface DiscoveredMissionInfo {
    mission: ContinuumMission;
    remoteQuests: boolean[];
}

export const ContinuumComponent = (props: ContinuumComponentProps) => {

    /* Global Data Check & Initialization */

    const context = React.useContext(GlobalContext);
    if (!context.player.playerData) return <></>

    const { continuum_missions } = context.core;

    const mostRecentDate = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionUrl = `/structured/continuum/${continuum_missions[continuum_missions.length - 1].id}.json`;

    /* Missions Data Initialization & Persistence */

    const [groupedMissions, internalSetGroupedMissions] = useStateWithStorage('continuum/discoveredMissions', [] as DiscoveredMissionInfo[], { rememberForever: true });
    const setGroupedMissions = (value: DiscoveredMissionInfo[]) => {
        value = value.filter(f => f.mission.discover_date.getTime() === mostRecentDate.getTime());
        internalSetGroupedMissions(value);
    }
    const getMissionData = () => {
        return groupedMissions.find(f => f.mission.discover_date?.getTime() === mostRecentDate?.getTime()) ?? (groupedMissions.length ? groupedMissions[groupedMissions.length - 1] : undefined);
    }

    groupedMissions?.forEach(m => {
        if (typeof m.mission.discover_date === 'string') {
            m.mission.discover_date = new Date(m.mission.discover_date);
        }
        if (m.remoteQuests?.length !== m.mission.quests?.length) {
            m.remoteQuests = m.mission.quests?.map(q => false) ?? [];            
        }
    })

    const mlookup = getMissionData();
    const startMission = mlookup?.mission;

    const [remoteQuestFlags, internalSetRemoteQuestFlags] = React.useState<boolean[] | undefined>(mlookup?.remoteQuests);
    const [mission, internalSetMission] = React.useState<ContinuumMission | undefined>(startMission);

    const setRemoteQuestFlags = (value: boolean[]) => {
        let x = 0;
        let data = getMissionData();
        if (!data) return;
        
        data.remoteQuests ??= [];

        for (let q of mission?.quests ?? []) {
            if (data.remoteQuests.length < x) data.remoteQuests.push(false);
            if (value.length < x) value.push(false);
            data.remoteQuests[x] = value[x];
            x++;
        }

        setGroupedMissions([ ...groupedMissions ]);
        internalSetRemoteQuestFlags(data.remoteQuests);
    }

    const setMissionAndRemotes = (value?: ContinuumMission, remotes?: boolean[]) => {
        if (!value) {
            internalSetMission(undefined);
            setRemoteQuestFlags([]);
            return;
        }

        if (!value.discover_date) {
            value.discover_date = mostRecentDate;
        }
        else if (typeof value.discover_date === 'string') {
            value.discover_date = new Date(value.discover_date);
        }

        let ng = [...groupedMissions ];
        const f = groupedMissions.findIndex(f => f.mission.discover_date?.getTime() === value.discover_date?.getTime());

        if (f === -1) {
            ng.push({
                mission: value,
                remoteQuests: remotes ?? value.quests?.map(q => false) ?? []
            });
        }
        else {
            ng[f].mission = value;
            ng[f].remoteQuests = remotes ?? ng[f].remoteQuests ?? value.quests?.map(q => false) ?? [];
        }

        ng.sort((a, b) => {
            if (!a.mission.discover_date) a.mission.discover_date = mostRecentDate;
            if (!b.mission.discover_date) b.mission.discover_date = mostRecentDate;
            return a.mission.discover_date.getTime() - b.mission.discover_date.getTime()
        });

        ng = ng.filter((t, idx) => ng.findIndex(q => q.mission.discover_date?.getTime() === t.mission.discover_date?.getTime()) === idx)
        setGroupedMissions(ng);        
    }

    React.useEffect(() => {
        if (!groupedMissions.length) return;

        let fmission = groupedMissions.find(f => f.mission.discover_date?.getTime() === mostRecentDate?.getTime());

        if (!fmission) {
            fmission = groupedMissions[groupedMissions.length - 1];
        }
        if (!!fmission.mission.quests?.length && fmission.mission.quests.length !== fmission?.remoteQuests?.length) {
            fmission.remoteQuests = fmission.mission.quests.map(q => false);
        }
        internalSetRemoteQuestFlags(fmission.remoteQuests);
        internalSetMission(fmission.mission);
    }, [groupedMissions]);

    /* Component State */

    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const [clearFlag, setClearFlag] = React.useState(0);

    const [questIndex, setQuestIndex] = useStateWithStorage('continuum/questIndex', undefined as number | undefined);
    const [quest, setQuest] = useStateWithStorage<Quest | undefined>('continuum/currentQuest', undefined);

    const [selectedTraits, setSelectedTraits] = useStateWithStorage('continuum/selectedTraits', [] as TraitSelection[]);
    const [highlighted, setHighlighted] = useStateWithStorage<HighlightItem[]>('continuum/selected', []);

    const [solverResults, setSolverResults] = React.useState<QuestSolverResult | undefined>(undefined);
    const [missionConfig, setMissionConfig] = useStateWithStorage<QuestFilterConfig>('continuum/missionConfig', { mastery: 0, idleOnly: true });

    const setIdleOnly = (value: boolean) => {
        setMissionConfig({ ...missionConfig, idleOnly: value });
    }

    const setConsiderFrozen = (value: boolean) => {
        setMissionConfig({ ...missionConfig, considerFrozen: value });
    }
    
    const setQpOnly = (value: boolean) => {
        setMissionConfig({ ...missionConfig, qpOnly: value });
    }
    
    const setIncludeCurrentQp = (value: boolean) => {
        setMissionConfig({ ...missionConfig, includeCurrentQp: value });
    }
    
    const setIgnoreQpConstraint = (value: boolean) => {
        setMissionConfig({ ...missionConfig, ignoreQpConstraint: value });
    }

    const setMastery = (value: number) => {
        setMissionConfig({ ...missionConfig, mastery: value });
    }

    const { mastery, idleOnly, considerFrozen, qpOnly, ignoreQpConstraint, includeCurrentQp } = missionConfig;
    
    /* Component Initialization & State Management */

    React.useEffect(() => {
        if (!!mission?.quests?.length && questIndex !== undefined && questIndex >= 0 && questIndex < (mission?.quests?.length ?? 0)) {
            const mquest = mission.quests[questIndex];
            const navmap = makeNavMap(mquest);
            const pathInfo = getNodePaths(navmap[0], navmap);

            let stages = {} as { [key: number]: NavMapItem[] };

            for (let item of navmap) {
                stages[item.stage] ??= [];
                stages[item.stage].push(item);
            }

            setQuest(mquest);
        }
        else if (quest !== undefined) {
            setQuest(undefined);
        }
    }, [questIndex]);

    React.useEffect(() => {
        if (!!mission?.quests?.length) {
            setQuestIndex(undefined);
            setTimeout(() => setQuestIndex(questIndex ?? 0));
        }
    }, [mission]);

    React.useEffect(() => {
        fetch(missionUrl)
            .then((response) => response.json())
            .then((result: ContinuumMission) => {
                const rq = {} as { [key: number]: Quest };
                const challenges = context.core.missionsfull
                    .filter((mission) =>
                        mission.quests.some((q) => result.quest_ids.includes(q.id))
                    )
                    .map((mission) =>
                        mission.quests.filter((q) => result.quest_ids.includes(q.id))
                    )
                    .flat()
                    .map((q) => {
                        rq[q.id] = q;
                        return q.challenges ?? [];
                    });

                let selTraits = cleanTraitSelection(result?.quests ?? [], selectedTraits);
                let remotes = result?.quests?.map(q => false) ?? [] as boolean[];
                let current = getMissionData();

                if (result.quests?.length && !!quest && !!remoteQuestFlags?.length && remoteQuestFlags.length === result.quests.length) {
                    remotes = remoteQuestFlags;
                }

                if (result.quests) {
                    for (let i = 0; i < result.quests.length; i++) {
                        if (!remotes[i] || 
                            (current?.mission.quests && rq[result.quests[i].id].challenges?.length !== current.mission.quests[i].challenges?.length)) {
                            
                            result.quests[i].challenges = rq[result.quests[i].id].challenges;
                            challenges[i].forEach(ch => {
                                ch.trait_bonuses = [];
                                ch.difficulty_by_mastery = [];
                            });
                            remotes[i] = false;
                        }
                        else if (remotes[i] && current?.mission?.quests) {
                            result.quests[i] = current.mission.quests[i];
                        }
                    }
                }
                if (!result?.discover_date) {                    
                    result.discover_date = current?.mission?.discover_date ?? mostRecentDate;
                }

                if (typeof result.discover_date === 'string') {
                    result.discover_date = new Date(result.discover_date);
                }

                setMissionAndRemotes(result, remotes);
                setSelectedTraits(selTraits ?? []);
                setErrorMsg("");
            })
            .catch((e) => {
                setErrorMsg(e?.toString() + " : " + missionUrl);
            });
    }, [clearFlag]);

    /* Remote */

    const clearRemote = () => {
        setRemoteQuestFlags([]);
        setTimeout(() => {
            setClearFlag(clearFlag + 1);
        });
    }

    const setRemoteQuest = (quest: Quest) => {
        if (mission?.quests?.length && remoteQuestFlags?.length === mission?.quests?.length) {
            for (let i = 0; i < mission.quests.length; i++) {                
                if (mission.quests[i].id === quest.id) {
                    mission.quests[i] = quest;
                    remoteQuestFlags[i] = true;
                    setMissionAndRemotes({ ...mission}, [...remoteQuestFlags]);                    
                    return;
                }
            }
        }
    }

    /* Crew Tables */

    const crewTableCells = [
        { width: 2, column: 'score', title: 'Rank' },
        { width: 2, column: 'added_kwipment.length', title: 'Suggested Quipment' },
        { width: 2, column: 'metasort', title: 'Computed Skills' },
        { width: 2, column: 'challenges.length', title: 'Challenges' }
    ]

    const renderTableCells = (row: IRosterCrew): JSX.Element => {
        let crew = row as IQuestCrew;
		return (
            <React.Fragment>
                <Table.Cell>
                    <div style={{display:"flex", flexDirection:"row", justifyContent: "flex-start", alignItems: "center"}}>
			            {row.score}
                    </div>
		        </Table.Cell>
                <Table.Cell>
                    <div style={{display:"flex", flexDirection:"row", justifyContent: "flex-start", alignItems: "center", minWidth: "192px"}}>
    			        <CrewItemsView printNA={includeCurrentQp ? <>N/A</> : <br />} crew={{ ...crew, kwipment: crew.added_kwipment ?? [], kwipment_expiration: crew.added_kwipment_expiration ?? [] }} quipment={true} />
                    </div>
		        </Table.Cell>
                <Table.Cell>
                        <div style={{display:"flex", flexDirection:"row", justifyContent: "flex-start", alignItems: "flex-start"}}>
                            {Object.entries(crew.skills).sort(([akey, askill], [bkey, bskill]) => {
                                return (bskill as Skill).core - (askill as Skill).core;                            
                            }).map(([key, skill]) => {                            
                                return (
                                    <div style={{display:"flex", flexDirection:"column", justifyContent: "flex-start", alignItems: "center"}}>
                                    <CrewStat                                
                                        quipmentMode={true}
                                        key={"continuum_crew_" + key}
                                        skill_name={key}
                                        data={skill}
                                        scale={0.75}
                                    />                          
                                    {crew.challenges?.map((ch) => {
                                        let challenge = quest?.challenges?.find(f => f.id === ch && f.skill === key);
                                        let ctraits = (arrayIntersect(challenge?.trait_bonuses?.map(t => t.trait) ?? [], crew.traits.concat(crew.traits_hidden))
                                                        .map(ct => challenge?.trait_bonuses?.filter(f => f.trait === ct)))?.flat() as MissionTraitBonus[];
                                        
                                        if (!challenge || !ctraits?.length) {
                                            return <></>
                                        }
                                        return (
                                            <div style={{color:'lightgreen', textAlign:'center', fontWeight:'bold', fontStyle: 'italic', fontSize: "0.75em"}}>
                                            +&nbsp;{ctraits.map(ct => ct.bonuses[mastery]).reduce((p, n) => p + n, 0)}&nbsp;({ctraits.map(ct => <>{appelate(ct.trait)}</>).reduce((p, n) => p ? <>{p}, {n}</> : n)})
                                            </div>)
                                    })}

                                </div>)
                            })}
                    </div>
		        </Table.Cell>
                <Table.Cell>
                    <div style={{display:"flex", flexDirection:"row", justifyContent: "flex-start", alignItems: "center"}}>
                        {crew.challenges?.map((ch) => {
                            let challenge = quest?.challenges?.find(f => f.id === ch);
                            let ctraits = arrayIntersect(challenge?.trait_bonuses?.map(t => t.trait) ?? [], crew.traits.concat(crew.traits_hidden));
                            
                            if (!challenge) {
                                return <></>    
                            }
                            
                            return (
                                <div style={{
                                    display: 'grid', 
                                    gridTemplateAreas: `'image text' 'image traits'`, 
                                    gridTemplateColumns: '32px auto'}}>
                                    <div style={{gridArea: 'image', display:'flex', flexDirection: 'row', alignItems: 'center'}}>
                                        <img style={{height:'16px'}} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${challenge.skill}.png`} />
                                    </div>
                                    <div style={{gridArea: 'text'}}>
                                    <b>{challenge.name}</b>
                                    </div>
                                    <div style={{gridArea: 'traits'}}>
                                    {ctraits?.length ? 
                                        <i style={{color:"lightgreen", fontWeight: "bold"}}>
                                            ({ctraits.map(t => appelate(t)).join(", ")})
                                        </i> 
                                        : <></>}
                                    </div>
                                </div>
                            )
                        }).reduce((p, n) => p ? <div>{p}<br/><br/>{n}</div> : n)}
                    </div>
                </Table.Cell>
            </React.Fragment>)
	}

    /* Render */

    return (
        <>
            <div>
                <Notification
                    header="Work In Progress"
                    content={
                        <p>
                            This page is a work in progress. Some functions and features may
                            be non-functional, incomplete, or missing.
                        </p>
                    }
                    icon="bitbucket"
                    warning={true}
                />

                {questIndex !== undefined && !!remoteQuestFlags &&
                    <QuestImportComponent
                        defaultCollapsed={remoteQuestFlags[questIndex]}
                        setQuest={setRemoteQuest}
                        quest={quest}
                        questId={quest?.id}
                        setError={setErrorMsg}
                        clearQuest={clearRemote}
                    />
                }
                Current Continuum Mission: {mission?.discover_date?.toDateString()}
                <br />
                <div style={{ color: "tomato" }}>{errorMsg}</div>
                <br />

                {mission &&
                    <MissionMapComponent
                        autoTraits={true}
                        pageId={'continuum'}
                        mission={mission}
                        showChainRewards={true}
                        isRemote={remoteQuestFlags}
                        questIndex={questIndex}
                        setQuestIndex={setQuestIndex}
                        mastery={mastery}
                        setMastery={setMastery}
                        selectedTraits={selectedTraits}
                        setSelectedTraits={setSelectedTraits}
                        highlighted={highlighted}
                        setHighlighted={setHighlighted}
                    />}

                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "1em",
                    flexWrap: "wrap",
                    gap: "0.5em"
                }}>

                    <div style={{ display: "inline-block" }}>
                        <Table>
                            <Table.Row>
                                <Table.Cell>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', margin: "0.5em" }}>
                                        <Checkbox checked={idleOnly} onChange={(e, { checked }) => setIdleOnly(!!checked)} />
                                        <span>&nbsp;&nbsp;Only Idle Crew</span>
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: "flex-start", margin: "0.5em" }}>
                                        <Checkbox checked={qpOnly} onChange={(e, { checked }) => setQpOnly(!!checked)} />
                                        <span>&nbsp;&nbsp;Quippable Only</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', margin: "0.5em" }}>
                                        <Checkbox checked={considerFrozen} onChange={(e, { checked }) => setConsiderFrozen(!!checked)} />
                                        <span>&nbsp;&nbsp;Consider Frozen Crew</span>
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', margin: "0.5em", justifyContent: 'flex-start' }}>
                                        <Checkbox checked={ignoreQpConstraint} onChange={(e, { checked }) => setIgnoreQpConstraint(!!checked)} />
                                        <span>&nbsp;&nbsp;Assume Max QBits (Ignore Limit)</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', margin: "0.5em" }}>
                                        <Checkbox checked={includeCurrentQp} onChange={(e, { checked }) => setIncludeCurrentQp(!!checked)} />
                                        <span>&nbsp;&nbsp;Use Current Quipment on Crew</span>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        </Table>
                        <div style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column" }}>
                            <QuestSolverComponent
                                setResults={setSolverResults}
                                setConfig={setMissionConfig}
                                config={{
                                    quest,
                                    challenges: (highlighted.map(h => quest?.challenges?.filter(ch => ch.id === h.challenge))?.flat() ?? []) as MissionChallenge[],
                                    idleOnly,
                                    considerFrozen,
                                    qpOnly,
                                    ignoreQpConstraint,
                                    mastery,
                                    includeCurrentQp                       
                                }}
                                 />
                        </div>
                    </div>
                </div>

                <CrewConfigTable
                    tableConfig={crewTableCells}
                    renderTableCells={renderTableCells}
                    rosterCrew={solverResults?.crew ?? []}
                    pageId={'continuum'}
                    rosterType={'profileCrew'}
                    crewFilters={[]}
                />
            </div>
        </>
    );
};
