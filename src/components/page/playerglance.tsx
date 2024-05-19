import React from "react"
import { GlobalContext } from "../../context/globalcontext"
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { Link, navigate } from "gatsby";
import { Grid, Item, Label, Image } from "semantic-ui-react";
import { PlayerBadge } from "./playerbadge";
import { PlayerData } from "../../model/player";
import { getOwnedCites } from "../../utils/collectionutils";
import CONFIG from "../CONFIG";
import { mergeItems } from "../../utils/itemutils";


export interface PlayerResource {
    name: string,
    symbol?: string,
    quantity: number,
    imageUrl?: string,
    style?: React.CSSProperties;
    click?: (e: any) => void
}



export interface PlayerGlanceProps {
    
}

export const PlayerGlance = (props: PlayerGlanceProps) => {

    const globalContext = React.useContext(GlobalContext);
    const { isMobile } = globalContext;
    const { translation } = globalContext.core;
    const { playerData } = globalContext.player;

    if (!playerData) return <></>;
    
    const currEvent = playerData.player.character.events?.find(f => f.seconds_to_end && f.seconds_to_end > 0);
    const { money, premium_purchasable, honor, premium_earnable, shuttle_rental_tokens } = playerData.player;
    const quantum = playerData?.crew_crafting_root?.energy?.quantity;
    const valor = globalContext.player.ephemeral?.fleetBossBattlesRoot?.fleet_boss_battles_energy?.quantity;
    const ownedCites = getOwnedCites(playerData?.player.character.items ?? [], false);
    let revival = playerData.player.character.items.find(f => f.symbol === 'voyage_revival');
    let coreRevival = globalContext.core.items.find(f => f.symbol === 'voyage_revival')!;
    if (revival && coreRevival) {
        revival = mergeItems([revival], [coreRevival])[0];
    }
    else {
        revival = coreRevival;
    }

    const resources = [] as PlayerResource[];

    resources.push({
        name: 'Credits',
        quantity: money,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/soft_currency_icon.png`
    },
    {
        name: 'Dilithium',
        quantity: premium_purchasable,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/pp_currency_icon.png`
    },
    {
        name: 'Merits',
        quantity: premium_earnable ?? 0,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/pe_currency_icon.png`
    },
    {
        name: 'Honor',
        quantity: honor ?? 0,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/honor_currency.png`
    },
    {
        name: 'Valor',
        quantity: valor ?? 0,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}fleet_boss_battles_icons_fbb_energy_icon.png`,
        click: (e) => navigate('/fbb')
    },
    {
        name: 'Quantum',
        quantity: quantum ?? 0,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/crew_crafting_energy_detailed_icon.png`,
        click: (e) => navigate('/retrieval')
    },
    {
        name: 'Voyage Revival Tokens',
        quantity: revival?.quantity ?? 0,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}${revival.imageUrl}`,
        click: (e) => navigate('/voyage')
    },
    {
        name: 'Shuttle Rental Tokens',
        quantity: shuttle_rental_tokens ?? 0,
        imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/icon_shuttle_token.png`,
        click: (e) => navigate('/shuttlehelper')
    });

    ownedCites.forEach((cite, idx) => {
        if (idx === 0) return;
        if (cite.quantity <= 0) return;
        let item = globalContext.core.items.find(f => f.symbol === `honorable_citation_quality${idx}`);
        const img = `${process.env.GATSBY_ASSETS_URL}${item?.imageUrl}`;
        resources.push({
            name: `${idx}* Citation`,
            quantity: cite.quantity,
            imageUrl: img,
            style: {                
                border: `1.5px solid ${CONFIG.RARITIES[idx].color}`
            },
            click: (e) => navigate('/cite-opt')
        })

    })


    return <div className={'ui segment'} 
        style={{
            width:"100%",
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '0.5em',
            justifyContent: 'space-evenly',
            alignItems: 'center'
        }}>
            <PlayerBadge playerData={playerData} style={{width: isMobile ? '100%' : '600px', margin: '0 2em'}} />
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start',
                gap: '1em'
            }}>
                {resources.map(res => {
                    let click = res.click;
                    return (
                        <div title={res.name} className={'ui label'} key={res.name} style={{cursor: click ? 'pointer' : undefined, marginLeft: 0, width: '10em', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...res.style}} onClick={(e) => click ? click(e) : 0}>
                            <div style={{width: '8em', display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
                                {res.imageUrl && <Image size={'tiny'} avatar src={res.imageUrl} style={{width: 'auto', height: '24px', marginRight: "0.5em"}} />}
                            </div>
                            &nbsp;{res.quantity?.toLocaleString() ?? 0}
                        </div>
                    )
                  
                })}
                
            </div>
        </div>
}