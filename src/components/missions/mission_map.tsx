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
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { QuestSelector } from "./quest_selector";
import MapExplanation from "../explanations/mapexplanation";

export interface HighlightItem {
    quest: number,
    challenge: number,
    clicked?: boolean,
    excluded?: boolean;
};

export interface MissionComponentProps {
    mission: Mission | ContinuumMission;

    showSelector?: boolean;

    questId?: number;
    setQuestId?: (value?: number) => void;

    mastery: number;
    setMastery?: (value: number) => void;

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
    const globalcontext = React.useContext(GlobalContext);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const { t } = globalcontext.localized;

    const {
        isRemote,
        mastery,
        setMastery,
        questId,
        setQuestId,
        pageId,
        mission,
        showChainRewards,
        autoTraits,
        selectedTraits,
        setSelectedTraits: internalSetSelectedTraits,
        highlighted,
        setHighlighted,
        showSelector
    } = props;

    const [quest, setQuest] = React.useState<Quest | undefined>(undefined);
    const [stages, setStages] = React.useState<NavMapItem[][] | undefined>(undefined);
    const [paths, setPaths] = React.useState<PathInfo[] | undefined>(undefined);

    const isHighlighted = (item: NavMapItem) => {
        return highlighted.some(h => h.quest === quest?.id && h.challenge === item.id);
    }

    const isExcluded = (item: NavMapItem) => {
        return highlighted.some(h => h.quest === quest?.id && h.challenge === item.id && h.excluded);
    }

    const isTapped = (item: NavMapItem) => {
        return highlighted.some(h => h.quest === quest?.id && h.challenge === item.id && h.clicked);
    }

    const selectChallenge = (data: ChallengeNodeInfo) => {
        let ptrait = [] as TraitSelection[];
        let hasCurrent = !!highlighted.length;

        let newHighlights = highlighted.filter(h => h.quest !== quest?.id) ?? [];
        let currSelection = highlighted.filter(h => h.quest === quest?.id && h.clicked) ?? [];

        if (!data.quest.challenges) return;
        let mch = data.quest.challenges.find(i => i.id === data.challengeId);
        let id = data.quest.challenges.find(i => i.id === data.challengeId)?.id ?? -1;

        let haschildren = !!mch?.children?.length;

        let selNode = highlighted?.find(h => h.quest === quest?.id && h.challenge === id);

        if (selNode && selNode.clicked && (selNode.excluded || !haschildren)) {
            currSelection = currSelection.filter(f => f.challenge !== selNode?.challenge);
        }
        else {
            currSelection = currSelection.filter(f => f.challenge !== selNode?.challenge);

            selNode = {
                quest: data.quest.id,
                challenge: data.challengeId,
                clicked: true,
                excluded: haschildren && selNode?.clicked ? !selNode.excluded : false
            };

            currSelection.push(selNode);
        }

        let selMap = currSelection.map((sel) => {
            let found = stages?.map(st => st.find(sa => sa.id === sel.challenge))?.filter(f => !!f) as NavMapItem[];
            if (found?.length) return found[0];
            return undefined;
        }).filter(f => !!f) as NavMapItem[];

        let allHighlights = getHighlightNodesFromNode(selMap);
        newHighlights = newHighlights.concat(allHighlights?.map(h => {
            let selInCurr = currSelection.some(s => s.challenge === h?.id && s.clicked);
            let exclude = currSelection.some(s => s.challenge === h?.id && s.clicked && s.excluded);
            if (!!autoTraits && !!h?.trait_bonuses?.length && !!quest) {
                ptrait = ptrait.concat(h.trait_bonuses.map(t => {
                    return {
                        trait: t.trait,
                        selected: true,
                        questId: quest.id,
                        clicked: false,
                        excluded: false
                    } as TraitSelection;
                }));
                ptrait = ptrait.filter((p, i) => ptrait.findIndex(x => x.trait === p.trait && x.questId === p.questId) === i);
            }
            return {
                quest: quest?.id ?? -1,
                challenge: h?.id ?? -1,
                selected: currSelection.some(sel => sel.quest === quest?.id && sel.challenge === h?.id && sel.clicked),
                clicked: selInCurr,
                excluded: exclude
            }
        }));

        setHighlighted(newHighlights);

        if (!!autoTraits && !!quest) {
            const newtraits = selectedTraits.filter(t => t.questId !== quest.id).concat(ptrait);
            internalSetSelectedTraits(newtraits);
        }
    }

    const clickNode = (e: Event, data: ChallengeNodeInfo) => {
        selectChallenge(data);
    }
    const setSelectedTraits = (value: TraitSelection[]) => {
        if (!!quest && !!autoTraits && value.some(t => t.clicked) && value[value.length - 1].clicked) {
            let f1 = value.filter(f => f.clicked);
            let f2 = selectedTraits.filter(f => f.clicked);

            if (f1.length && JSON.stringify(f1) != JSON.stringify(f2)) {
                let lastclick = f1[f1.length - 1];
                let ch = quest?.challenges?.filter(f => f.trait_bonuses?.some(t => t.trait === lastclick.trait));
                if (ch?.length) {
                    selectChallenge({
                        quest,
                        challengeId: ch[0].id,
                        mastery
                    });
                }

            }
        }
        else {
            internalSetSelectedTraits(value);
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
        if (!!mission?.quests?.length && questId !== undefined && questId >= 0 && questId < (mission?.quests?.length ?? 0)) {
            const mquest = mission.quests[questId];
            const navmap = makeNavMap(mquest);
            const pathInfo = getNodePaths(navmap[0], navmap);

            let stages = {} as { [key: string]: NavMapItem[] };

            for (let item of navmap) {
                stages[item.stage] ??= [];
                stages[item.stage].push(item);
            }
            Object.keys(stages).forEach((key) => {
                stages[key].sort((a, b) => {
                    let r = a.challenge.grid_y - b.challenge.grid_y;
                    if (!r) r = a.challenge.grid_x - b.challenge.grid_x;
                    return -1 * r;
                })
            })

            setQuest(mquest);
            setStages(Object.values(stages));
            setPaths(pathInfo);
        }
        else if (quest !== undefined) {
            setQuest(undefined);
            setStages(undefined);
        }
    }, [questId]);

    return (
        <>
            <div>
                <ItemHoverStat targetGroup={pageId + "_items"} />
                <CrewHoverStat targetGroup={pageId + "_helper"} />
                {!!showSelector && !!setQuestId && !!setMastery &&
                    <QuestSelector
                        pageId={pageId}
                        mission={mission}
                        questId={questId}
                        setQuestId={setQuestId}
                        mastery={mastery}
                        setMastery={setMastery}
                        highlighted={isRemote}
                    />}
                {!!quest && typeof questId !== 'undefined' &&
                    <div className={"ui segment"}>
                        <Table style={{ margin: 0, padding: 0 }} striped>
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
                                            <div style={{ display: 'flex', width: "100%", flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ width: "32px" }}></div>
                                                <div>
                                                    <h3>{isRemote && isRemote[questId] ? <span style={{ color: 'lightgreen', fontWeight: 'bold' }}>{quest.name}</span> : quest.name}</h3>
                                                </div>
                                                <div>
                                                    <MapExplanation header={t('missons.continuum_mission_map')} />
                                                </div>
                                            </div>

                                            <div style={{ margin: "0.5em 0" }}>
                                                <TraitSelectorComponent
                                                    style={{
                                                        fontSize: "12pt",
                                                        fontStyle: "italic",
                                                        flexDirection: isMobile ? 'column' : 'row'
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
                                            <Table.Body>
                                                {!isMobile &&
                                                    <Table.Row>
                                                        {!!stages && stages.map((tier, idx) => (
                                                            <Table.Cell key={pageId + "table_tier_" + idx}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {tier.map((item) => (
                                                                        <div key={pageId + 'table_tier_item_' + item.id} style={{ margin: "0.5em" }}>
                                                                            <ChallengeNode
                                                                                tapped={isTapped(item)}
                                                                                highlight={isHighlighted(item)}
                                                                                excluded={isExcluded(item)}
                                                                                onClick={clickNode}
                                                                                targetGroup={pageId + "_items"}
                                                                                crewTargetGroup={pageId + "_helper"}
                                                                                mastery={mastery}
                                                                                style={{ width: `${800 / stages.length}px`, textAlign: "center" }}
                                                                                quest={quest}
                                                                                challengeId={item.id}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </Table.Cell>
                                                        ))}
                                                    </Table.Row>}
                                                {isMobile &&
                                                    !!stages && stages.map((tier, idx) => (
                                                        <Table.Row>
                                                            <Table.Cell key={pageId + "table_tier_" + idx}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {tier.map((item) => (
                                                                        <div key={pageId + 'table_tier_item_' + item.id} style={{ margin: "0.5em" }}>
                                                                            <ChallengeNode
                                                                                tapped={isTapped(item)}
                                                                                highlight={isHighlighted(item)}
                                                                                excluded={isExcluded(item)}
                                                                                onClick={clickNode}
                                                                                targetGroup={pageId + "_items"}
                                                                                crewTargetGroup={pageId + "_helper"}
                                                                                mastery={mastery}
                                                                                style={{ width: `${800 / stages.length}px`, textAlign: "center" }}
                                                                                quest={quest}
                                                                                challengeId={item.id}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))
                                                }
                                            </Table.Body>
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
