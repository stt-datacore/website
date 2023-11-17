import React from "react";
import { PlayerCrew, Reward } from "../../model/player";
import { CrewMember } from "../../model/crew";
import { GlobalContext } from "../../context/globalcontext";
import { ContinuumMission } from "../../model/continuum";
import { Mission, MissionChallenge, MissionReward, Quest } from "../../model/missions";
import { Notification } from "../page/notification";
import CONFIG from "../CONFIG";
import { appelate } from "../../utils/misc";
import { ChallengeNode } from "./challenge_node";
import { SearchResults, Step, Table } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { QuestImportComponent } from "./quest_importer";
import { RewardsGrid } from "../crewtables/rewards";
import { ItemHoverStat } from "../hovering/itemhoverstat";
import { CrewHoverStat } from "../hovering/crewhoverstat";
import { NavMapItem, makeNavMap } from "../../utils/episodes";

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
    const [tiers, setTiers] = React.useState<NavMapItem[][] | undefined>(undefined);

    const { continuum_missions } = context.core;
        
    let disc = new Date(
        continuum_missions[continuum_missions.length - 1].discover_date
    );

    const missionUrl = `${process.env.GATSBY_DATACORE_URL}structured/continuum/${continuum_missions.length}.json`;
    
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
            let map = makeNavMap(mquest);

            let tiers = {} as { [key: number]: NavMapItem[] };
            
            for (let item of map) {
                tiers[item.tier] ??= [];
                tiers[item.tier].push(item);
            }
            
            setTiers(Object.values(tiers));

            // console.log(tiers);


            // if (mquest?.mastery_levels?.length && !!mquest.challenges?.length && questIndex !== undefined) {
            //     let normal = mquest.mastery_levels[0];
            //     let elite = mquest.mastery_levels[1];
            //     let epic = mquest.mastery_levels[2];            
            //     if (mquest.challenges) {
            //         mquest.challenges.forEach((ch) => {                         
            //             if (!!ch.critical?.reward?.length && normal.jackpots) {                            
            //                 ch.critical.reward = [normal, elite, epic].map(ml => {
            //                     let jp = ml.jackpots?.find(j => j.id === ch.id);
            //                     if (jp) {
            //                         return jp.reward;
            //                     }
            //                     else {
            //                         return [];
            //                     }
            //                 })?.filter(f => !!f)?.flat();
            //             }
            //         });                
            //     }
            // }
    
            setQuest(mquest);
        }
        else if (quest !== undefined) {
            setQuest(undefined);
        }        
    }, [questIndex])

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
                        challenges[i].forEach(ch => ch.trait_bonuses = []);
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

                    setMission({ ... mission });
                    setIsRemote([ ...isRemote ]);

                    return;
                }
            }
        }
    }

    return (
        <>
            <div>
                <ItemHoverStat targetGroup="continuum_items" />
                <CrewHoverStat targetGroup="continuum_helper" />
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
                <Step.Group fluid>
                    <Step
                        onClick={(e) => setMastery(0)}
                        active={mastery === 0}
                        >
                        <Step.Content>
                            <Step.Title>Standard</Step.Title>
                            <Step.Description style={{maxWidth: "10vw"}} >Standard Difficulty</Step.Description>
                        </Step.Content>
                    </Step>
                    <Step
                        onClick={(e) => setMastery(1)}
                        active={mastery === 1}
                        >
                        <Step.Content>
                            <Step.Title>Elite</Step.Title>
                            <Step.Description style={{maxWidth: "10vw"}} >Elite Difficulty</Step.Description>
                        </Step.Content>
                    </Step>
                    <Step
                        onClick={(e) => setMastery(2)}
                        active={mastery === 2}
                        >
                        <Step.Content>
                            <Step.Title>Epic</Step.Title>
                            <Step.Description style={{maxWidth: "10vw"}} >Epic Difficulty</Step.Description>
                        </Step.Content>
                    </Step>
                </Step.Group>
                <Step.Group fluid>
                    {mission?.quests?.map((quest, idx) => (
                        <Step 
                            key={"quest_" + idx + "_" + quest.id} active={questIndex === idx} 
                            onClick={() => setQuestIndex(idx)}>
                        <Step.Content>
                            <Step.Title>{(isRemote && isRemote[idx] === true) ? <span style={{color:'lightgreen', fontWeight: 'bold'}}>{quest.name}</span> : quest.name}</Step.Title>
                            <Step.Description style={{maxWidth: "10vw"}} >{quest.description}</Step.Description>
                        </Step.Content>
                    </Step>
                    ))}

                </Step.Group>
                {!!quest && typeof questIndex !== 'undefined' &&
                    <div className={"ui segment"}>
                        <Table style={{margin:0, padding:0}}>
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
                                        <h3>{isRemote && isRemote[questIndex] ? <span style={{color:'lightgreen', fontWeight: 'bold'}}>{quest.name}</span> : quest.name}</h3>
                                        <div style={{ margin: "0.5em 0" }}>
                                            {quest.traits_used
                                                ?.map((t) => <i key={"trait_" + t}>{appelate(t)}</i>)
                                                .reduce((p, n) =>
                                                    p ? (
                                                        <>
                                                            {p}, {n}
                                                        </>
                                                    ) : (
                                                        n
                                                    )
                                                )}
                                        </div>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell>
                                    <Table>
                                        <Table.Row>

                                {!!tiers && tiers.map((tier, idx) => (
                                    <Table.Cell key={"table_tier_" + idx}>
                                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                                            {tier.map((item) => (
                                                <div key={'table_tier_item_' + item.id}>
                                                    <ChallengeNode
                                                        targetGroup="continuum_items"
                                                        crewTargetGroup="continuum_helper"
                                                        mastery={mastery}
                                                        style={{ width: "200px", textAlign: "center" }}
                                                        quest={quest}
                                                        index={item.id}
                                                        nokids
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
                                        <hr style={{width: "calc(100% - 10em)"}} />
                                        <h3>Chain Rewards</h3>
                                        <RewardsGrid 
                                            targetGroup="continuum_items"
                                            crewTargetGroup="continuum_helper"
                                            rewards={getCurrentRewards() ?? []} />
                                    </div>

                                </Table.Cell>
                            </Table.Row>
                        </Table>
                    </div>}


            </div>
        </>
    );
};
