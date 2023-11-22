import React from "react";
import { Reward } from "../../model/player";
import { GlobalContext } from "../../context/globalcontext";
import { ContinuumMission } from "../../model/continuum";
import { Mission, Quest } from "../../model/missions";
import { ChallengeNode, ChallengeNodeInfo } from "./challenge_node";
import { Step, Table } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { RewardsGrid } from "../crewtables/rewards";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { NavMapItem, PathInfo, getNodePaths, makeNavMap } from "../../utils/episodes";
import { TraitSelection, TraitSelectorComponent } from "./trait_selector";

export interface HighlightItem { 
    quest: number, 
    challenge: number, 
    clicked?: boolean };

export interface MissionComponentProps {
    mission: Mission | ContinuumMission;
    
    questIndex?: number;
    setQuestIndex: (value?: number) => void;
    
    mastery: number;
    setMastery: (value: number) => void;

    highlighted: HighlightItem[];
    setHighlighted: (value: HighlightItem[]) => void;

    selectedTraits: TraitSelection[];
    setSelectedTraits: (value: TraitSelection[]) => void;
    
    isRemote?: boolean[];
    showChainRewards?: boolean;
    pageId: string;
    autoTraits?: boolean;
}

export function cleanTraitSelection(quests: Quest[], traits: TraitSelection[]) {
    return traits.filter((trait) => quests.some(q => q.id === trait.questId));
}

export const MissionMapComponent = (props: MissionComponentProps) => {
    const context = React.useContext(GlobalContext);

    const { 
        isRemote, 
        mastery, 
        setMastery, 
        questIndex, 
        setQuestIndex, 
        pageId, 
        mission, 
        showChainRewards,
        autoTraits,
        selectedTraits,
        setSelectedTraits,
        highlighted,
        setHighlighted
    } = props;

    const [quest, setQuest] = React.useState<Quest | undefined>(undefined);
    const [stages, setStages] = React.useState<NavMapItem[][] | undefined>(undefined);
    const [paths, setPaths] = React.useState<PathInfo[] | undefined>(undefined);

    const isHighlighted = (item: NavMapItem) => {
        return highlighted.some(h => h.quest === quest?.id && h.challenge === item.id);
    }

    const isTapped = (item: NavMapItem) => {
        return highlighted.some(h => h.quest === quest?.id && h.challenge === item.id && h.clicked);
    }

    const clickNode = (e: Event, data: ChallengeNodeInfo) => {
        e.stopPropagation();
        let ptrait = [] as TraitSelection[];
        let newHighlights = highlighted.filter(h => h.quest !== quest?.id) ?? [];
        let currSelection = highlighted.filter(h => h.quest === quest?.id && h.clicked) ?? [];

        if (!data.quest.challenges) return;
        let id = data.quest.challenges.find(i => i.id === data.index)?.id ?? -1;
        
        let selNode = highlighted?.find(h => h.quest === quest?.id && h.challenge === id);
        
        if (selNode && selNode.clicked) {
            currSelection = currSelection.filter(f => f.challenge !== selNode?.challenge);
        }
        else {
            currSelection = currSelection.filter(f => f.challenge !== selNode?.challenge);

            selNode = {
                quest: data.quest.id,
                challenge: data.index,
                clicked: true
            };

            currSelection.push(selNode);
        }

        let map = currSelection.map((sel) => {
            let found = stages?.map(st => st.find(sa => sa.id === sel.challenge))?.filter(f => !!f) as NavMapItem[];
            if (found?.length) return found[0];
            return undefined;
        }).filter(f => !!f) as NavMapItem[];
        
        let allHighlights = getHighlightNodesFromNode(map);      
        
        newHighlights = newHighlights.concat(allHighlights?.map(h => {
            if (!!autoTraits && !!h?.trait_bonuses?.length && !!quest) {
                ptrait = ptrait.concat(h.trait_bonuses.map(t => {
                    return {
                        trait: t.trait,
                        selected: true,
                        questId: quest.id
                    } as TraitSelection;
                }));
                ptrait = ptrait.filter((p, i) => ptrait.findIndex(x => x.trait === p.trait && x.questId === p.questId) === i);
            }
            return {
                quest: quest?.id ?? -1,
                challenge: h?.id ?? -1,
                clicked: currSelection.some(sel => sel.quest === quest?.id && sel.challenge === h?.id && sel.clicked)
            }
        }));

        setHighlighted(newHighlights);

        if (!!autoTraits && !!quest) {
            const newtraits = selectedTraits.filter(t => t.questId !== quest.id).concat(ptrait);
            setSelectedTraits(newtraits);
        }
    }

    const getHighlightNodesFromNode = (nodes: NavMapItem[]) => {
        if (!nodes?.length) return [];

        let involved = paths?.filter((path) => {
            if (nodes.every(n => path.ids.includes(n.id))) {
                return true;
            }
            else {
                return false;
            }
        }) ?? [];

        return [...new Set(involved.map(i => i.ids)?.flat() ?? [])].map(id => quest?.challenges?.find(q => q.id === id))?.filter(q => !!q) ?? [];
    }

    const getContinuumChainRewards = () => {
        let result = undefined as Reward[] | undefined;
        if ("chain_rewards" in mission) {
            if (mastery === 0) {                
                result = mission?.chain_rewards?.standard?.map(e => e.potential_rewards?.map(le => le as Reward))?.flat()
            }
            else if (mastery === 1) {
                result = mission?.chain_rewards?.elite?.map(e => e.potential_rewards?.map(le => le as Reward))?.flat()
            }
            else if (mastery === 2) {
                result = mission?.chain_rewards?.epic?.map(e => e.potential_rewards?.map(le => le as Reward))?.flat()
            }
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

    return (
        <>
            <div>
                <ItemHoverStat targetGroup={pageId + "_items"} />
                <CrewHoverStat targetGroup={pageId + "_helper"} />
                <Step.Group fluid>
                    <Step
                        onClick={(e) => setMastery(0)}
                        active={mastery === 0}
                    >
                        <Step.Content>
                            <Step.Title>Standard</Step.Title>
                            <Step.Description style={{ maxWidth: "10vw" }} >Standard Difficulty</Step.Description>
                        </Step.Content>
                    </Step>
                    <Step
                        onClick={(e) => setMastery(1)}
                        active={mastery === 1}
                    >
                        <Step.Content>
                            <Step.Title>Elite</Step.Title>
                            <Step.Description style={{ maxWidth: "10vw" }} >Elite Difficulty</Step.Description>
                        </Step.Content>
                    </Step>
                    <Step
                        onClick={(e) => setMastery(2)}
                        active={mastery === 2}
                    >
                        <Step.Content>
                            <Step.Title>Epic</Step.Title>
                            <Step.Description style={{ maxWidth: "10vw" }} >Epic Difficulty</Step.Description>
                        </Step.Content>
                    </Step>
                </Step.Group>
                <Step.Group fluid>
                    {mission?.quests?.map((quest, idx) => (
                        <Step
                            key={pageId + "quest_" + idx + "_" + quest.id} active={questIndex === idx}
                            onClick={() => setQuestIndex(idx)}>
                            <Step.Content>
                                <Step.Title>{(isRemote && isRemote[idx] === true) ? <span style={{ color: 'lightgreen', fontWeight: 'bold' }}>{quest.name}</span> : quest.name}</Step.Title>
                                <Step.Description style={{ maxWidth: "10vw" }} >{quest.description}</Step.Description>
                            </Step.Content>
                        </Step>
                    ))}

                </Step.Group>
                {!!quest && typeof questIndex !== 'undefined' &&
                <div className={"ui segment"}>
                    <Table style={{ margin: 0, padding: 0 }}>
                        <Table.Body>
                            <Table.Row>
                                <Table.Cell>
                                    <div
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                        }}
                                    >
                                        <h3>{isRemote && isRemote[questIndex] ? <span style={{ color: 'lightgreen', fontWeight: 'bold' }}>{quest.name}</span> : quest.name}</h3>
                                        <div style={{ margin: "0.5em 0" }}>                                    
                                            <TraitSelectorComponent
                                                style={{
                                                    fontSize: "12pt",
                                                    fontStyle: "italic"
                                                }}
                                                questId={quest.id}
                                                traits={quest.traits_used ?? []}
                                                setSelectedTraits={setSelectedTraits}
                                                selectedTraits={selectedTraits}
                                            />
                                        </div>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>
                                    <Table>
                                        <Table.Row>
                                            {!!stages && stages.map((tier, idx) => (
                                                <Table.Cell key={pageId + "table_tier_" + idx}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                        {tier.map((item) => (
                                                            <div key={pageId + 'table_tier_item_' + item.id} style={{ margin: "0.5em" }}>
                                                                <ChallengeNode
                                                                    tapped={isTapped(item)}
                                                                    highlight={isHighlighted(item)}
                                                                    onClick={clickNode}
                                                                    targetGroup={pageId + "_items"}
                                                                    crewTargetGroup={pageId + "_helper"}
                                                                    mastery={mastery}
                                                                    style={{ width: `${800 / stages.length}px`, textAlign: "center" }}
                                                                    quest={quest}
                                                                    index={item.id}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Table.Cell>
                                            ))}
                                        </Table.Row>
                                    </Table>
                                </Table.Cell>

                            </Table.Row>
                            {showChainRewards && "chain_rewards" in mission &&
                                <Table.Row>
                                    <Table.Cell>

                                        <div
                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                            }}
                                        >
                                            <hr style={{ width: "calc(100% - 10em)" }} />
                                            <h3>Chain Rewards</h3>
                                            <RewardsGrid
                                                targetGroup="continuum_items"
                                                crewTargetGroup="continuum_helper"
                                                rewards={getContinuumChainRewards() ?? []} />
                                        </div>

                                    </Table.Cell>
                                </Table.Row>}
                            </Table.Body>
                        </Table>
                    </div>}


            </div>
        </>
    );
};
