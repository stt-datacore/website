import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavigateFunction, useNavigate } from 'react-router-dom';
import { Icon, Image, Label } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';
import { EquipmentItem } from '../../model/equipment';
import { PlayerData, TranslateMethod } from '../../model/player';
import { CONQUEST_CURRENCY_ICON, REPLICATOR_ICON } from '../../pages/seasonal';
import { getIconPath } from '../../utils/assets';
import { mergeItems } from '../../utils/itemutils';
import { colorToRGBA, printShortDistance } from '../../utils/misc';
import { useStateWithStorage } from '../../utils/storage';
import CONFIG from '../CONFIG';
import { OptionsPanelFlexRow } from '../stats/utils';
import { PlayerBadge } from './playerbadge';
import { AllEnergy, getAllEnergy } from './util';

export interface SaleData {
    slot_sale: boolean;
    honor_sale: boolean;
}

interface PlayerResource {
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

export const PlayerGlance = ({ openPlayerPanel, requestDismiss, narrow, t }: PlayerGlanceProps) => {
    const navigate = useNavigate();
    const { data: saleData } = useSaleData();

    const flexRow = OptionsPanelFlexRow;

    const globalContext = React.useContext(GlobalContext);

    const { isMobile } = globalContext;
    const { playerData, ephemeral } = globalContext.player;
    const { items, crew } = globalContext.core;

    const [costMode, setCostMode] = useStateWithStorage<CostMode>('glanceCostMode', CostMode.Sale, { rememberForever: true });
    const toggleCostMode = React.useCallback(() => {
        setCostMode(mode => mode === CostMode.Normal ? CostMode.Sale : CostMode.Normal);
    }, [setCostMode]);

    const currentEvent = React.useMemo(() => {
        return ephemeral?.events?.find(f => f.victory_points !== undefined && f.seconds_to_start === 0 && f.seconds_to_end > 0);
    }, [ephemeral]);

    const currentEventCrew = React.useMemo(() => {
        if (currentEvent?.featured_crew?.length) {
            return crew.find(f => f.symbol === currentEvent.featured_crew[0].symbol);
        }
        else {
            return undefined;
        }
    }, [currentEvent, crew]);

    const { resources, supplyKit } = React.useMemo(() => {
        if (playerData && ephemeral) {
            const energy = getAllEnergy(playerData, ephemeral);
            const resources = createResources(playerData, energy, items, costMode, toggleCostMode, navigate, t);
            return { resources, supplyKit: energy.supplyKit };
        }
        return {
            resources: [] as PlayerResource[],
            supplyKit: 0
        };
    }, [playerData, ephemeral, items, costMode, toggleCostMode, navigate, t]);

    const shuttleAdventures = currentEvent?.content?.content_type === 'shuttles' ? ephemeral?.shuttleAdventures ?? [] : [];
    const returns = shuttleAdventures
        .filter(f => !!f.shuttles.length)
        .map(a => (a.shuttles[0].expires_in * 1000) + a.reference_timestamp);
    const shuttleSeconds = useMinutesUntil(returns.length ? Math.min(...returns) : undefined) * 60;

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
                {shuttleSeconds > 0 && printShortDistance(undefined, shuttleSeconds, true, t)}
                {shuttleSeconds < 0 && <div style={{ color: 'tomato', fontWeight: 'bold' }}>- {printShortDistance(undefined, -1 * shuttleSeconds, true, t)}</div>}
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
                {resources.map(({ name, symbol, quantity, imageUrls, style, onClick }) => (
                    <div title={name} className={'ui label'} key={symbol} style={{ cursor: onClick ? 'pointer' : undefined, marginLeft: 0, width: '10em', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...style }} onClick={onClick}>
                        <div style={{ width: '8em', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            {imageUrls.map((url) => <Image key={url} size={'tiny'} avatar src={`${process.env.VITE_ASSETS_URL}${url}`} style={{ width: 'auto', height: '24px', marginRight: '0.5em' }} />)}
                        </div>
                        &nbsp;{(quantity || 0).toLocaleString()}
                    </div>
                ))}
            </div>
        </div>
    </div>
    );
};

function createResources(playerData: PlayerData, energy: AllEnergy, items: EquipmentItem[], costMode: CostMode, toggleCostMode: () => void, navigate: NavigateFunction, t: TranslateMethod ) {
    const { money, premium_purchasable, honor, premium_earnable, shuttle_rental_tokens, chrons, ism, quantum, valor, ownedCites, cadet, pvp, conquest_tokens } = energy;
    const ownedRevival = playerData.player.character.items.find(f => f.symbol === 'voyage_revival');
    const coreRevival = items.find(f => f.symbol === 'voyage_revival');
    const revival = ownedRevival && coreRevival ? mergeItems([ownedRevival], [coreRevival])[0] : coreRevival;
    const reps = playerData.player.replicator_limit - playerData.player.replicator_uses_today;

    const honorImg = 'atlas/honor_currency.png';

    const resources: PlayerResource[] = [
        {
            name: t('global.item_types.chronitons'),
            symbol: 'chronitons',
            quantity: chrons,
            imageUrls: ['atlas/energy_icon.png']
        },
        {
            name: t('global.item_types.credits'),
            symbol: 'credits',
            quantity: money,
            imageUrls: ['atlas/soft_currency_icon.png']
        },
        {
            name: t('global.item_types.dilithium'),
            symbol: 'dilithium',
            quantity: premium_purchasable,
            imageUrls: ['atlas/pp_currency_icon.png']
        },
        {
            name: t('global.item_types.merits'),
            symbol: 'merits',
            quantity: premium_earnable,
            imageUrls: ['atlas/pe_currency_icon.png']
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
            quantity: valor,
            imageUrls: ['fleet_boss_battles_icons_fbb_energy_icon.png'],
            onClick: () => navigate('/fbb')
        },
        {
            name: t('global.item_types.quantum'),
            symbol: 'quantum',
            quantity: quantum,
            imageUrls: ['atlas/crew_crafting_energy_detailed_icon.png'],
            onClick: () => navigate('/retrieval')
        },
        {
            name: t('global.item_types.interstellar_medium'),
            symbol: 'interstellar_medium',
            quantity: ism,
            imageUrls: ['atlas/managed_game_coin_detailed_icon.png'],
            onClick: () => navigate('/retrieval')
        },
        {
            name: t('global.item_types.arena_tickets'),
            symbol: 'arena_tickets',
            quantity: pvp,
            imageUrls: ['atlas/fleetmarker_icon.png'],
            onClick: () => navigate('/ships')
        },
        {
            name: t('global.item_types.cadet_challenge_tickets'),
            symbol: 'cadet_challenge_tickets',
            quantity: cadet,
            imageUrls: ['atlas/cadet_icon.png']
        },
        {
            name: t('global.item_types.voyage_consumable'),
            symbol: 'voyage_consumable',
            quantity: revival?.quantity,
            imageUrls: [revival?.imageUrl ?? (revival?.icon ? getIconPath(revival.icon, true) : '')],
            onClick: () => navigate('/voyage')
        },
        {
            name: t('global.item_types.shuttle_token'),
            symbol: 'shuttle_token',
            quantity: shuttle_rental_tokens,
            imageUrls: ['atlas/icon_shuttle_token.png'],
            onClick: () => navigate('/shuttlehelper')
        },
        {
            name: t('global.item_types.conquest_token'),
            symbol: 'conquest_token',
            quantity: conquest_tokens,
            imageUrls: [CONQUEST_CURRENCY_ICON],
            onClick: () => navigate('/seasonal')
        },
        {
            name: t('items.replications_remaining'),
            symbol: 'replications_remaining',
            quantity: reps,
            imageUrls: [REPLICATOR_ICON],
            onClick: () => navigate('/items')
        }
    ];

    ownedCites.forEach((cite, idx) => {
        if (idx === 0 || cite.quantity <= 0) return;
        const item = items.find(f => f.symbol === `honorable_citation_quality${idx}`);

        resources.push({
            name: `${idx}* ` + t('global.item_types.honorable_citation'),
            symbol: `honorable_citation_quality${idx}`,
            quantity: cite.quantity,
            imageUrls: [item?.imageUrl ?? ''],
            style: {
                border: `1.5px solid ${CONFIG.RARITIES[idx].color}`
            },
            onClick: () => navigate('/cite-opt')
        });
    });

    const cite = items.find(f => f.symbol === 'honorable_citation_quality5');
    const cite5Img = cite?.imageUrl ?? '';
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

const MINUTE_MS = 60 * 1000;

/** Whole minutes from `now` until `target`. Rounds away from zero so a shuttle under a minute out still shows "1m" rather than nothing. */
function minutesUntil(target: number, now: number) {
    const ms = target - now;
    return (ms > 0 ? Math.ceil : Math.floor)(ms / MINUTE_MS);
}

/** Minutes until `target` (0 without one), re-rendering only when that value changes. */
function useMinutesUntil(target: number | undefined) {
    const [minutes, setMinutes] = React.useState(() => target === undefined ? 0 : minutesUntil(target, Date.now()));

    React.useLayoutEffect(() => {
        if (target === undefined) return;

        let id: ReturnType<typeof setTimeout>;
        const tick = () => {
            const current = Date.now();
            setMinutes(minutesUntil(target, current));

            // The value only changes when the time left crosses a whole minute, so wake just past the next crossing.
            // Recalculating each time, rather than using an interval, corrects for late timers.
            const msPastMinute = ((target - current) % MINUTE_MS + MINUTE_MS) % MINUTE_MS;
            id = setTimeout(tick, msPastMinute + 1);
        };
        tick();

        // Browsers can throttle or pause timers in the background, so catch up as soon as the page is visible again.
        const onVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return;
            clearTimeout(id);
            tick();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearTimeout(id);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [target]);

    return target === undefined ? 0 : minutes;
}

/** New way of retrieving sale data. Will be moved to common area when refactoring `restracker.tsx`. */
function useSaleData() {
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

/** Old way of retrieving sale data. Will be removed once it's no longer used by `restracker.tsx`. */
export async function loadSaleData() {
    const response = await fetch(`${process.env.VITE_DATACORE_URL}api/sales`);
    const sale = (await response.json()) as SaleData;
    return sale;
}
