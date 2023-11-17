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
import { MissionMapComponent } from "./mission_map";

export interface ContinuumComponentProps {
    roster: (PlayerCrew | CrewMember)[];
}

export interface TraitSelection {
    trait: string;
    selected: boolean;
    questId: number;
}

function cleanTraitSelection(quests: Quest[], traits: TraitSelection[]) {
    return traits.filter((trait) => quests.some(q => q.id === trait.questId));
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
    const [quest, setQuest] = React.useState<Quest | undefined>(undefined);
    const [isRemote, setIsRemote] = React.useState<boolean[] | undefined>(undefined);
    const [stages, setStages] = React.useState<NavMapItem[][] | undefined>(undefined);
    const [paths, setPaths] = React.useState<PathInfo[] | undefined>(undefined);
    const [highlighted, setHighlighted] = useStateWithStorage<{ quest: number, challenge: number }[]>('continuum/selected', []);
    const { continuum_missions } = context.core;

    let disc = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionUrl = `/structured/continuum/${continuum_missions.length}.json`;

    const isHighlighted = (item: NavMapItem) => {
        return highlighted.some(h => h.quest === quest?.id && h.challenge === item.id);
    }

    const clickNode = (e: Event, data: ChallengeNodeInfo) => {
        let newHighlights = highlighted.filter(h => h.quest !== quest?.id);

        if (!data.quest.challenges) return;
        let id = data.quest.challenges.find(i => i.id === data.index)?.id ?? -1;

        if (highlighted?.some(h => h.quest === quest?.id && h.challenge === id)) {
            setHighlighted(newHighlights);
            return;
        }

        let map = stages?.map(st => st.find(sa => sa.id === id))?.filter(f => !!f) as NavMapItem[];
        if (!map?.length) return;
        let item = map[0];
        let allHighlights = getHighlightNodesFromNode(item);
        newHighlights = newHighlights.concat(allHighlights?.map(h => {
            return {
                quest: quest?.id ?? -1,
                challenge: h?.id ?? -1
            }
        }));
        setHighlighted(newHighlights);
    }

    const getHighlightNodesFromNode = (node: NavMapItem) => {
        let involved = paths?.filter((path) => {
            if (path.ids.includes(node.id)) {
                return true;
            }
            else {
                return false;
            }
        }) ?? [];

        return [...new Set(involved.map(i => i.ids)?.flat() ?? [])].map(id => quest?.challenges?.find(q => q.id === id))?.filter(q => !!q) ?? [];
    }

    const getCurrentRewards = () => {
        let result = undefined as Reward[] | undefined;

        if (mastery === 0) {
            result = mission?.chain_rewards?.standard?.map(e => e.potential_rewards?.map(le => le as Reward))?.flat()
        }
        else if (mastery === 1) {
            result = mission?.chain_rewards?.elite?.map(e => e.potential_rewards?.map(le => le as Reward))?.flat()
        }
        else if (mastery === 2) {
            result = mission?.chain_rewards?.epic?.map(e => e.potential_rewards?.map(le => le as Reward))?.flat()
        }
        return result;
    }

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
            setStages(Object.values(stages));
            setPaths(pathInfo);
        }
        else if (quest !== undefined) {
            setQuest(undefined);
            setStages(undefined);
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
                if (result.quests) {
                    for (let i = 0; i < result.quests.length; i++) {
                        result.quests[i].challenges = rq[result.quests[i].id].challenges;
                        challenges[i].forEach(ch => {
                            ch.trait_bonuses = [];
                            ch.difficulty_by_mastery = [];
                        });
                        remotes.push(false);
                    }
                }

                setIsRemote(remotes);
                setSelectedTraits(selTraits ?? []);
                setMission(result);
                setDiscoverDate(disc);
                setErrorMsg("");
            })
            .catch((e) => {
                setErrorMsg(e?.toString() + " : " + missionUrl);
            });
    }, []);

    const setRemoteQuest = (quest: Quest) => {
        if (mission?.quests?.length && isRemote?.length === mission?.quests?.length) {
            for (let i = 0; i < mission.quests.length; i++) {
                if (mission.quests[i].id === quest.id) {
                    mission.quests[i] = quest;
                    isRemote[i] = true;

                    setMission({ ...mission });
                    setIsRemote([...isRemote]);

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

                {questIndex !== undefined && !!isRemote &&
                    <QuestImportComponent defaultCollapsed={isRemote[questIndex]} setQuest={setRemoteQuest} quest={quest} questId={quest?.id} setError={setErrorMsg} />
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
                    isRemote={isRemote}
                    questIndex={questIndex}
                    setQuestIndex={setQuestIndex}
                    mastery={mastery}
                    setMastery={setMastery}
                    />}
            </div>
        </>
    );
};
