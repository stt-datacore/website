import React from "react";
import { PlayerCrew, Reward } from "../../model/player";
import { CrewMember, Skill } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { ContinuumMission } from "../../model/continuum";
import { MissionChallenge, Quest } from "../../model/missions";
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

export const ContinuumComponent = (props: ContinuumComponentProps) => {
    const context = React.useContext(GlobalContext);
    if (!context.player.playerData) return <></>
    const [mission, setMission] = React.useState<ContinuumMission | undefined>(
        undefined
    );

    const [discoverDate, setDiscoverDate] = React.useState<Date | undefined>(
        undefined
    );

    const [mastery, setMastery] = useStateWithStorage('continuum/mastery', 0);
    const [errorMsg, setErrorMsg] = React.useState<string | undefined>(undefined);
    const [questIndex, setQuestIndex] = useStateWithStorage('continuum/questIndex', undefined as number | undefined);

    const [selectedTraits, setSelectedTraits] = useStateWithStorage('continuum/selectedTraits', [] as TraitSelection[]);
    const [highlighted, setHighlighted] = useStateWithStorage<HighlightItem[]>('continuum/selected', []);

    const [quest, setQuest] = useStateWithStorage<Quest | undefined>('continuum/currentQuest', undefined);
    const [remoteQuestFlags, setRemoteQuestFlags] = useStateWithStorage<boolean[] | undefined>('continuum/remoteQuestFlags', undefined);
    const [clearFlag, setClearFlag] = React.useState(0);
    const [solverResults, setSolverResults] = React.useState<QuestSolverResult | undefined>(undefined);

    const [idleOnly, setIdleOnly] = useStateWithStorage<boolean>('continuum/idleOnly', true);
    const [considerFrozen, setConsiderFrozen] = useStateWithStorage<boolean>('continuum/considerFrozen', false);
    const [qpOnly, setQpOnly] = useStateWithStorage<boolean>('continuum/qpOnly', false);
    const [ignoreQpConstraint, setIgnoreQpConstraint] = useStateWithStorage<boolean>('continuum/ignoreQpConstraint', false);

    const { continuum_missions } = context.core;

    let disc = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionUrl = `/structured/continuum/${continuum_missions.length}.json`;


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
                let remotes = [] as boolean[];
                let savedRemotes = false;

                if (result.quests?.length && !!quest && !!remoteQuestFlags?.length && remoteQuestFlags.length === result.quests.length) {
                    savedRemotes = true;
                    remotes = remoteQuestFlags;
                }

                if (result.quests) {
                    for (let i = 0; i < result.quests.length; i++) {
                        if (savedRemotes && remotes[i] && quest?.id === result.quests[i].id) {
                            result.quests[i] = quest;
                        }
                        else {
                            result.quests[i].challenges = rq[result.quests[i].id].challenges;
                            remotes.push(false);

                            challenges[i].forEach(ch => {
                                ch.trait_bonuses = [];
                                ch.difficulty_by_mastery = [];
                            });
                        }
                    }
                }

                setRemoteQuestFlags(remotes);
                setSelectedTraits(selTraits ?? []);
                setMission(result);
                setDiscoverDate(disc);
                setErrorMsg("");
            })
            .catch((e) => {
                setErrorMsg(e?.toString() + " : " + missionUrl);
            });
    }, [clearFlag]);

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

                    setMission({ ...mission });
                    setRemoteQuestFlags([...remoteQuestFlags]);
                    
                    return;
                }
            }
        }
    }

    const crewTableCells = [
        // { width: 2, column: 'kwipment', title: 'Current Quipment' },
        { width: 2, column: 'added_kwipment.length', title: 'Suggested Quipment' },
        { width: 2, column: 'metasort', title: 'Computed Skills' },
        { width: 2, column: 'challenges.length', title: 'Challenges' }
    ]

    const renderTableCells = (row: IRosterCrew): JSX.Element => {
        let crew = row as IQuestCrew;
		return (
            <React.Fragment>
                {/* <Table.Cell>
                    <div style={{display:"flex", flexDirection:"row", justifyContent: "flex-start", alignItems: "center"}}>
			            <CrewItemsView crew={crew} quipment={true} />
                    </div>
		        </Table.Cell> */}
                <Table.Cell>
                    <div style={{display:"flex", flexDirection:"row", justifyContent: "flex-start", alignItems: "center"}}>
    			        <CrewItemsView crew={{ ...crew, kwipment: crew.added_kwipment ?? [], kwipment_expiration: [] }} quipment={true} />
                    </div>
		        </Table.Cell>
                <Table.Cell>
                    <div style={{display:"flex", flexDirection:"row", justifyContent: "flex-start", alignItems: "center"}}>
                        {Object.entries(crew.skills).sort(([akey, askill], [bkey, bskill]) => {
                            return (bskill as Skill).core - (askill as Skill).core;                            
                        }).map(([key, skill]) => {                            
                            return <>
                                <CrewStat                                
                                quipmentMode={true}
                                key={"continuum_crew_" + key}
                                skill_name={key}
                                data={skill}
                                scale={0.75}
                            />                          
                            </>
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
                Current Continuum Mission: {discoverDate?.toDateString()}
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

                        </Table>
                        <div style={{ justifyContent: "center", alignItems: "center", display: "flex", flexDirection: "column" }}>
                            <QuestSolverComponent
                                challenges={(highlighted.map(h => quest?.challenges?.filter(ch => ch.id === h.challenge))?.flat() ?? []) as MissionChallenge[]}
                                quest={quest}
                                setResults={setSolverResults}
                                idleOnly={idleOnly}
                                setIdleOnly={setIdleOnly}
                                considerFrozen={considerFrozen}
                                setConsiderFrozen={setConsiderFrozen}
                                qpOnly={qpOnly}
                                setQpOnly={setQpOnly}
                                ignoreQpConstraint={ignoreQpConstraint}
                                setIgnoreQpConstraint={setIgnoreQpConstraint}
                                mastery={mastery} />
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
