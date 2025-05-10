import React from "react";
import { PlayerData, TranslateMethod } from "../../model/player";
import { Link } from "gatsby";
import { Item, Label } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { ColorName } from "../fleet/colorname";



export interface PlayerBadgeProps {
    playerData: PlayerData;
    style?: React.CSSProperties;
    t: TranslateMethod;
    openPlayerPanel?: () => void
}

export const PlayerBadge = (props: PlayerBadgeProps) => {
    const { playerData, style, t, openPlayerPanel } = props;
    if (!playerData) return <></>;

    let portrait = `${process.env.GATSBY_ASSETS_URL}${playerData?.player?.character?.crew_avatar
        ? (playerData?.player?.character?.crew_avatar?.portrait?.file ?? playerData?.player?.character?.crew_avatar?.portrait ?? 'crew_portraits_cm_empty_sm.png')
        : 'crew_portraits_cm_empty_sm.png'}`;

    if (portrait.includes("crew_portraits") && !portrait.endsWith("_sm.png")) {
        portrait = portrait.replace("_icon.png", "_sm.png");
    }

    const crewLimit = playerData.player.character.crew_limit;
    const unfrozen = playerData.player.character.crew.filter(f => !f.immortal || f.immortal < 0).length;
    const immortal = playerData.player.character.crew.filter(f => f.immortal).reduce((p, n) => p + Math.abs(n.immortal!), 0);

    const avatar = portrait;

    return <Item.Group style={{...style, cursor: openPlayerPanel ? 'pointer' : undefined }} onClick={() => openPlayerPanel ? openPlayerPanel() : null}>
        <Item>

            <div style={{display: 'inline', textAlign: 'center'}}>
                <img src={avatar} style={{height: '84px', width: 'auto !important', margin: '0.5em', marginTop: 0}} />
            </div>

            <Item.Content>
                <Item.Header>{playerData.player.character.display_name}</Item.Header>
                <Item.Meta style={{marginLeft: 0, marginTop: "0.25em"}}>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>VIP {playerData.player.vip_level}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>{t('base.level')} {playerData.player.character.level}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>{t("player_badge.n_immortals", { n: `${immortal}`})}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}} title={`${unfrozen} / ${crewLimit}`}>
                        {crewLimit < unfrozen && <span style={{color: 'tomato'}}>!!</span>} {t('player_badge.x_y_crew', { x: `${unfrozen}`, y: `${crewLimit}`})}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>{ t('player_badge.n_shuttles', { n: `${playerData.player.character.shuttle_bays}` })}</Label>
                </Item.Meta>
                <Item.Description>
                    {!!playerData.player.fleet?.id && (
                        <p>
                            {/* <Link to={`/fleet_info?fleetid=${playerData.player.fleet.id}`}> */}
                                <b><ColorName text={playerData.player.fleet.slabel} /></b>
                            {/* </Link>{' '} */}
                            <br/>
                            ({t(`global.${playerData.player.fleet.rank.toLowerCase().replace('leader', 'admiral')}`)?.toUpperCase()})<br/> {t('player_badge.starbase_level')} {playerData.player.fleet.nstarbase_level}{' '}
                        </p>
                    )}
                </Item.Description>
            </Item.Content>
        </Item>
    </Item.Group>

}