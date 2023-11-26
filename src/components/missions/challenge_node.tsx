import React from "react";
import { Jackpot, MissionChallenge, MissionReward, Quest } from "../../model/missions";
import { RewardsGrid } from "../crewtables/rewards";
import { Reward } from "../../model/player";
import { appelate } from "../../utils/misc";
import CONFIG from "../CONFIG";
import { Icon } from "semantic-ui-react";

export interface ChallengeNodeInfo {
    quest: Quest;
    challengeId: number;
    mastery: number;
}

export interface ChallengeNodeProps extends ChallengeNodeInfo {
    highlight?: boolean;
    tapped?: boolean;
    style?: React.CSSProperties;
    targetGroup?: string;
    crewTargetGroup?: string;
    onClick?: (e: Event, data: ChallengeNodeInfo) => void;
}

export const ChallengeNode = (props: ChallengeNodeProps) => {

    const { tapped, mastery, style, quest, challengeId, targetGroup, crewTargetGroup } = props;

    const challenges = quest.challenges ?? [];
    let reward = undefined as MissionReward | undefined;
    let rc = false;
    const idx = quest.challenges?.findIndex(f => f.id === challengeId) ?? 0;

    if (quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
        rc = (quest.mastery_levels[mastery].jackpots as Jackpot[])[idx].claimed;
        reward = (quest.mastery_levels[mastery].jackpots as Jackpot[]).find(j => j.id === challengeId)?.reward[0];
    }

    const challenge = challenges.find(f => f.id === challengeId) as MissionChallenge;
    const children = challenges.filter((c) => challenge.children.includes(c.id));
    const claimed = rc;
    const rewards = reward;

    const difficulty = challenge.difficulty_by_mastery[mastery];
    const crit = difficulty + ([250, 275, 300][mastery]);

    const handleClick = (e: React.MouseEvent) => {
        if (props.onClick) {
            props.onClick(e.nativeEvent, {
                quest,
                challengeId: challengeId,
                mastery
            });
        }
    }

    return (<div>
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: "1em",
            justifyContent: 'center'
        }}>
            <div
                className={'ui segment button' + (!!props.highlight ? ' active' : '')}
                onClick={(e) => handleClick(e)}
                style={{
                    display: 'flex',
                    gap: "0.25em",
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    lineHeight: "1.5em",
                    ...style ?? {}
                }}>
                <span>
                {tapped && <span style={{position:'relative', left: "0px", top: "0px", textAlign: "left"}}><Icon name='star' color='green' size='small' /></span>}
                <b>{challenge.name}</b>
                </span>
                <span style={{ fontSize: "0.9em" }}>
                    {!!difficulty && <b>{difficulty}</b>}
                    {!!crit && <span>&nbsp;(Crit: <b style={{color: CONFIG.RARITIES[5].color}}>{crit}</b>)</span>}
                </span>

                {!!challenge?.trait_bonuses?.length &&
                    <><b>Traits:&nbsp;</b><i>{challenge.trait_bonuses.map((t, idx) => {
                        return <><br/><i>{appelate(t.trait)} (+{t.bonuses[mastery]})</i></>
                    })}</i></>
                }
                <img style={{ height: "2em", margin: "0.5em" }} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${challenge.skill}.png`} />
                {!!rewards &&
                    <div>
                        {claimed && <div style={{ marginBottom: '0.5em', fontStyle: 'italic', color: 'lightgreen' }}>(Claimed)</div>}
                        <RewardsGrid
                            targetGroup={targetGroup}
                            crewTargetGroup={crewTargetGroup}
                            rewards={rewards ? [rewards as Reward] : []} />
                    </div>}
            </div>
        </div>
    </div>)
}