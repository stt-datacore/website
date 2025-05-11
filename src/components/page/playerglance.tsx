import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import { navigate } from "gatsby";
import { Label, Image, Icon } from "semantic-ui-react";
import { PlayerBadge } from "./playerbadge";
import { ISM_ID, PlayerData, TranslateMethod } from "../../model/player";
import { CiteInventory, getOwnedCites } from "../../utils/collectionutils";
import CONFIG from "../CONFIG";
import { mergeItems } from "../../utils/itemutils";
import { useStateWithStorage } from "../../utils/storage";
import { getChrons } from "../../utils/playerutils";
import { CrewHoverStat, CrewTarget } from "../hovering/crewhoverstat";
import { OptionsPanelFlexRow } from "../stats/utils";
import { getIconPath } from "../../utils/assets";
import { IEphemeralData } from "../../context/playercontext";
import { formatRunTime } from "../../utils/misc";

type AllEnergy = {
    money: number,
    premium_purchasable: number,
    honor: number,
    premium_earnable: number,
    shuttle_rental_tokens: number,
    chrons: number,
    ism: number,
    quantum: number | undefined,
    valor: number | undefined,
    ownedCites: CiteInventory[],
    cadet: number,
    pvp: number,
    supplyKit: number;
}

export interface PlayerResource {
    name: string;
    symbol?: string;
    quantity: number;
    imageUrl?: string;
    style?: React.CSSProperties;
    click?: (e: any) => void;
    customRender?: (item: PlayerResource) => JSX.Element;
}

export interface PlayerGlanceProps {
    openPlayerPanel: () => void;
    requestDismiss?: () => void;
    narrow?: boolean;
    t: TranslateMethod
}

type ShuttleData = {
    shuttles: number;
    return: Date;
}

export const PlayerGlance = (props: PlayerGlanceProps) => {
    const flexRow = OptionsPanelFlexRow;

    const globalContext = React.useContext(GlobalContext);
    const { openPlayerPanel, requestDismiss, narrow, t } = props;

    const { isMobile } = globalContext;
    const { playerData, ephemeral } = globalContext.player;

    const [costMode, setCostMode] = useStateWithStorage<'sale' | 'normal'>('glanceCostMode', 'normal', { rememberForever: true })
    const [shuttleData, setShuttleData] = React.useState<ShuttleData | undefined>(undefined);
    const [shuttleSeconds, setShuttleSeconds] = React.useState(0);

    React.useEffect(() => {
        setTimeout(() => {
            initShuttleTime();
        })
    }, [ephemeral]);

    const currentEvent = React.useMemo(() => {
        return ephemeral?.events?.find(f => f.victory_points !== undefined && f.seconds_to_start === 0 && f.seconds_to_end > 0);
    }, [ephemeral]);

    const currentEventCrew = React.useMemo(() => {
        if (currentEvent?.featured_crew?.length) {
            return globalContext.core.crew.find(f => f.symbol === currentEvent.featured_crew[0].symbol)!
        }
        else {
            return undefined;
        }
    }, [currentEvent]);

    const { resources, energy } = React.useMemo(() => {
        if (playerData && ephemeral) {
            const energy = getAllEnergy(playerData, ephemeral);
            const resources = createResources(playerData, energy);
            return { resources, energy };
        }
        return {
            resources: [] as PlayerResource[],
            energy: { supplyKit: 0 } as AllEnergy
        }
    }, [playerData, ephemeral]);

    React.useEffect(() => {
        setTimeout(shuttleTick, 1000);
    }, [shuttleSeconds]);

    const { supplyKit } = energy;

    if (!playerData?.player) return <></>;

    return (<div className={'ui segment'}
        style={{
            width: "100%",
            display: 'flex',
            flexDirection: isMobile || narrow ? 'column' : 'row',
            gap: '0.5em',
            justifyContent: isMobile || narrow ? 'center' : 'space-evenly',
            alignItems: 'center'
        }}>

        <Label title={'Close player at-a-glance panel'} as='a' corner='right' onClick={requestDismiss}>
            <Icon name='delete' style={{ cursor: 'pointer' }} />
        </Label>

        <PlayerBadge openPlayerPanel={openPlayerPanel} t={t} playerData={playerData} style={{ width: isMobile || narrow ? 'auto' : '600px', margin: '0 2em' }} />

        <div style={{
            display: 'grid',
            gridTemplateAreas: `'v1' 'v2' 'v3'`,
            gridTemplateRows: '3em auto 3em'
        }}>
            {!!currentEvent && <div style={{
                gridArea: 'v3',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start',
                marginTop: '1em',
                gap: '0.5em',
                cursor: 'pointer'
            }}
                onClick={() => navigate('/eventplanner')}
                title={currentEvent.name}>
                <img src={`${process.env.GATSBY_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '2em', margin: 0 }} />
                <h3 style={{ margin: 0 }}>
                    {currentEvent.victory_points?.toLocaleString()}&nbsp;{t('shuttle_helper.event.vp')}
                </h3>
                <h3 style={{ margin: 0 }}>
                    &nbsp;&mdash;&nbsp;
                </h3>
                {!!currentEventCrew && <img src={`${process.env.GATSBY_ASSETS_URL}${currentEventCrew.imageUrlPortrait}`} style={{ height: '2em', margin: 0 }} />}
                <h3 style={{ margin: 0 }}>
                    {currentEvent.name}
                </h3>
                {!!shuttleSeconds && <>&mdash;&nbsp;&nbsp;<img style={{height: '20px'}} src={`/media/shuttle_icon.png`} /></>}
                {shuttleSeconds > 0 && formatRunTime(shuttleSeconds, t)}
                {shuttleSeconds < 0 && <div style={{color: 'red', fontWeight: 'bold'}}>{formatRunTime(shuttleSeconds, t)}</div>}
            </div>}
            {!!supplyKit && <div style={{...flexRow, gap: '0.5em', margin: '0', marginBottom: '1em', gridArea: 'v1'}}>
                <img src={`${process.env.GATSBY_ASSETS_URL}atlas/loot_crate_open.png`} style={{height: '24px'}} />
                {t('global.supply_kit_active_n', { n: supplyKit })}
            </div>}
            <div style={{
                gridArea: 'v2',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: isMobile || narrow ? 'center' : 'flex-start',
                gap: '1em'
            }}>
                {resources.map(res => {
                    if (res.customRender) {
                        return res.customRender(res);
                    }
                    let click = res.click;
                    return (
                        <div title={res.name} className={'ui label'} key={res.name} style={{ cursor: click ? 'pointer' : undefined, marginLeft: 0, width: '10em', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...res.style }} onClick={(e) => click ? click(e) : 0}>
                            <div style={{ width: '8em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                {res.imageUrl && <Image size={'tiny'} avatar src={res.imageUrl} style={{ width: 'auto', height: '24px', marginRight: "0.5em" }} />}
                            </div>
                            &nbsp;{res.quantity?.toLocaleString() ?? 0}
                        </div>
                    )
                })}
            </div>
        </div>
    </div>
    )

    function getAllEnergy(playerData: PlayerData, ephemeral: IEphemeralData): AllEnergy {
        const { money, premium_purchasable, honor, premium_earnable, shuttle_rental_tokens } = playerData.player;

        const chrons = getChrons(playerData);
        const ism = playerData?.forte_root.items.find(f => f.id === ISM_ID)?.quantity ?? 0;
        const quantum = playerData.crew_crafting_root?.energy?.quantity;
        const valor = ephemeral?.fleetBossBattlesRoot?.fleet_boss_battles_energy?.quantity;
        const ownedCites = getOwnedCites(playerData?.player.character.items ?? [], false);
        const cadet = playerData?.player.character.cadet_tickets?.current ?? 0;
        const pvp = playerData?.player.character.pvp_tickets?.current ?? 0;
        const supplyKit = ephemeral?.stimpack?.energy_discount ?? 0;

        return {
            money,
            premium_purchasable,
            honor,
            premium_earnable,
            shuttle_rental_tokens,
            chrons,
            ism,
            quantum,
            valor,
            ownedCites,
            cadet,
            pvp,
            supplyKit
        }
    }

    function createResources(playerData: PlayerData, energy: AllEnergy) {
        let revival = playerData.player.character.items.find(f => f.symbol === 'voyage_revival');
        let coreRevival = globalContext.core.items.find(f => f.symbol === 'voyage_revival')!;
        const {
            money,
            premium_purchasable,
            honor,
            premium_earnable,
            shuttle_rental_tokens,
            chrons,
            ism,
            quantum,
            valor,
            ownedCites,
            cadet,
            pvp
        } = energy;

        if (revival && coreRevival) {
            revival = mergeItems([revival], [coreRevival])[0];
        }
        else {
            revival = coreRevival;
        }

        const honorimg = `${process.env.GATSBY_ASSETS_URL}atlas/honor_currency.png`;

        const resources = [
            {
                name: t('global.item_types.chronitons'),
                quantity: chrons,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/energy_icon.png`
            },
            {
                name: t('global.item_types.credits'),
                quantity: money,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/soft_currency_icon.png`
            },
            {
                name: t('global.item_types.dilithium'),
                quantity: premium_purchasable,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/pp_currency_icon.png`
            },
            {
                name: t('global.item_types.merits'),
                quantity: premium_earnable ?? 0,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/pe_currency_icon.png`
            },
            {
                name: t('global.item_types.honor'),
                quantity: honor ?? 0,
                imageUrl: honorimg
            },
            {
                name: t('global.item_types.valor'),
                quantity: valor ?? 0,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}fleet_boss_battles_icons_fbb_energy_icon.png`,
                click: (e) => navigate('/fbb')
            },
            {
                name: t('global.item_types.quantum'),
                quantity: quantum ?? 0,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/crew_crafting_energy_detailed_icon.png`,
                click: (e) => navigate('/retrieval')
            },
            {
                name: t('global.item_types.interstellar_medium'),
                quantity: ism ?? 0,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/managed_game_coin_detailed_icon.png`,
                click: (e) => navigate('/retrieval')
            },
            {
                name: t('global.item_types.arena_tickets'),
                quantity: pvp,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/fleetmarker_icon.png`,
                click: (e) => navigate('/ships')
            },
            {
                name: t('global.item_types.cadet_challenge_tickets'),
                quantity: cadet,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/cadet_icon.png`
            },
            {
                name: t('global.item_types.voyage_consumable'),
                quantity: revival?.quantity ?? 0,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}${revival?.imageUrl ?? (revival.icon ? getIconPath(revival.icon, true) : '')}`,
                click: (e) => navigate('/voyage')
            },
            {
                name: t('global.item_types.shuttle_token'),
                quantity: shuttle_rental_tokens ?? 0,
                imageUrl: `${process.env.GATSBY_ASSETS_URL}atlas/icon_shuttle_token.png`,
                click: (e) => navigate('/shuttlehelper')
            }
        ] as PlayerResource[];

        ownedCites.forEach((cite, idx) => {
            if (idx === 0) return;
            if (cite.quantity <= 0 && idx !== 5) return;
            let item = globalContext.core.items.find(f => f.symbol === `honorable_citation_quality${idx}`);
            const img = `${process.env.GATSBY_ASSETS_URL}${item?.imageUrl}`;

            if (cite.quantity > 0) {
                resources.push({
                    name: `${idx}* ` + t('global.item_types.honorable_citation'),
                    quantity: cite.quantity,
                    imageUrl: img,
                    style: {
                        border: `1.5px solid ${CONFIG.RARITIES[idx].color}`
                    },
                    click: (e) => navigate('/cite-opt')
                });
            }
        });

        const cite = globalContext.core.items.find(f => f.symbol === `honorable_citation_quality5`);
        const cite5img = `${process.env.GATSBY_ASSETS_URL}${cite?.imageUrl}`;
        const p_cites = Math.floor(honor / (costMode === 'normal' ? 50000 : 40000));

        resources.push({
            name: `${costMode === 'normal' ? t('global.item_types.potential_cites') : t('global.item_types.potential_cites_honor_sale')}`,
            quantity: p_cites,
            style: {
                border: `1.5px dashed ${CONFIG.RARITIES[5].color}`
            },
            customRender: (res) => {
                return <div title={res.name} className={'ui label'} key={res.name} style={{ cursor: 'pointer', marginLeft: 0, width: '10em', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...res.style }} onClick={(e) => res.click ? res.click(e) : 0}>
                    <div style={{ width: '8em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Image size={'tiny'} avatar src={honorimg} style={{ width: 'auto', height: '24px', marginRight: "0.5em" }} />
                        <Image size={'tiny'} avatar src={cite5img} style={{ width: 'auto', height: '24px', marginRight: "0.5em" }} />
                    </div>
                    &nbsp;{res.quantity?.toLocaleString() ?? 0}
                </div>
            },
            click: (e) => {
                if (costMode === 'normal') {
                    setCostMode('sale');
                }
                else {
                    setCostMode('normal');
                }
            }
        });

        return resources;
    }

    function initShuttleTime() {
        const { ephemeral } = globalContext.player;
        if (!ephemeral?.shuttleAdventures?.length || currentEvent?.content.content_type !== 'shuttles') {
            setShuttleData(undefined);
            setShuttleSeconds(0);
            return;
        }
        ephemeral.shuttleAdventures.forEach(a => a.reference_timestamp ??= Date.now());

        let adv = [...ephemeral.shuttleAdventures].filter(f => !!f.shuttles.length);
        adv.sort((a, b) => {
            let ad = (a.shuttles[0].expires_in * 1000) + a.reference_timestamp;
            let bd = (b.shuttles[0].expires_in * 1000) + b.reference_timestamp;
            return ad - bd;
        });

        let a = adv[0];
        let ad = new Date((a.shuttles[0].expires_in * 1000) + a.reference_timestamp);

        setShuttleData({
            shuttles: adv.length,
            return: ad
        });
        shuttleTick();
    }

    function shuttleTick() {
        if (!shuttleData) {
            setShuttleSeconds(0);
            return;
        }
        let diff = Math.floor((shuttleData.return.getTime() - Date.now()) / 1000);
        if (diff !== shuttleSeconds) {
            setShuttleSeconds(diff);
        }
    }
}

