import React from "react";
import { Accordion, Button, Checkbox, Dropdown, DropdownItemProps, Grid, Icon, Input, Label, SemanticICONS } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { WorkerContext } from "../../context/workercontext";
import { BossEffect, BossShip } from "../../model/boss";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { BattleMode, DefaultAdvancedCrewPower, Ship, ShipRankingMethod } from "../../model/ship";
import { ShipWorkerConfig, ShipWorkerItem, ShipWorkerTransportItem } from "../../model/worker";
import { getHighest, prepareOne } from "../../utils/crewutils";
import { getEventData } from "../../utils/events";
import { formatRunTime } from "../../utils/misc";
import { compareShipResults, getBosses, getCrewDivisions, getShipDivision, getShipsInUse, mergeRefShips } from "../../utils/shiputils";
import { useStateWithStorage } from "../../utils/storage";
import { CrewDropDown } from "../base/crewdropdown";
import CONFIG from "../CONFIG";
import { IEventData } from "../eventplanner/model";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import AdvancedCrewPowerPopup from "./advancedpower";
import { BattleGraph } from "./battlegraph";
import { ShipMultiWorkerContext, ShipMultiWorkerStatus } from "./shipmultiworker";

export interface RosterCalcProps {
    pageId: string;
    ships: Ship[],
    shipIdx?: number,
    crew: (CrewMember | PlayerCrew)[],
    crewStations: (PlayerCrew | CrewMember | undefined)[],
    setCrewStations: (value: (PlayerCrew | undefined)[]) => void
    considerFrozen: boolean;
    setConsiderFrozen: (value: boolean) => void;
    onlyImmortal: boolean;
    setOnlyImmortal: (value: boolean) => void;
    considerUnowned: boolean;
    setConsiderUnowned: (value: boolean) => void;
    ignoreSkills: boolean;
    setIgnoreSkills: (value: boolean) => void;
    useOpponents: BattleMode | false;
    setUseOpponents: (value: BattleMode | false) => void;
    opponentStations: (PlayerCrew | CrewMember | undefined)[],
    opponentShip?: Ship
    asMaxed: boolean;
    setAsMaxed: (value: boolean) => void;
}

interface BattleConfig {
    defense?: number;
    offense?: number;
    opponent?: Ship;
    effects?: BossEffect[];
}

export const ShipRosterCalc = (props: RosterCalcProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const globalContext = React.useContext(GlobalContext);
    const { playerShips } = globalContext.player;
    const workerContext = React.useContext(WorkerContext);
    const multiWorker = React.useContext(ShipMultiWorkerContext);
    const { running, runWorker, cancel } = multiWorker;
    //const { running, runWorker, cancel } = workerContext;
    const { t, tfmt } = globalContext.localized;
    const { asMaxed, setAsMaxed, ships, crew, opponentStations, opponentShip, setUseOpponents, crewStations, setCrewStations, pageId, considerFrozen, ignoreSkills, setIgnoreSkills, setConsiderFrozen, considerUnowned, setConsiderUnowned, onlyImmortal, setOnlyImmortal } = props;
    const shipIdx = props.shipIdx ?? 0;
    const ship = ships[shipIdx];
    const [windowLoaded, setWindowLoaded] = React.useState(false);
    const [hideGraph, setHideGraph] = React.useState(true);
    const [battleConfig, setBattleConfig] = React.useState<BattleConfig>({});
    const [resultIdx, setResultIdx] = React.useState<number | undefined>(undefined);
    const [results, setResults] = React.useState<ShipWorkerItem[]>([]);
    const [lastBattleMode, setLastBattleMode] = useStateWithStorage<BattleMode | null>(`${pageId}/${ship.symbol}/lastBattleMode`, null, { rememberForever: true });
    const [battleMode, setBattleMode] = useStateWithStorage<BattleMode>(`${pageId}/${ship.symbol}/battleMode`, lastBattleMode ?? 'pvp');
    const [powerDepth, internalSetPowerDepth] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/powerDepth`, 1, { rememberForever: true });
    const [minRarity, setMinRarity] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/minRarity`, ship.rarity - 1, { rememberForever: true });
    const [advancedOpen, setAdvancedOpen] = useStateWithStorage<boolean>(`${pageId}/${ship.symbol}/advancedOpen`, false, { rememberForever: true });
    const [exhaustiveMode, setExhaustiveMode] = useStateWithStorage<boolean>(`${pageId}/${ship.symbol}/quickMode`, true, { rememberForever: true });
    const [buffUnownedShips, setBuffUnownedShips] = useStateWithStorage<boolean>(`${pageId}/${ship.symbol}/buffUnownedShips`, true, { rememberForever: true });
    const [applyBossEffects, setApplyBossEffects] = useStateWithStorage<boolean>(`${pageId}/${ship.symbol}/applyBossEffects`, false, { rememberForever: true });
    const [verbose, setVerbose] = useStateWithStorage<boolean>(`${pageId}/${ship.symbol}/verbose`, true, { rememberForever: true });
    // const [simulate, setSimulate] = useStateWithStorage<boolean>(`${pageId}/${ship.symbol}/simulate`, false, { rememberForever: true });
    // const [iterations, setIterations] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/simulation_iterations`, 100, { rememberForever: true });
    const [rate, setRate] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/rate`, 1, { rememberForever: true });
    const [variance, setVariance] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/variance`, 0.2, { rememberForever: true });
    const [fixedActivationDelay, setFixedActivationDelay] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/fixedActivationDelay`, 0.6, { rememberForever: true });
    const [maxInitTime, setMaxInitTime] = useStateWithStorage<number | undefined>(`${pageId}/${ship.symbol}/maxInitTime`, undefined, { rememberForever: true });
    const [minInitTime, setMinInitTime] = useStateWithStorage<number | undefined>(`${pageId}/${ship.symbol}/minInitTime`, undefined, { rememberForever: true });
    const [maxIter, setMaxIter] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/maxIter`, 3000000, { rememberForever: true });
    const [activationOffsets, setActivationOffsets] = useStateWithStorage<number[]>(`${pageId}/${ship.symbol}/activationOffsets`, ship.battle_stations!.map(m => 0), { rememberForever: true });
    const [advancedPowerOpen, setAdvancedPowerOpen] = React.useState<boolean>(false);
    const [advancedPowerSettings, setAdvancedPowerSettings] = useStateWithStorage(`${pageId}/${ship.symbol}/advancedPower`, DefaultAdvancedCrewPower, { rememberForever: true });
    const [progressMsg, setProgressMsg] = React.useState<string>('');
    const battleModes = [] as DropdownItemProps[];
    const fbb_mode = !['skirmish', 'pvp'].includes(battleMode);

    const [rankingMethod, setRankingMethod] = useStateWithStorage<ShipRankingMethod>(`${pageId}/${ship.symbol}/rankingMethod/short`, 'delta_t', { rememberForever: true });
    const [fbbRankingMethod, setFBBRankingMethod] = useStateWithStorage<ShipRankingMethod>(`${pageId}/${ship.symbol}/rankingMethod/long`, 'standard', { rememberForever: true });

    const [gameEvents, setGameEvents] = React.useState<IEventData[]>([]);
    const [currentEvent, setCurrentEvent] = React.useState<IEventData | undefined>(undefined);
    const [eventCrew, setEventCrew] = React.useState<(PlayerCrew | CrewMember)[] | undefined>(undefined);
    const [chosenCrew, setChosenCrew] = React.useState<number[] | undefined>(undefined);
    const [numWorkers, setNumWorkers] = useStateWithStorage<number>(`${pageId}/max_workers`, navigator?.hardwareConcurrency ? navigator?.hardwareConcurrency / 2 : 1, { rememberForever: true });
    const [crewEstimate, setCrewEstimate] = React.useState<number>(0);

    const selectEvent = (symbol: string) => {
        let f = gameEvents.find(f => f.symbol === symbol);
        if (f) setCurrentEvent(f);
    }

    const setPowerDepth = (value: number | 'advanced') => {
        if (value === 'advanced') {
            setAdvancedPowerOpen(true);
        }
        else {
            internalSetPowerDepth(value);
            if (!advancedPowerSettings.ability_exclusions?.length) {
                advancedPowerSettings.ability_exclusions = Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE).map(m => false);
            }
            setAdvancedPowerSettings({
                accuracy_depth: value,
                evasion_depth: value,
                attack_depth: value,
                ability_depths: Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE).map(m => m === '2' ? null : value),
                ability_exclusions: [...advancedPowerSettings.ability_exclusions]
            });
        }
    }

    const getPowerDepth = () => {
        if (!advancedPowerSettings.ability_depths.every(e => e === null || e === powerDepth)) return 'advanced';
        if (advancedPowerSettings.attack_depth === powerDepth &&
            advancedPowerSettings.evasion_depth === powerDepth &&
            advancedPowerSettings.accuracy_depth === powerDepth
        ) return powerDepth;
        else if (advancedPowerSettings.evasion_depth !== null && advancedPowerSettings.attack_depth === advancedPowerSettings.evasion_depth &&
            advancedPowerSettings.accuracy_depth === advancedPowerSettings.evasion_depth
        ) {
            if (powerDepth !== advancedPowerSettings.evasion_depth) {
                setPowerDepth(advancedPowerSettings.accuracy_depth);
            }
            return advancedPowerSettings.accuracy_depth;
        }
        return 'advanced';
    }

    const eventList = gameEvents?.map((ev) => {
        return {
            key: `${ev.symbol}_event`,
            value: `${ev.symbol}`,
            text: ev.name
        }
    });

    (globalContext.player.playerData ? ['pvp',
        //'skirmish',
        'fbb_0', 'fbb_1', 'fbb_2', 'fbb_3', 'fbb_4', 'fbb_5'] : ['pvp']).forEach((mode) => {
        if (mode === 'skirmish' && !globalContext.player.ephemeral?.events?.length) return;
        let rarity = 0;
        if (mode.startsWith('fbb')) {
            let sp = mode.split("_");
            rarity = Number.parseInt(sp[1]);
            if (ship) {
                if (rarity === 5 && ship.rarity !== 5) return;
                if (rarity === 4 && ship.rarity < 4) return;
                if (rarity === 3 && (ship.rarity < 3 || ship.rarity > 4)) return;
                if (rarity === 2 && (ship.rarity < 2 || ship.rarity > 4)) return;
                if (rarity === 1 && ship.rarity > 3) return;
                if (rarity === 0 && ship.rarity > 2) return;
            }
        }
        battleModes.push({
            key: mode,
            value: mode,
            text: t(`ship.${mode.startsWith('fbb') ? 'fbb' : mode}`) + (mode.startsWith('fbb') ? ` ${rarity + 1}*` : '')
        });
    });

    const suggOpts = results?.map((sug, idx) => {
        return {
            key: `_sug_${idx}`,
            value: idx,
            text: sug.crew.map(c => c.name).join(", "),
            content: renderBattleResult(sug, idx)
        }
    });

    const powerDepths = [0, 1, 2, 3, 4, 'advanced'].map((pd) => ({
        key: `pd_${pd}`,
        value: pd,
        text: `${pd === 'advanced' ? t('ship.calc.advanced.power_depth') : pd}`
    }));

    const rarities = [] as DropdownItemProps[];
    for (let r = 1; r <= ship.rarity; r++) {
        rarities.push({
            key: `rare_${r}`,
            value: r,
            text: `${r}*`
        })
    }

    const worker_sel = [] as DropdownItemProps[];
    let work_total = navigator?.hardwareConcurrency ?? 1;
    for (let i = 1; i <= work_total; i++) {
        let bgcolor = '';
        let fgcolor = '';
        if (i <= work_total / 2) {
            bgcolor = 'darkgreen';
            fgcolor = 'white';
        }
        else if (i <= (work_total * 0.75)) {
            bgcolor = 'goldenrod';
            fgcolor = 'black';
        }
        else {
            bgcolor = 'tomato';
            fgcolor = 'white';
        }

        worker_sel.push({
            key: `workers_${i}`,
            value: i,
            text: `${i}`,
            content: <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'stretch',
                margin: 0,
                padding: '0.5em 1em',
                backgroundColor: bgcolor,
                color: fgcolor
            }}>
                {i}
            </div>
        })
    }

    const variances = [] as DropdownItemProps[];

    [0, 0.05, 0.1, 0.15, 0.2].forEach((variance) => {
        variances.push({
            key: `variance_${variance}`,
            value: variance,
            text: `${t('global.n_%', { n: Math.round(variance * 100) })}`
        })
    })

    const rates = [] as DropdownItemProps[];
    [1, 2, 5, 10, 50, 100].forEach((rate) => {
        rates.push({
            key: `rate_${rate}`,
            value: rate,
            text: `${rate}`
        })
    });

    const delays = [] as DropdownItemProps[];
    [0.2, 0.3, 0.4, 0.5, 0.6].forEach((rate) => {
        delays.push({
            key: `delay_${rate}`,
            value: rate,
            text: `${rate}`
        })
    });
    const max_init_times = [] as DropdownItemProps[];
    max_init_times.push({
        key: `none`,
        value: 'none',
        text: t('global.none')
    });
    for (let i = 0; i < 15; i++) {
        max_init_times.push({
            key: `init_${i}`,
            value: i,
            text: `${i}`
        });
    }
    const ranking_methods = [{
        key: `ranking_standard`,
        value: 'standard',
        text: t('ranking_method.standard')
    },
    {
        key: `ranking_min`,
        value: 'min',
        text: t('ranking_method.guaranteed_minimum')
    },
    {
        key: `ranking_max`,
        value: 'max',
        text: t('ranking_method.moonshot')
    },
    {
        key: `ranking_lean_in`,
        value: 'lean_in',
        text: t('ranking_method.lean_in')
    },
    {
        key: `ranking_lean_over`,
        value: 'lean_over',
        text: t('ranking_method.lean_over')
    },
    {
        key: `ranking_lean_out`,
        value: 'lean_out',
        text: t('ranking_method.lean_out')
    },
    {
        key: `ranking_delta`,
        value: 'delta_t',
        text: t('ranking_method.delta_t')
    },
    {
        key: `early_boom`,
        value: 'early_boom',
        text: t('ranking_method.early_boom')
    }] as DropdownItemProps[]

    const sectionStyle = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        margin: '1em',
        marginTop: '2em',
        gap: '1em'
    } as React.CSSProperties;

    React.useEffect(() => {
        if (!hideGraph) {
            recommend(true);
        }
    }, [hideGraph]);

    React.useEffect(() => {
        const newconfig = { ...battleConfig };
        newconfig.defense = 0;
        newconfig.offense = 0;
        if (battleMode === 'skirmish') {
            setBattleMode('pvp');
            return;
        }
        if (globalContext.player.playerData) {
            if (battleMode.startsWith('fbb')) {
                let bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'fbb_boss_ship_attack');
                newconfig.defense = bs?.value ?? 0;
                bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'fbb_player_ship_attack');
                newconfig.offense = bs?.value ?? 0;
            }
        }
        else {
            if (battleMode.startsWith('fbb') && buffUnownedShips) {
                newconfig.defense = 0.528;
                newconfig.offense = 0.528;
            }
        }

        delete newconfig.effects;

        if (battleMode.startsWith('fbb')) {
            let rarity = Number.parseInt(battleMode.slice(4));
            let bossData = globalContext.player.ephemeral?.fleetBossBattlesRoot?.statuses.find(gr => gr.desc_id === rarity + 1);
            let boss = bossData?.boss_ship;
            if (boss) {
                if (bossData?.combo?.active_effects?.length) {
                    newconfig.effects = structuredClone(bossData.combo.active_effects);
                }
                boss = structuredClone(boss) as BossShip;
                boss.rarity = rarity;
            }
            newconfig.opponent = boss;
        }
        else {
            newconfig.opponent = createOpponent();
        }

        setBattleConfig(newconfig);

        // if (battleMode === 'skirmish') {
        //     if (globalContext.player.playerData && globalContext.core.crew?.length && !gameEvents.length) {
        //         const gev = [] as IEventData[];

        //         globalContext.player.ephemeral?.events?.forEach((ev) => {
        //             if (ev.content_types.includes('skirmish')) {
        //                 let eventData = getEventData(ev, globalContext.core.crew);
        //                 if (eventData) {
        //                     gev.push(eventData);
        //                 }
        //             }
        //         });
        //         if (gev.length) {
        //             setGameEvents(gev);
        //             if (!currentEvent || !gev.some(ev => ev.symbol === currentEvent?.symbol)) setCurrentEvent(gev[0]);
        //         }
        //     }
        // }
        if (!battleMode.startsWith('fbb')) {
            setUseOpponents(battleMode);
        }
        else {
            setUseOpponents(false);
        }
    }, [battleMode, opponentShip, opponentStations]);

    React.useEffect(() => {
        if (currentEvent) {
            const { crew: playerCrew } = globalContext.player.playerData!.player.character;
            const { unOwnedCrew: coreCrew } = globalContext.player.playerData!.player.character;

            const newcrew = [] as (PlayerCrew | CrewMember)[];
            if (currentEvent.featured.length || currentEvent.bonus.length) {
                for (let symbol of [ ...currentEvent.featured, ...currentEvent.bonus]) {
                    if (newcrew.some(c => c.symbol === symbol)) continue;
                    let search = playerCrew.filter(f => f.symbol === symbol);
                    if (search.length) {
                        let best = getHighest(search)!;
                        if (ignoreSkills || ship.battle_stations?.some(bs => best.skill_order.includes(bs.skill))) {
                            newcrew.push(best);
                        }
                    }
                    else {
                        let bsearch = coreCrew!.find(f => f.symbol === symbol);
                        if (bsearch && (ignoreSkills || ship.battle_stations?.some(bs => bsearch.skill_order.includes(bs.skill)))) newcrew.push(prepareOne(bsearch, globalContext.player.playerData, globalContext.player.buffConfig)[0]);
                    }
                }
            }
            setEventCrew(newcrew);
        }
    }, [currentEvent, ignoreSkills])

    React.useEffect(() => {
        if (typeof window !== 'undefined' && playerShips && !windowLoaded && ship) {
            setWindowLoaded(true);
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has("battle_mode") && urlParams.has('rarity')) {
                try {
                    let rarity = Number.parseInt(urlParams.get('rarity')!);
                    let bmode = urlParams.get('battle_mode')! as BattleMode;
                    if (['pvp', 'skirmish', 'fbb_0', 'fbb_0', 'fbb_1', 'fbb_2', 'fbb_3', 'fbb_4', 'fbb_5'].includes(bmode)) {
                        let ships = getShipsInUse(globalContext.player);
                        const f = ships.find(f => f.ship.symbol === ship.symbol && f.battle_mode === bmode && f.rarity === rarity);
                        if (f) {
                            setBattleMode(bmode);
                            setTimeout(() => {
                                setCrewStations(f.ship.battle_stations!.map(bs => bs.crew! as PlayerCrew));
                            });
                        }
                    }
                }
                catch {

                }
            }
        }
    }, [ship]);

    React.useEffect(() => {
        updateActiveCrew();
    }, [resultIdx, results]);

    React.useEffect(() => {
        if (crew?.length && ship.battle_stations?.length) {
            let max_rarity = ship.rarity;
            if (battleMode === 'fbb_4') max_rarity = 5;
            let crewcount = prefilterCrew(max_rarity).length;
            setCrewEstimate(crewcount);
        }
    }, [ship, crew, battleMode, minRarity, powerDepth, advancedPowerSettings, maxInitTime, onlyImmortal]);

    return <React.Fragment>
        <div className={'ui segment'} style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'left',
            alignItems: 'center',
            width: isMobile ? '100%' : '70%'
        }}>
            {true && <div style={{ display: 'flex', textAlign: 'center', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '1em', marginBottom: '1em' }}>
                <h3>{ship.name}{!fbb_mode && !!opponentShip && <> v. {opponentShip.name}</>}</h3>
                {progressMsg ? (running ? globalContext.core.spin(progressMsg || t('spinners.default')) : progressMsg) : t('global.idle')}
            </div>}
            {true && <div style={{ display: 'inline', textAlign: 'left', width: '100%' }}>
                <h3>{t('ship.calculated_crew')}</h3>
                <Dropdown
                    search
                    fluid
                    scrolling
                    selection
                    clearable
                    value={resultIdx}
                    onChange={(e, { value }) => setResultIdx(value as number)}
                    options={suggOpts}
                />
            </div>}
            <div style={{ display: 'inline', textAlign: 'left', marginTop: '0.5em', width: '100%' }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    width: '100%',
                    gap: '1em'
                }}>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('ship.battle_mode')}</h4>
                        <Dropdown
                            fluid
                            disabled={running}
                            scrolling
                            selection
                            value={battleMode}
                            onChange={(e, { value }) => {
                                selectBattleMode(value as BattleMode)
                            }}
                            options={battleModes}
                        />
                    </div>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('ship.power_depth')}</h4>
                        <Dropdown
                            disabled={running}
                            fluid
                            scrolling
                            selection
                            value={getPowerDepth()}
                            onChange={(e, { value }) => setPowerDepth(value as number)}
                            options={powerDepths}
                        />
                    </div>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('global.min_rarity')}</h4>
                        <Dropdown
                            disabled={running}
                            fluid
                            scrolling
                            selection
                            value={minRarity}
                            onChange={(e, { value }) => setMinRarity(value as number)}
                            options={rarities}

                        />
                    </div>
                </div>
                <div style={{margin: '1em 2em', fontStyle: 'italic', textAlign: 'center', justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column'}}>
                        <div style={{width: '30%', margin: '0.5em'}}>
                            <AdvancedCrewPowerPopup
                                disabled={running}
                                isOpen={advancedPowerOpen}
                                setIsOpen={setAdvancedPowerOpen}
                                config={{
                                    current: advancedPowerSettings,
                                    setCurrent: setAdvancedPowerSettings,
                                    defaultOptions: {
                                        accuracy_depth: powerDepth,
                                        evasion_depth: powerDepth,
                                        attack_depth: powerDepth,
                                        ability_depths: Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE).map(m => m === '2' ? null : powerDepth),
                                        ability_exclusions: Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE).map(m => false)
                                    }
                                }}
                                />
                        </div>
                    {t('ship.depth_hr_warn')}
                </div>


                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    width: '100%',
                    gap: '1em',
                    marginTop: '1em'
                }}>
                    {['skirmish', 'pvp'].includes(battleMode) && <>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('ship.calc.max_init')}</h4>
                        <Dropdown
                            disabled={running}
                            fluid
                            scrolling
                            selection
                            value={maxInitTime ?? 'none'}
                            onChange={(e, { value }) => setMaxInitTime(value === 'none' ? undefined : value as number)}
                            options={max_init_times}
                        />
                    </div>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('ship.calc.min_init')}</h4>
                        <Dropdown
                            disabled={running}
                            fluid
                            scrolling
                            selection
                            value={minInitTime ?? 'none'}
                            onChange={(e, { value }) => setMinInitTime(value === 'none' ? undefined : value as number)}
                            options={max_init_times}
                        />
                    </div></>}

                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('ship.opponent_variance')}</h4>
                        <Dropdown
                            disabled={running}
                            fluid
                            scrolling
                            selection
                            value={variance}
                            onChange={(e, { value }) => setVariance(value as number)}
                            options={variances}
                        />
                    </div>

                    {battleMode === 'skirmish' && !!eventCrew && <>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('menu.game_info.events')}</h4>
                        <Dropdown
                            fluid
                            scrolling
                            selection
                            value={currentEvent?.symbol}
                            onChange={(e, { value }) => selectEvent(value as string)}
                            options={eventList}
                        />
                    </div>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('base.crew')}</h4>
                        <CrewDropDown
                            showRarity={true}
                            fluid
                            selection={chosenCrew}
                            setSelection={setChosenCrew}
                            pool={eventCrew}
                            custom={(c) => {
                                if (currentEvent!.featured.includes(c.symbol)) return <>2x</>
                                else return <>1.5x</>
                            }}
                            />
                    </div>
                    </>}
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-end',
                    width: '100%',
                    margin: '1em',
                    gap: '1em'
                }}>
                    <Accordion style={{ marginTop: '1em' }} fluid>
                        <Accordion.Title
                            active={advancedOpen}
                            onClick={() => setAdvancedOpen(!advancedOpen)}
                        >
                            <Icon name={advancedOpen ? 'caret down' : 'caret right' as SemanticICONS} />
                            {t('global.advanced_settings')}
                        </Accordion.Title>
                        <Accordion.Content active={advancedOpen} style={{ textAlign: 'left' }}>
                            <Grid columns={3} style={{margin: '0em'}}>
                                <Grid.Column>
                                    <Checkbox
                                        disabled={running}
                                        label={t('ship.calc.apply_buffs')}
                                        value={t('ship.calc.apply_buffs')}
                                        checked={buffUnownedShips}
                                        onChange={(e, { checked }) => setBuffUnownedShips(checked as boolean)} />

                                </Grid.Column>
                                <Grid.Column>
                                    <Checkbox
                                        disabled={running}
                                        label={t('ship.calc.ignore_skill')}
                                        value={t('ship.calc.ignore_skill')}
                                        checked={ignoreSkills}
                                        onChange={(e, { checked }) => setIgnoreSkills(checked as boolean)} />

                                </Grid.Column>
                                {!!globalContext.player.playerData && <>
                                    {fbb_mode && <Grid.Column>
                                        <Checkbox
                                            disabled={running}
                                            label={t('ship.calc.apply_boss_effects')}
                                            value={t('ship.calc.apply_boss_effects')}
                                            checked={applyBossEffects}
                                            onChange={(e, { checked }) => setApplyBossEffects(checked as boolean)} />
                                    </Grid.Column>}
                                    <Grid.Column>
                                        <Checkbox
                                            disabled={running}
                                            label={t('consider_crew.consider_frozen')}
                                            value={t('consider_crew.consider_frozen')}
                                            checked={considerFrozen}
                                            onChange={(e, { checked }) => setConsiderFrozen(checked as boolean)} />
                                    </Grid.Column>

                                    <Grid.Column>
                                        <Checkbox
                                            disabled={running}
                                            label={t('consider_crew.consider_unowned')}
                                            checked={considerUnowned}
                                            onChange={(e, { checked }) => setConsiderUnowned(checked as boolean)} />
                                    </Grid.Column>

                                    <Grid.Column>
                                        <Checkbox
                                            disabled={running}
                                            label={t('consider_crew.only_immortal')}
                                            checked={onlyImmortal}
                                            onChange={(e, { checked }) => setOnlyImmortal(checked as boolean)} />
                                    </Grid.Column>

                                    <Grid.Column>
                                        <Checkbox
                                            disabled={running}
                                            label={t('ship.calc.as_maxed')}
                                            checked={asMaxed}
                                            onChange={(e, { checked }) => setAsMaxed(checked as boolean)} />
                                    </Grid.Column>
                                </>}

                                <Grid.Column>
                                    <Checkbox
                                        disabled={running}
                                        label={t('ship.calc.verbose_status_updates')}
                                        value={t('ship.calc.verbose_status_updates')}
                                        checked={verbose}
                                        onChange={(e, { checked }) => setVerbose(checked as boolean)} />
                                </Grid.Column>

                            </Grid>
                            <div style={{
                                display: 'grid',
                                width: "100%",
                                gridTemplateAreas: `"exhaust rate" "simulate workers" "battle battle"`,
                                gridTemplateColumns: "50% 50%"
                            }}>
                                <div style={{...sectionStyle, gridArea: 'exhaust'}}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1em', height:'3em' }}>
                                        <Checkbox
                                            disabled={running}
                                            label={t('ship.calc.exhaustive_mode')}
                                            value={t('ship.calc.exhaustive_mode')}
                                            checked={exhaustiveMode}
                                            onChange={(e, { checked }) => setExhaustiveMode(checked as boolean)} />

                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1em', height:'3em' }}>
                                        <Input
                                            disabled={exhaustiveMode || running}
                                            label={t('ship.calc.max_iterations')}
                                            value={maxIter}
                                            onChange={(e, { value }) => setMaxIter(Number.parseInt(value))} />
                                    </div>
                                </div>
                                <div style={{...sectionStyle, gridArea: 'rate', display: 'grid', alignItems: 'center', gridTemplateAreas: "'label1 dropdown1' 'label2 dropdown2'"}}>
                                    <div style={{gridArea:'label1'}}>
                                        {t('ship.calc.rate')}:&nbsp;
                                    </div>
                                    <div style={{gridArea:'dropdown1'}}>
                                        <Dropdown
                                            disabled={running}
                                            fluid
                                            scrolling
                                            selection
                                            value={rate}
                                            onChange={(e, { value }) => setRate(value as number)}
                                            options={rates} />
                                    </div>
                                    <div style={{gridArea:'label2'}}>
                                        {t('ship.calc.fixed_delay')}:&nbsp;
                                    </div>
                                    <div style={{gridArea:'dropdown2'}}>
                                        <Dropdown
                                            disabled={running}
                                            fluid
                                            scrolling
                                            selection
                                            value={fixedActivationDelay}
                                            onChange={(e, { value }) => setFixedActivationDelay(value as number)}
                                            options={delays} />
                                    </div>
                                </div>
                                <div style={{...sectionStyle, gridArea: 'simulate', display: 'grid', alignItems:'center', gridTemplateAreas: "'label1 dropdown1' 'label2 dropdown2'"}}>

                                    <div style={{gridArea:'label1'}}>
                                        {t('ship.calc.ranking_method')}:&nbsp;
                                    </div>
                                    <div style={{gridArea:'dropdown1'}}>
                                        <Dropdown
                                            disabled={running}
                                            fluid
                                            scrolling
                                            selection
                                            value={fbb_mode ? fbbRankingMethod : rankingMethod}
                                            onChange={(e, { value }) => fbb_mode ? setFBBRankingMethod(value as ShipRankingMethod) : setRankingMethod(value as ShipRankingMethod)}
                                            options={ranking_methods} />
                                    </div>
                                </div>
                                <div style={{...sectionStyle, gridArea: 'workers', display: 'grid', alignItems:'center', gridTemplateAreas: "'label1 dropdown1' 'label2 dropdown2'"}}>

                                    <div style={{gridArea:'label1'}}>
                                        {t('ship.calc.max_workers')}:&nbsp;
                                    </div>
                                    <div style={{gridArea:'dropdown1'}}>
                                        <Dropdown
                                            disabled={running}
                                            fluid
                                            scrolling
                                            selection
                                            value={numWorkers}
                                            onChange={(e, { value }) => setNumWorkers(value as number)}
                                            options={worker_sel} />
                                    </div>
                                </div>
                                <div style={{...sectionStyle, gridArea: 'battle', flexDirection: 'row', justifyContent: 'space-evenly'}}>
                                    {ship.battle_stations?.map((mp, idx) => {
                                        const skillName = mp.skill;
                                        return <div key={`battle_station_${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '1em', justifyContent: 'center' }}>
                                            <div style={{height: '32px', display:'flex', alignItems: 'center'}}>
                                                ({idx+1})&nbsp;{tfmt('ship.calc.icon_activation_offset', {
                                                    icon: <img key={skillName} src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${skillName}.png`} style={{width: '16px', margin: '0.5em'}} />
                                                })}
                                            </div>
                                            <Input
                                                disabled={running}
                                                value={activationOffsets[idx]}
                                                style={{width: '7em'}}
                                                onChange={(e, { value }) => {
                                                    activationOffsets[idx] = Number.parseInt(value);
                                                    setActivationOffsets([...activationOffsets]);
                                                }} />
                                        </div>

                                    })}
                                    <div style={{margin: '1em 2em', fontStyle: 'italic', textAlign: 'center'}}>
                                        {t('ship.offset_adds_warn')}
                                    </div>
                                </div>
                            </div>
                        </Accordion.Content>
                    </Accordion>
                </div>
            </div>
            <div>
                <Button color='green' onClick={() => recommend()}>{running ? t('global.cancel') : t('global.recommend_crew')}</Button>
                {!running && crewStations?.filter(c => !!c).length === ship?.battle_stations?.length &&
                    <Button color='green' onClick={() => recommend(true)}>{t('ship.calc.run_current_line_up')}</Button>}
                {!running && <Button onClick={() => clearAll()}>{t('global.clear')}</Button>}
                {!running && crewStations?.filter(c => !!c).length === ship?.battle_stations?.length && resultIdx !== undefined && (!results[resultIdx]?.attacks?.length || hideGraph) &&
                    <Button onClick={() => {
                        if (!hideGraph && resultIdx !== undefined && !results[resultIdx]?.attacks?.length) {
                            recommend(true)
                        }
                        else {
                            setHideGraph(false);
                        }
                    }}>{t('ship.calc.show_battle_graph')}</Button>}
            </div>
            <div style={{ marginTop: '1em' }}>
                {t('base.crew')}: {crewEstimate.toLocaleString()}
            </div>
            {resultIdx !== undefined && !!results[resultIdx]?.attacks?.length && !hideGraph &&
                <div className={'ui segment'} style={{ width: '100%' }}>
                    <Label as='a' corner='right' onClick={() => setHideGraph(true)}>
                        <Icon name='delete' style={{ cursor: 'pointer' }} />
                    </Label>
                    <div style={{ width: '100%', height: '540px', overflow: 'scroll' }}>
                        <BattleGraph battle={results[resultIdx]} />
                    </div>
                </div>}
        </div>
    </React.Fragment>

    function renderBattleResult(sug: ShipWorkerItem, idx: number) {
        return <div style={{ width: '100%', gap: '0.5em', display: 'flex', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
            <div style={{ display: 'flex', width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5em' }}>
                {sug.crew.map((crew, idx) => <div style={{ display: 'flex', width: `${98 / ships[shipIdx].battle_stations!.length}%`, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25em', textAlign: 'center' }}>

                    <img style={{ width: '32px', margin: '0.25em' }} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />

                    {crew.name}
                </div>)}
            </div>
            <hr style={{ width: '100%', opacity: '0.25' }} />
            <div style={{
                display: 'grid',
                gridTemplateAreas: "'bonus rating percentile duration' 'weighted min max metric' 'a standard standard b'",
                gridTemplateColumns: '20% 20% 20% 20%',
                lineHeight: '1.25em',
                paddingLeft: '2em',
                paddingRight: '2em',
                justifyContent: 'center',
                width: '100%',
                gap: '1em',
                alignItems: 'center'
            }}>

                <div style={{ gridArea: 'bonus' }}>
                    {t('ship.crit_bonus')}{': '}<br />{sug.ship.crit_bonus}
                </div>
                <div style={{ gridArea: 'rating' }}>
                    {t('ship.crit_rating')}{': '}<br />{sug.ship.crit_chance}
                </div>
                <div style={{ gridArea: 'percentile' }}>
                    {t('global.percentile')}{': '}<br />{sug.percentile.toFixed(1)}
                </div>
                <div style={{ gridArea: 'duration' }}>
                    {t('ship.duration')}{': '}<br />{sug.battle_time.toFixed()}
                </div>

                <div style={{ gridArea: 'weighted' }}>
                    {t('ship.weighted_attack')}{': '}<br />{Math.round(sug.weighted_attack).toLocaleString()}
                </div>
                <div style={{ gridArea: 'min' }}>
                    {t('ship.min_attack')}{': '}<br />{Math.round(sug.min_attack).toLocaleString()}
                </div>
                <div style={{ gridArea: 'max' }}>
                    {t('ship.max_attack')}{': '}<br />{Math.round(sug.max_attack).toLocaleString()}
                </div>
                <div style={{ gridArea: 'metric' }}>
                    {t('ship.attack')}{': '}<br />{Math.round(sug.attack).toLocaleString()}
                </div>
                <div style={{gridArea: 'standard', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '1em'}}>
                    {fbb_mode &&
                        <>
                            <b>*</b> {t('ship.fbb_metric')}{': '}<br />{Math.round(sug.fbb_metric).toLocaleString()}
                        </>
                    }
                    {!fbb_mode && battleMode === 'pvp' &&
                        <>
                            <b>*</b> {t('ship.arena_metric')}{': '}<br />{Math.round(sug.arena_metric).toLocaleString()}
                        </>
                    }
                    {!fbb_mode && battleMode === 'skirmish' &&
                        <>
                            <b>*</b> {t('ship.skirmish_metric')}{': '}<br />{Math.round(sug.skirmish_metric).toLocaleString()}
                        </>
                    }
                    {!fbb_mode && <div>
                        <p>
                            {t('global.win')}{': '}<br />
                            <span style={{color: sug.win ? 'lightgreen' : undefined, fontWeight: sug.win ? 'bold' : undefined}}>
                                {t(`global.${sug.win ? 'yes' : 'no'}`)}
                            </span>
                        </p>
                    </div>}
                </div>
            </div>
        </div>
    }

    function recommend(current?: boolean) {
        if (running) {
            cancel();
            setProgressMsg(`${t('global.aborted')}; ${t('global.n_results', { n: `${results.length}`})}`)
            return;
        }
        if (ships?.length && crew?.length) {

            let max_rarity = ship.rarity;
            if (battleMode === 'fbb_4') max_rarity = 5;

            if (battleMode.startsWith('fbb') && !battleConfig.opponent) return;
            results.length = 0;
            let ccrew = undefined as PlayerCrew | CrewMember | undefined;
            const pfcrew = current ? [] as PlayerCrew[] : prefilterCrew(max_rarity);
            if (!current && battleMode === 'skirmish' && chosenCrew?.length) {
                ccrew = eventCrew?.find(f => f.id === chosenCrew[0]);
                if (!pfcrew.some(c => c.id === chosenCrew[0])) {
                    if (ccrew) {
                        pfcrew.unshift(ccrew);
                    }
                }
            }

            const config: ShipWorkerConfig = {
                event_crew: ccrew ? structuredClone(ccrew) : undefined,
                ranking_method: fbb_mode ? fbbRankingMethod : rankingMethod,
                ship: prepareShip(ship),
                crew: structuredClone(current ? crewStations : pfcrew) as CrewMember[],
                battle_mode: battleMode,
                power_depth: powerDepth,
                min_rarity: minRarity,
                max_rarity,
                max_results: 100,
                opponents: battleConfig.opponent ? [battleConfig.opponent] : undefined,
                defense: battleConfig.defense,
                offense: battleConfig.offense,
                get_attacks: !!current,
                ignore_skill: ignoreSkills,
                verbose,
                max_iterations: !exhaustiveMode ? BigInt(maxIter) : undefined,
                activation_offsets: activationOffsets,
                simulate: false,
                fixed_activation_delay: fixedActivationDelay,
                opponent_variance: variance,
                rate,
                effects: applyBossEffects ? battleConfig.effects : undefined
            };

            results.length = 0;
            runWorker({ config, callback: workerMessage, fbb_mode, max_workers: numWorkers });
        }
    }

    function prepareShip(ship: Ship) {
        let isowned = globalContext.player.playerShips?.some(ps => ps.symbol === ship.symbol && ps.owned);
        ship = structuredClone(ship);

        if (buffUnownedShips) {
            if (!isowned) {
                if (globalContext.player.playerData) {
                    let bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'ship_attack');
                    ship.attack *= 1 + (bs?.value ?? 0);
                    bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'ship_accuracy');
                    ship.accuracy *= 1 + (bs?.value ?? 0);
                    bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'ship_evasion');
                    ship.evasion *= 1 + (bs?.value ?? 0);
                    bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'ship_hull');
                    ship.hull *= 1 + (bs?.value ?? 0);
                    bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'ship_shields');
                    ship.shields *= 1 + (bs?.value ?? 0);
                }
                else {
                    ship.attack *= 1.16;
                    ship.accuracy *= 1.16;
                    ship.evasion *= 1.16;
                    ship.hull *= 1.16;
                    ship.shields *= 1.16;
                }
                ship.attack = Math.ceil(ship.attack);
                ship.accuracy = Math.ceil(ship.accuracy);
                ship.evasion = Math.ceil(ship.evasion);
                ship.hull = Math.ceil(ship.hull);
                ship.shields = Math.ceil(ship.shields);
            }
        }
        return ship;
    }

    function selectBattleMode(battleMode: BattleMode) {
        setBattleMode(battleMode);
        setLastBattleMode(battleMode);
    }

    function clearAll() {
        cancel();
        setResultIdx(undefined);
        setResults([].slice());
        setProgressMsg('');
    }

    function updateActiveCrew() {
        if (resultIdx === undefined || !results.length || resultIdx >= results.length) {
            setCrewStations(ship.battle_stations!.map(bs => undefined));
            return;
        }
        const sug = results[resultIdx];
        setCrewStations(sug.crew as PlayerCrew[]);
    }

    function workerMessage(result: ShipMultiWorkerStatus) {
        if (!result.data.inProgress && result.data.result.items?.length) {
            if (result.data.result.items.length === 1 && results?.length && results.length > 1) {
                let r = result.data.result.items[0];
                let sug = results.findIndex(f => f.crew.every((cr1, idx) => r.crew.findIndex(cr2 => cr2 === cr1.id) === idx))
                if (sug !== -1) {
                    results[sug] = fromTransport(r);
                    setResults([...results]);
                    setProgressMsg(t('ship.calc.calc_summary', {
                        message: t('global.completed'),
                        count: `${result.data.result.total_iterations?.toLocaleString()}`,
                        time: formatRunTime(Math.round(result.data.result.run_time ?? 0), t),
                        accepted: `${results.length.toLocaleString()}`
                    }));

                    return;
                }
            }
            setProgressMsg(t('ship.calc.calc_summary', {
                message: t('global.completed'),
                count: `${result.data.result.total_iterations?.toLocaleString()}`,
                time: formatRunTime(Math.round(result.data.result.run_time ?? 0), t),
                accepted: `${results.length.toLocaleString()}`
            }));

            setResults([...results]);
            setResultIdx(0);
        }
        else if (result.data.inProgress && result.data.result.count) {
            setProgressMsg(
                t(verbose ? 'ship.calc.calculating_pct_ellipses_verbose' : 'ship.calc.calculating_pct_ellipses',
                    {
                        percent: `${result.data.result.percent?.toLocaleString()}`,
                        count: `${result.data.result.count?.toLocaleString()}`,
                        progress: `${result.data.result.progress?.toLocaleString()}`,
                        accepted: `${results.length.toLocaleString()}`
                    }
                )
            )
        }
        else if (result.data.inProgress && result.data.result.result) {
            results.push(fromTransport(result.data.result.result));
            results.sort((a, b) => compareShipResults(a, b, fbb_mode));
            setResults([...results]);
            setResultIdx(0);
        }
    }

    function prefilterCrew(max_rarity?: number) {
        const pref_order = fbb_mode ? [1, 2, 5, 0, 3, 4, 6, 7, 8, 9, 10] : [1, 5, 0, 2, 3, 4, 6, 7, 8, 9, 10];
        const bonus_pref = [0, 2, 1, 3];

        max_rarity ??= ship.rarity ?? 5;
        const min_rarity = minRarity ?? 1;
        const shipDiv = getShipDivision(ship.rarity);
        const maxvalues = [0, 0, 0, 0, 0].map(o => [0, 0, 0, 0]);
        const maxabilityvalues = [0, 0, 0, 0, 0].map(o => Object.keys(CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE).slice(0, 9).map(m => 0));
        const power_depth = powerDepth ?? 2;
        const advanced_power = advancedPowerSettings;
        advanced_power.ability_depths.forEach((a, i) => {
            if (advanced_power.ability_depths[i] === -1) {
                advanced_power.ability_depths[i] = null;
            }
        });

        const results = crew.filter((crew) => {
            if (min_rarity && crew.max_rarity < min_rarity) return false;
            if (onlyImmortal && ("immortal" in crew && !crew.immortal)) return false;
            if (!fbb_mode && maxInitTime !== undefined) {
                if (crew.action.initial_cooldown > maxInitTime) return false;
            }
            if (!fbb_mode && minInitTime !== undefined) {
                if (crew.action.initial_cooldown < minInitTime) return false;
            }
            if (!ignoreSkills && !crew.skill_order.some(skill => ship.battle_stations?.some(bs => bs.skill === skill))) return false;
            if (crew.action.ability?.condition && !ship.actions?.some(act => act.status === crew.action.ability?.condition)) return false;

            // if (action_types?.length) {
            //     if (!action_types.some(at => crew.action.bonus_type === at)) return false;
            // }
            // if (ability_types?.length) {
            //     if (!ability_types.some(at => crew.action.ability?.type === at)) return false;
            // }

            if (crew.action.ability) {
                let pass = true;
                if (battleMode.startsWith("fbb_")) {
                    let n = Number(battleMode.slice(4)) + 1;
                    if (!getBosses(ship, crew).some(boss => boss.id === n)) pass = false;
                }
                else if (battleMode === 'pvp') {
                    if (!getCrewDivisions(crew.max_rarity).includes(shipDiv)) pass = false;
                }
                if (pass) {
                    if (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] < crew.action.bonus_amount) {
                        maxvalues[crew.max_rarity - 1][crew.action.bonus_type] = crew.action.bonus_amount;
                    }
                    if (crew.action.ability.type !== 0) {
                        if (maxabilityvalues[crew.max_rarity - 1][crew.action.ability.type] < crew.action.bonus_amount) {
                            maxabilityvalues[crew.max_rarity - 1][crew.action.ability.type] = crew.action.bonus_amount;
                        }
                    }
                    else if (crew.action.bonus_type === 0) {
                        let total = crew.action.bonus_amount + crew.action.ability.amount;
                        if (maxabilityvalues[crew.max_rarity - 1][crew.action.ability.type] < total) {
                            maxabilityvalues[crew.max_rarity - 1][crew.action.ability.type] = total;
                        }
                    }

                }
                return pass;
            }
            else {
                return false;
            }
        })
        .filter((crew) => {
            if (crew.action.ability && advanced_power.ability_exclusions[crew.action.ability.type]) return false;
            if (fbb_mode && crew.action.limit) return false;
            if (crew.action.ability && typeof advanced_power.ability_depths[crew.action.ability.type] === 'number') {
                let atype = maxabilityvalues[crew.max_rarity - 1][crew.action.ability.type] - advanced_power.ability_depths[crew.action.ability.type]!;
                if (crew.action.ability.type === 0) {
                    if (crew.action.bonus_amount + crew.action.ability.amount < atype) return false;
                }
                else {
                    if (crew.action.bonus_amount < atype) return false;
                }
            }
            if (crew.action.bonus_type === 0 && advanced_power.attack_depth !== null) {
                if (crew.action.ability?.type === 0) {
                    if (crew.action.bonus_amount + crew.action.ability.amount < (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] - advanced_power.attack_depth)) return false;
                }
                else {
                    if (crew.action.bonus_amount < (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] - advanced_power.attack_depth) && (!fbb_mode || crew.action.ability?.type !== 2)) return false;
                }
            }
            else if (crew.action.bonus_type === 1 && advanced_power.evasion_depth !== null) {
                if (crew.action.bonus_amount < (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] - advanced_power.evasion_depth) && (!fbb_mode || crew.action.ability?.type !== 2)) return false;
            }
            else if (crew.action.bonus_type === 2 && advanced_power.accuracy_depth !== null) {
                if (crew.action.bonus_amount < (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] - advanced_power.accuracy_depth) && (!fbb_mode || crew.action.ability?.type !== 2)) return false;
            }
            else {
                if (crew.action.bonus_amount < (maxvalues[crew.max_rarity - 1][crew.action.bonus_type] - power_depth) && (!fbb_mode || crew.action.ability?.type !== 2)) return false;
            }
            return true;
        })
        .sort((a, b) => {
            let r = 0;
            // check durations
            if (fbb_mode) {
                r = a.action.cycle_time - b.action.cycle_time;
                if (r) return r;
            }
            else {
                r = a.action.initial_cooldown - b.action.initial_cooldown;
                if (r) return r;
            }

            // check for bonus abilities, first
            if (a.action.ability && b.action.ability) {
                if (fbb_mode) {
                    if ([1, 2, 5].includes(a.action.ability.type) && ![1, 2, 5].includes(b.action.ability.type)) return -1;
                    if ([1, 2, 5].includes(b.action.ability.type) && ![1, 2, 5].includes(a.action.ability.type)) return 1;
                }
                else {
                    if ([0, 1, 5].includes(a.action.ability.type) && ![0, 1, 5].includes(b.action.ability.type)) return -1;
                    if ([0, 1, 5].includes(b.action.ability.type) && ![0, 1, 5].includes(a.action.ability.type)) return 1;
                }

                if (a.action.ability.type === b.action.ability.type) {
                    let aamt = a.action.ability.amount;
                    let bamt = b.action.ability.amount;

                    if (a.action.ability.type === 0) {
                        aamt += a.action.bonus_amount;
                        bamt += b.action.bonus_amount;
                    }

                    r = bamt - aamt;
                    if (r) return r;

                    r = a.action.ability.condition - b.action.ability.condition;
                    if (r) return r;
                }
                else {
                    r = pref_order.indexOf(a.action.ability.type) - pref_order.indexOf(b.action.ability.type);
                    //r = a.action.ability.type - b.action.ability.type;
                    if (r) return r;
                }
            }
            else {
                if (a.action.ability && !b.action.ability) return -1;
                if (!a.action.ability && b.action.ability) return 1;
            }

            // check the bonus amount/type
            if (a.action.bonus_type === b.action.bonus_type) {
                r = b.action.bonus_amount - a.action.bonus_amount;
                if (r) return r;
            }
            else {
                r = bonus_pref.indexOf(a.action.bonus_type) - bonus_pref.indexOf(b.action.bonus_type);
                if (r) return r;
            }

            // check limits
            if (fbb_mode) {
                if (a.action.limit && !b.action.limit) return 1;
                if (!a.action.limit && b.action.limit) return -1;
                if (a.action.limit && b.action.limit) {
                    r = b.action.limit - a.action.limit;
                    if (r) return r;
                }
            }

            // check passives
            if (a.ship_battle.crit_bonus && b.ship_battle.crit_bonus) {
                r = b.ship_battle.crit_bonus - a.ship_battle.crit_bonus;
            }
            if (a.ship_battle.crit_chance && b.ship_battle.crit_chance) {
                r = b.ship_battle.crit_chance - a.ship_battle.crit_chance;
            }
            if (a.ship_battle.accuracy && b.ship_battle.accuracy) {
                r = b.ship_battle.accuracy - a.ship_battle.accuracy;
            }
            if (a.ship_battle.evasion && b.ship_battle.evasion) {
                r = b.ship_battle.evasion - a.ship_battle.evasion;
            }

            // check other stats
            if (!r) {
                r = Object.values(a.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0) - Object.values(b.ranks).filter(t => typeof t === 'number').reduce((p, n) => p + n, 0)
                if (!r) {
                    // !!
                    console.log(`completely identical stats! ${a.name}, ${b.name}`);
                }
            }
            return r;
        });

        return results;
    }

    function fromTransport(input: ShipWorkerTransportItem): ShipWorkerItem {
        //if (!crew?.length || !ships?.length) return undefined;
        const result = {
            ...input,
            crew: input.crew.map(id => crew.find(c => c.id === id)!)!,
            ship: ships.find(s => s.id === input.ship)!
        }
        return result;
    }

    function createOpponent() {
        if (!opponentShip?.battle_stations?.length || !opponentStations?.length || !opponentStations.some(f => f)) return undefined;

        const newShip = structuredClone(opponentShip) as Ship;
        const c = newShip.battle_stations!.length;
        for (let i = 0; i < c; i++) {
            if (opponentStations[i]) {
                newShip.battle_stations![i].crew = opponentStations[i];
            }
        }
        return newShip;
    }
}
