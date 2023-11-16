import React from "react";
import { MissionChallenge } from "../../model/missions";
import { Grid } from "semantic-ui-react";
import { RewardsGrid } from "../crewtables/rewards";
import { Reward } from "../../model/player";

export interface ChallengeNodeProps {
    challenges: MissionChallenge[];
    index: number;
    mastery: number;
    nokids?: boolean;
    highlight?: boolean;
    style?: React.CSSProperties;
    targetGroup?: string;
	crewTargetGroup?: string;
}

export const ChallengeNode = (props: ChallengeNodeProps) => {

    const { mastery, style, challenges, index, nokids, targetGroup, crewTargetGroup } = props;

    const challenge = challenges.find(f => f.id === index) as MissionChallenge;
    const children = challenges.filter((c) => challenge.children.includes(c.id));

    const rewards = challenge.critical?.reward[mastery];

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
                <img style={{ height: "1.25em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${challenge.skill}.png`} />                
                {!!rewards && <RewardsGrid 
                                targetGroup={targetGroup}
                                crewTargetGroup={crewTargetGroup}
                                rewards={rewards ? [rewards as Reward] : []} />}
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
                            challenges={challenges}
                            index={child.id}
                        />
                    ))
                }
            </div>

        </div>
    </div>)
}