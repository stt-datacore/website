import React from "react";
import { Jackpot, MissionChallenge, MissionReward, Quest } from "../../model/missions";
import { Grid } from "semantic-ui-react";
import { RewardsGrid } from "../crewtables/rewards";
import { Reward } from "../../model/player";
import { appelate } from "../../utils/misc";

export interface ChallengeNodeProps {
    quest: Quest;
    index: number;
    mastery: number;
    nokids?: boolean;
    highlight?: boolean;
    style?: React.CSSProperties;
    targetGroup?: string;
	crewTargetGroup?: string;
}

export const ChallengeNode = (props: ChallengeNodeProps) => {

    const { mastery, style, quest, index, nokids, targetGroup, crewTargetGroup } = props;
    
    const challenges = quest.challenges ?? [];
    let reward = undefined as MissionReward | undefined;
    let rc = false;
    if (quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
        rc = (quest.mastery_levels[mastery].jackpots as Jackpot[])[index].claimed;
        reward = (quest.mastery_levels[mastery].jackpots as Jackpot[]).find(j => j.id === index)?.reward[0];
    }
    
    const challenge = challenges.find(f => f.id === index) as MissionChallenge;
    const children = challenges.filter((c) => challenge.children.includes(c.id));
    const claimed = rc;
    const rewards = reward;

    return (<div>
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: "1em",
            justifyContent: 'center'
        }}>

            <div
                className='ui segment button'
                style={{
                    display: 'flex',
                    gap: "1em",
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'left',
                    lineHeight: "1.5em",
                    ...style ?? {}
                }}>
                <b>{challenge.name}</b>
                {!!challenge?.trait_bonuses?.length &&
                <><b>Traits:&nbsp;</b><i>{challenge.trait_bonuses.map(t => appelate(t.trait)).join(", ")}</i></>
                }
                <img style={{ height: "1.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${challenge.skill}.png`} />                
                {!!rewards && 
                <div>
                    {claimed && <div style={{margin: '0.5em', fontStyle: 'italic'}}>(Reward Claimed)</div>}
                <RewardsGrid                 
                targetGroup={targetGroup}
                crewTargetGroup={crewTargetGroup}
                rewards={rewards ? [rewards as Reward] : []} />
                </div>}
            </div>
            <div style={{
                display: 'flex',
                gap: "1em",
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'left'
            }}>

                {!nokids && !!children?.length &&
                    children.map((child) => (
                        <ChallengeNode 
                            targetGroup={targetGroup}
                            crewTargetGroup={crewTargetGroup}
                            mastery={mastery} 
                            style={style} 
                            key={'challenge_' + challenge.id + "_child" + child.id}
                            quest={quest}
                            index={child.id}
                        />
                    ))
                }
            </div>

        </div>
    </div>)
}