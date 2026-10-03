import React from "react";
import { Item, Label } from "semantic-ui-react";
import { PlayerData, TranslateMethod } from "../../model/player";
import { ColorName } from "../fleet/colorname";

export interface PlayerBadgeProps {
    playerData: PlayerData;
    style?: React.CSSProperties;
    t: TranslateMethod;
    openPlayerPanel?: () => void
}

export const PlayerBadge = (props: PlayerBadgeProps) => {
    const { playerData, style, t, openPlayerPanel } = props;

    const { crewLimit, unfrozen, immortal, avatar } = React.useMemo(() => {

        let portrait = `${process.env.VITE_ASSETS_URL}${playerData?.player?.character?.crew_avatar
            ? (playerData?.player?.character?.crew_avatar?.portrait?.file ?? playerData?.player?.character?.crew_avatar?.portrait ?? 'crew_portraits_cm_empty_sm.png')
            : 'crew_portraits_cm_empty_sm.png'}`;

        if (portrait.includes("crew_portraits") && !portrait.endsWith("_sm.png")) {
            portrait = portrait.replace("_icon.png", "_sm.png");
        }

        const crewLimit = playerData?.player.character.crew_limit || 0;
        const unfrozen = playerData?.player.character.crew.filter(f => f.immortal == 0 || f.immortal == -1).length || 0;
        const immortal = playerData?.player.character.crew.filter(f => f.immortal).reduce((p, n) => p + Math.abs(n.immortal!), 0) || 0;

        return { crewLimit, unfrozen, immortal, avatar: portrait };
    }, [playerData]);

    if (!playerData) return <></>;

    return <Item.Group style={{...style, cursor: openPlayerPanel ? 'pointer' : undefined }} onClick={() => openPlayerPanel ? openPlayerPanel() : null}>
        <Item style={{width: '16rem'}}>
            <Item.Content>
                <Item.Header>
                    <div style={{
                        display: 'grid',
                        gridTemplateAreas: `'avatar name' 'avatar badge' 'avatar space' 'starbase starbase'`,
                        alignItems: 'center',
                        gridTemplateColumns: 'auto auto',
                        gridTemplateRows: 'auto auto auto'
                    }}>
                        <img src={avatar} style={{ gridArea: 'avatar', height: '84px', width: 'auto !important', margin: '0 0.5em 0.5em 0', marginTop: 0}} />
                        <div style={{gridArea: 'name'}}>
                            {playerData.player.character.display_name}
                        </div>
                        <div style={{gridArea: 'badge', fontSize: '0.8em' }}>
                            ({t(`global.${playerData.player.fleet.rank.toLowerCase().replace('leader', 'admiral')}`)?.toUpperCase()})
                        </div>
                        <div style={{gridArea: 'starbase', textAlign: 'left', fontSize: '0.75em'}}>
                            {!!playerData.player.fleet?.id && (
                                <p>
                                    <b><ColorName text={playerData.player.fleet.slabel} /></b><br />
                                    {t('player_badge.starbase_level')} {playerData.player.fleet.nstarbase_level}{' '}
                                </p>
                            )}
                        </div>
                    </div>
                </Item.Header>
                <Item.Meta style={{marginLeft: 0, marginTop: "0.25em"}}>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>{t('profile.first_entitlement')} {playerData.calc?.guild_create && new Date(playerData.calc.guild_create).toLocaleDateString() || '?'}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>VIP {playerData.player.vip_level}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>{t('base.level')} {playerData.player.character.level}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>{t("player_badge.n_immortals", { n: `${immortal}`})}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}} title={`${unfrozen} / ${crewLimit}`}>
                        {crewLimit < unfrozen && <span style={{color: 'tomato'}}>!!</span>} {t('player_badge.x_y_crew', { x: `${unfrozen}`, y: `${crewLimit}`})}</Label>
                    <Label style={{marginLeft: 0, marginTop: "0.25em"}}>{ t('player_badge.n_shuttles', { n: `${playerData.player.character.shuttle_bays}` })}</Label>
                </Item.Meta>
            </Item.Content>
        </Item>
    </Item.Group>

}