import React from "react";
import { Jackpot, MissionChallenge, MissionReward, Quest } from "../../model/missions";
import { RewardsGrid } from "../crewtables/rewards";
import { Reward } from "../../model/player";
import { appelate } from "../../utils/misc";
import CONFIG from "../CONFIG";
import { Icon, Label } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";

export type ChallengeError = {
    message: string;
    context?: any;
}

export interface ChallengeNodeInfo {
    quest: Quest;
    challengeId: number;
    mastery: number;
}

export interface ChallengeNodeProps extends ChallengeNodeInfo {
    highlight?: boolean;
    tapped?: boolean;
    excluded?: boolean;
    style?: React.CSSProperties;
    targetGroup?: string;
    crewTargetGroup?: string;
    error?: ChallengeError;
    showOwnedQuantity?: boolean;
    onClick?: (e: Event, data: ChallengeNodeInfo) => void;
    hasRemoteData: boolean;
}

export const ChallengeNode = (props: ChallengeNodeProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { localized } = globalContext;
    const { t } = localized;
    const { playerData } = globalContext.player;
    const { excluded, tapped, mastery, style, quest, challengeId, targetGroup, crewTargetGroup, error, showOwnedQuantity, hasRemoteData } = props;

    const challenges = React.useMemo(() => {
        return quest.challenges ?? [];
    }, [quest]);

    const challenge = React.useMemo(() => {
        return challenges.find(f => f.id === challengeId) as MissionChallenge;
    }, [challenges, challengeId]);

    const { claimed, reclaimable, rewards, negative } = React.useMemo(() => {
        let reward = undefined as MissionReward | undefined;
        let rc = false;
        let mrc = false;
        let negative = false;
        const idx = quest.challenges?.findIndex(f => f.id === challengeId) ?? 0;
        if (quest.mastery_levels && quest.mastery_levels[mastery] && quest.mastery_levels[mastery].jackpots && quest.mastery_levels[mastery].jackpots?.length) {
            rc = (quest.mastery_levels[mastery].jackpots as Jackpot[])[idx].claimed;
            mrc = !!(quest.mastery_levels[mastery].jackpots as Jackpot[])[idx].can_reclaim;
            reward = (quest.mastery_levels[mastery].jackpots as Jackpot[]).find(j => j.id === challengeId)?.reward[0];
            if (showOwnedQuantity && playerData && reward?.symbol) {
                let item = playerData.player.character.items.find(f => f.symbol === reward!.symbol);
                if (item?.quantity) {
                    (reward as any).owned = item.quantity;
                    //if (item.quantity < 8) negative = true;
                }
            }
        }
        const claimed = rc;
        const reclaimable = mrc;
        const rewards = reward;
        return { claimed, reclaimable, rewards, negative };
    }, [showOwnedQuantity, playerData, mastery, quest, challengeId]);

    const { difficulty, crit } = React.useMemo(() => {
        const difficulty = challenge?.difficulty_by_mastery[mastery] ?? 0;
        const crit = difficulty + ([150, 275, 300][mastery]);
        return { difficulty, crit };
    }, [hasRemoteData, challenge, mastery]);

    const handleClick = (e: React.MouseEvent) => {
        if (props.onClick) {
            props.onClick(e.nativeEvent, {
                quest,
                challengeId,
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

                {tapped && !excluded && <span style={{position:'relative', left: "0px", top: "0px", textAlign: "left"}}><Icon name='star' color='green' size='small' /></span>}
                {tapped && excluded && <span style={{position:'relative', left: "0px", top: "0px", textAlign: "left"}}><Icon name='ban' color='red' size='small' /></span>}

                <b>{challenge.name}</b>
                </span>
                <span style={{ fontSize: "0.9em" }}>
                    {!!difficulty && <b>{difficulty}</b>}
                    {!!crit && <span>&nbsp;(Crit: <b style={{color: CONFIG.RARITIES[5].color}}>{crit}</b>)</span>}
                </span>

                {!!challenge?.trait_bonuses?.length &&
                    <><b>Traits:&nbsp;</b><i>{challenge.trait_bonuses.map((t, idx) => {
                        return <React.Fragment key={'trait_' + idx + t.trait}><br/><i>{localized.TRAIT_NAMES[t.trait]} (+{t.bonuses[mastery]})</i></React.Fragment>
                    })}</i></>
                }
                <img style={{ height: "2em", margin: "0.5em" }} src={`${process.env.VITE_ASSETS_URL}atlas/icon_${challenge.skill}.png`} />
                {!!rewards &&
                    <div>
                        {claimed && <div style={{ marginBottom: '0.5em', fontStyle: 'italic', color: 'lightgreen' }}>({t('missions.claimed')})</div>}
                        {reclaimable && <div style={{ marginBottom: '0.5em', fontStyle: 'italic', color: 'lightgreen' }}>({t('missions.reclaimable')})</div>}
                        <RewardsGrid
                            alwaysShowQuantity={true}
                            negative={negative}
                            altQuantity={renderQuantity}
                            targetGroup={targetGroup}
                            crewTargetGroup={crewTargetGroup}
                            rewards={rewards ? [rewards as Reward] : []} />
                    </div>}
                 {!!error && <Label color='red'>{error.message}</Label>}

            </div>
        </div>
    </div>)

    function renderQuantity(quantity?: number, neg?: boolean, owned?: number, silentZero?: boolean) {
        if (quantity === undefined) return <></>;

        if (owned !== undefined) {
            return (<h4 style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5em'}}>
                <span>{t('items.n_rewarded', { n: quantity })}</span>
                <span style={{color: neg ? 'tomato' : undefined}}>({t('items.n_owned', { n: owned })})</span>
            </h4>)
        }
        return (<h4 style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.5em'}}>
            <span>{t('items.n_rewarded', { n: quantity })}</span>
        </h4>)
    }
}