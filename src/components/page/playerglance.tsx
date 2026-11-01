import React from 'react';
import { Icon, Image, Label } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { PlayerData, TranslateMethod } from '../../model/player';
import { EquipmentItem } from '../../model/equipment';
import { getIconPath } from '../../utils/assets';
import { mergeItems } from '../../utils/itemutils';
import { colorToRGBA } from '../../utils/misc';
import { useStateWithStorage } from '../../utils/storage';
import CONFIG from '../CONFIG';
import { OptionsPanelFlexRow } from '../stats/utils';
import { PlayerBadge } from './playerbadge';
import { AllEnergy, getAllEnergy } from './util';
import { CONQUEST_CURRENCY_ICON, REPLICATOR_ICON } from '../../pages/seasonal';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export interface SaleData {
    slot_sale: boolean;
    honor_sale: boolean;
}

export interface PlayerResource {
    name: string;
    symbol: string;
    quantity?: number;
    imageUrls: string[];
    style?: React.CSSProperties;
    onClick?: () => void;
}

enum CostMode {
    Sale = 'sale',
    Normal = 'normal'
}

interface PlayerGlanceProps {
    openPlayerPanel: () => void;
    requestDismiss?: () => void;
    narrow?: boolean;
    t: TranslateMethod;
}

export const PlayerGlance = (props: PlayerGlanceProps) => {
    const navigate = useNavigate();
    const { data: saleData } = useSaleData();

    const flexRow = OptionsPanelFlexRow;

    const globalContext = React.useContext(GlobalContext);
    const { openPlayerPanel, requestDismiss, narrow, t } = props;

    const { isMobile } = globalContext;
    const { playerData, ephemeral } = globalContext.player;
    const { items } = globalContext.core;

    const [costMode, setCostMode] = useStateWithStorage<CostMode>('glanceCostMode', CostMode.Sale, { rememberForever: true });
    const toggleCostMode = React.useCallback(() => {
        setCostMode(mode => mode === CostMode.Normal ? CostMode.Sale : CostMode.Normal);
    }, [setCostMode]);

    const currentEvent = React.useMemo(() => {
        return ephemeral?.events.find(f => f.victory_points !== undefined && f.seconds_to_start === 0 && f.seconds_to_end > 0);
    }, [ephemeral]);

    const currentEventCrew = React.useMemo(() => {
        if (currentEvent?.featured_crew?.length) {
            return globalContext.core.crew.find(f => f.symbol === currentEvent.featured_crew[0].symbol);
        }
        else {
            return undefined;
        }
    }, [currentEvent, globalContext.core.crew]);

    const { resources, energy } = React.useMemo(() => {
        if (playerData && ephemeral) {
            const energy = getAllEnergy(playerData, ephemeral);
            const resources = createResources(playerData, energy, items, costMode, toggleCostMode, navigate, t);
            return { resources, energy };
        }
        return {
            resources: [] as PlayerResource[],
            energy: { supplyKit: 0 } as AllEnergy
        };
    }, [playerData, ephemeral, items, costMode, toggleCostMode, navigate]);

    const shuttleAdventures = currentEvent?.content?.content_type === 'shuttles' ? ephemeral?.shuttleAdventures ?? [] : [];
    const returns = shuttleAdventures
        .filter(f => !!f.shuttles.length)
        .map(a => (a.shuttles[0].expires_in * 1000) + a.reference_timestamp);
    const now = useMinuteClock(!!returns.length);

    // Round away from zero so a shuttle under a minute out still shows "1m" rather than nothing.
    const shuttleMs = returns.length ? Math.min(...returns) - now : 0;
    const shuttleMinutes = (shuttleMs > 0 ? Math.ceil : Math.floor)(shuttleMs / 60000);

    const { supplyKit } = energy;

    if (!playerData) return null;

    return (<div className={'ui segment'}
        style={{
            width: '100%',
            display: 'flex',
            flexDirection: isMobile || narrow ? 'column' : 'row',
            gap: '0.5em',
            justifyContent: isMobile || narrow ? 'center' : 'space-evenly',
            alignItems: 'center'
        }}>

        <Label title={t('menu.player.close_glance')} as='a' corner='right' onClick={requestDismiss}>
            <Icon name='delete' style={{ cursor: 'pointer' }} />
        </Label>

        <PlayerBadge openPlayerPanel={openPlayerPanel} t={t} playerData={playerData} style={{ width: isMobile || narrow ? 'auto' : '600px', margin: '0 2em' }} />

        <div style={{
            display: 'grid',
            gridTemplateAreas: "'v1' 'v2' 'v3'",
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
                <img src={`${process.env.VITE_ASSETS_URL}atlas/victory_point_icon.png`} style={{ height: '2em', margin: 0 }} />
                <h3 style={{ margin: 0 }}>
                    {currentEvent.victory_points?.toLocaleString()}&nbsp;{t('shuttle_helper.event.vp')}
                </h3>
                <h3 style={{ margin: 0 }}>
                    &nbsp;&mdash;&nbsp;
                </h3>
                {!!currentEventCrew && <img src={`${process.env.VITE_ASSETS_URL}${currentEventCrew.imageUrlPortrait}`} style={{ height: '2em', margin: 0 }} />}
                <h3 style={{ margin: 0 }}>
                    {currentEvent.name}
                </h3>
                {!!returns.length && <>&mdash;&nbsp;&nbsp;<img style={{ height: '20px' }} src='/media/shuttle_icon.png' /></>}
                {shuttleMinutes > 0 && printWholeMinutes(shuttleMinutes, t)}
                {shuttleMinutes < 0 && <div style={{ color: 'tomato', fontWeight: 'bold' }}>- {printWholeMinutes(-1 * shuttleMinutes, t)}</div>}
            </div>}
            <div style={{ ...flexRow, gap: '1em', margin: '0', marginBottom: '1em', gridArea: 'v1' }}>
                {!!saleData?.honor_sale && (
                    <div
                        style={{
                            ...flexRow,
                            gap: '0.5em',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: CONFIG.RARITIES[5].color,
                            padding: '0.25em 0.75em',
                            backgroundColor: colorToRGBA(CONFIG.RARITIES[5].color, 0.3)
                        }}>
                        <img src={`${process.env.VITE_ASSETS_URL}atlas/honor_currency.png`} style={{ height: '24px' }} />
                        {t('sales.honor_sale')}
                    </div>
                )}
                {!!saleData?.slot_sale && (
                    <div
                        style={{
                            ...flexRow,
                            gap: '0.5em',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: CONFIG.RARITIES[4].color,
                            padding: '0.25em 0.75em',
                            backgroundColor: colorToRGBA(CONFIG.RARITIES[4].color, 0.3)
                        }}>
                        <img src={`${process.env.VITE_ASSETS_URL}atlas/pp_currency_icon.png`} style={{ height: '24px' }} />
                        {t('sales.slot_sale')}
                    </div>
                )}
                {!!supplyKit && (
                    <div
                        style={{
                            ...flexRow,
                            gap: '0.5em',
                            margin: '0'
                        }}>
                        <img src={`${process.env.VITE_ASSETS_URL}atlas/loot_crate_open.png`} style={{ height: '24px' }} />
                        {t('global.supply_kit_active_n', { n: supplyKit })}
                    </div>
                )}
            </div>
            <div style={{
                gridArea: 'v2',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: isMobile || narrow ? 'center' : 'flex-start',
                gap: '1em'
            }}>
                {resources.map((res) => (
                    <div title={res.name} className={'ui label'} key={`_player_head_resource_${res.symbol}`} style={{ cursor: res.onClick ? 'pointer' : undefined, marginLeft: 0, width: '10em', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...res.style }} onClick={res.onClick}>
                        <div style={{ width: '8em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            {res.imageUrls.map((url) => <Image key={url} size={'tiny'} avatar src={url} style={{ width: 'auto', height: '24px', marginRight: '0.5em' }} />)}
                        </div>
                        &nbsp;{(res.quantity || 0).toLocaleString()}
                    </div>
                ))}
            </div>
        </div>
    </div>
    );
};

function createResources(
    playerData: PlayerData,
    energy: AllEnergy,
    items: EquipmentItem[],
    costMode: CostMode,
    toggleCostMode: () => void,
    navigate: NavigateFunction,
    t: TranslateMethod
) {
    const ownedRevival = playerData.player.character.items.find(f => f.symbol === 'voyage_revival');
    const coreRevival = items.find(f => f.symbol === 'voyage_revival');
    const revival = ownedRevival && coreRevival ? mergeItems([ownedRevival], [coreRevival])[0] : coreRevival;
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
        pvp,
        conquest_tokens
    } = energy;
    const reps = playerData.player.replicator_limit - playerData.player.replicator_uses_today;

    const honorImg = `${process.env.VITE_ASSETS_URL}atlas/honor_currency.png`;

    const resources: PlayerResource[] = [
        {
            name: t('global.item_types.chronitons'),
            symbol: 'chronitons',
            quantity: chrons,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/energy_icon.png`]
        },
        {
            name: t('global.item_types.credits'),
            symbol: 'credits',
            quantity: money,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/soft_currency_icon.png`]
        },
        {
            name: t('global.item_types.dilithium'),
            symbol: 'dilithium',
            quantity: premium_purchasable,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/pp_currency_icon.png`]
        },
        {
            name: t('global.item_types.merits'),
            symbol: 'merits',
            quantity: premium_earnable,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/pe_currency_icon.png`]
        },
        {
            name: t('global.item_types.honor'),
            symbol: 'honor',
            quantity: honor,
            imageUrls: [honorImg]
        },
        {
            name: t('global.item_types.valor'),
            symbol: 'valor',
            quantity: valor ?? 0,
            imageUrls: [`${process.env.VITE_ASSETS_URL}fleet_boss_battles_icons_fbb_energy_icon.png`],
            onClick: () => navigate('/fbb')
        },
        {
            name: t('global.item_types.quantum'),
            symbol: 'quantum',
            quantity: quantum ?? 0,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/crew_crafting_energy_detailed_icon.png`],
            onClick: () => navigate('/retrieval')
        },
        {
            name: t('global.item_types.interstellar_medium'),
            symbol: 'interstellar_medium',
            quantity: ism,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/managed_game_coin_detailed_icon.png`],
            onClick: () => navigate('/retrieval')
        },
        {
            name: t('global.item_types.arena_tickets'),
            symbol: 'arena_tickets',
            quantity: pvp,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/fleetmarker_icon.png`],
            onClick: () => navigate('/ships')
        },
        {
            name: t('global.item_types.cadet_challenge_tickets'),
            symbol: 'cadet_challenge_tickets',
            quantity: cadet,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/cadet_icon.png`]
        },
        {
            name: t('global.item_types.voyage_consumable'),
            symbol: 'voyage_consumable',
            quantity: revival?.quantity ?? 0,
            imageUrls: [`${process.env.VITE_ASSETS_URL}${revival?.imageUrl ?? (revival?.icon ? getIconPath(revival.icon, true) : '')}`],
            onClick: () => navigate('/voyage')
        },
        {
            name: t('global.item_types.shuttle_token'),
            symbol: 'shuttle_token',
            quantity: shuttle_rental_tokens,
            imageUrls: [`${process.env.VITE_ASSETS_URL}atlas/icon_shuttle_token.png`],
            onClick: () => navigate('/shuttlehelper')
        },
        {
            name: t('global.item_types.conquest_token'),
            symbol: 'conquest_token',
            quantity: conquest_tokens,
            imageUrls: [`${process.env.VITE_ASSETS_URL}${CONQUEST_CURRENCY_ICON}`],
            onClick: () => navigate('/seasonal')
        },
        {
            name: t('items.replications_remaining'),
            symbol: 'replications_remaining',
            quantity: reps,
            imageUrls: [`${process.env.VITE_ASSETS_URL}${REPLICATOR_ICON}`],
            onClick: () => navigate('/items')
        }
    ];

    ownedCites.forEach((cite, idx) => {
        if (idx === 0 || cite.quantity <= 0) return;
        const item = items.find(f => f.symbol === `honorable_citation_quality${idx}`);
        const img = `${process.env.VITE_ASSETS_URL}${item?.imageUrl}`;

        resources.push({
            name: `${idx}* ` + t('global.item_types.honorable_citation'),
            symbol: `honorable_citation_quality${idx}`,
            quantity: cite.quantity,
            imageUrls: [img],
            style: {
                border: `1.5px solid ${CONFIG.RARITIES[idx].color}`
            },
            onClick: () => navigate('/cite-opt')
        });
    });

    const cite = items.find(f => f.symbol === 'honorable_citation_quality5');
    const cite5Img = `${process.env.VITE_ASSETS_URL}${cite?.imageUrl}`;
    const potentialCites = Math.floor(honor / (costMode === CostMode.Normal ? 50000 : 40000));

    resources.push({
        name: costMode === CostMode.Normal ? t('global.item_types.potential_cites') : t('global.item_types.potential_cites_honor_sale'),
        symbol: 'potential_cites',
        quantity: potentialCites,
        imageUrls: costMode === CostMode.Normal ? [cite5Img] : [honorImg, cite5Img],
        style: {
            border: `1.5px dashed ${CONFIG.RARITIES[5].color}`
        },
        onClick: toggleCostMode
    });

    return resources;
}

function printWholeMinutes(totalMinutes: number, t: TranslateMethod) {
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    if (days) return `${t('duration.n_d', { days })} ${t('duration.n_h', { hours })}`;
    if (hours) return `${t('duration.n_h', { hours })} ${t('duration.n_m', { minutes })}`;
    return t('duration.n_m', { minutes });
}

/** Current time, re-rendering every minute while `active`. */
function useMinuteClock(active: boolean) {
    const [now, setNow] = React.useState(Date.now);

    React.useEffect(() => {
        if (!active) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 60 * 1000);

        return () => clearInterval(id);
    }, [active]);

    return now;
}

export function useSaleData() {
    return useQuery({
        queryKey: ['sales'],
        staleTime: 15 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchInterval: 30 * 60 * 1000,
        retry: true,
        retryDelay: 60 * 1000,
        meta: { persist: true },
        queryFn: async ({ signal }) => {
            const response = await fetch(`${process.env.VITE_DATACORE_URL}api/sales`, { signal });
            if (!response.ok) throw new Error(`Failed to load sale data: ${response.status} ${response.statusText}`);
            return (await response.json()) as SaleData;
        },
    });
}

/** Old way of retrieving sale data. Can be made private or moved into `useSaleData` once it's no longer used by `restracker.tsx`. */
export async function loadSaleData() {
    const response = await fetch(`${process.env.VITE_DATACORE_URL}api/sales`);
    const sale = (await response.json()) as SaleData;
    return sale;
}
