import React from "react";
import { PlayerCrew, Reward } from "../../model/player";
import { CrewMember } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { ContinuumMission } from "../../model/continuum";
import { Quest } from "../../model/missions";
import { Notification } from "../page/notification";
import { ChallengeNodeInfo } from "./challenge_node";
import { useStateWithStorage } from "../../utils/storage";
import { QuestImportComponent } from "./quest_importer";
import { NavMapItem, PathInfo, getNodePaths, makeNavMap } from "../../utils/episodes";
import { HighlightItem, MissionMapComponent, cleanTraitSelection } from "./mission_map";
import { QuestSolverComponent } from "./solver_component";
import { QuestSolverResult } from "../../model/worker";
import { CrewConfigTable } from "../crewtables/crewconfigtable";

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
            setClearFlag(clearFlag+1);
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
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "0.5em",
                    gap: "0.5em"
                }}>
                <QuestSolverComponent 
                    quest={quest}
                    setResults={setSolverResults}
                    mastery={mastery} />

                </div>

                <CrewConfigTable 
                    rosterCrew={solverResults?.crew ?? []}
                    pageId={'continuum'}
                    rosterType={'profileCrew'}
                    crewFilters={[]}
                />
            </div>
        </>
    );
};
