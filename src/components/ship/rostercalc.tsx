import React from "react";
import { CrewMember } from "../../model/crew";
import { AttackInstant, BattleMode, Ship, ShipWorkerConfig, ShipWorkerItem } from "../../model/ship"
import { Button, Checkbox, Dropdown, DropdownItemProps, Icon, Label, SearchResults } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { WorkerContext } from "../../context/workercontext";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { PlayerCrew } from "../../model/player";
import { useStateWithStorage } from "../../utils/storage";
import { BossShip } from "../../model/boss";
import { CrewTarget } from "../hovering/crewhoverstat";
import { getShipsInUse } from "../../utils/shiputils";
import { BattleGraph } from "./battlegraph";

export interface RosterCalcProps {
    pageId: string;
    ships: Ship[],
    shipIdx?: number,
    crew: (CrewMember | PlayerCrew)[],
    crewStations: (PlayerCrew | undefined)[],
    setCrewStations: (value: (PlayerCrew | undefined)[]) => void
    considerFrozen: boolean;
    setConsiderFrozen: (value: boolean) => void;
    considerUnowned: boolean;
    setConsiderUnowned: (value: boolean) => void;
}

interface BattleConfig {
    defense?: number;
    offense?: number;
    opponent?: Ship;
}

export const ShipRosterCalc = (props: RosterCalcProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
    const globalContext = React.useContext(GlobalContext);
    const { playerShips } = globalContext.player;
    const workerContext = React.useContext(WorkerContext);
    const { running, runWorker, cancel } = workerContext;
    const { t } = globalContext.localized;
    const [sugWait, setSugWait] = React.useState<number | undefined>();
    const { ships, crew, crewStations, setCrewStations, pageId, considerFrozen, setConsiderFrozen, considerUnowned, setConsiderUnowned } = props;
    const shipIdx = props.shipIdx ?? 0;
    const ship = ships[shipIdx];
    const [windowLoaded, setWindowLoaded] = React.useState(false);
    const [hideGraph, setHideGraph] = React.useState(true);
    const [battleConfig, setBattleConfig] = React.useState<BattleConfig>({});
    const [activeSuggestion, setActiveSuggestion] = React.useState<ShipWorkerItem | undefined>(undefined);
    const [suggestions, setSuggestions] = React.useState<ShipWorkerItem[]>([]);
    const [battleMode, setBattleMode] = useStateWithStorage<BattleMode>(`${pageId}/${ship.symbol}/battleMode`, 'pvp', { rememberForever: true });
    const [powerDepth, setPowerDepth] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/powerDepth`, 1, { rememberForever: true });
    const [minRarity, setMinRarity] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/minRarity`, ship.rarity - 1, { rememberForever: true });
    const [progressMsg, setProgressMsg] = React.useState<string>('');

    React.useEffect(() => {
        if (!hideGraph) {
            recommend(true);
        }
    }, [hideGraph]);

    React.useEffect(() => {
        const newconfig = { ...battleConfig };
        if (globalContext.player.playerData) {
            let bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'fbb_boss_ship_attack');
            newconfig.defense = bs?.value;
            bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'fbb_player_ship_attack');
            newconfig.offense = bs?.value;
        }
        if (battleMode.startsWith('fbb')) {
            let rarity = Number.parseInt(battleMode.slice(4));
            let boss = globalContext.player.ephemeral?.fleetBossBattlesRoot?.statuses.find(gr => gr.desc_id === rarity + 1)?.boss_ship;
            if (boss) {
                boss = JSON.parse(JSON.stringify(boss)) as BossShip;
                boss.rarity = rarity;
            }
            newconfig.opponent = boss;
        }
        else {
            newconfig.opponent = undefined;
        }         
        setBattleConfig(newconfig);
    }, [battleMode]);

    React.useEffect(() => {
        if (typeof window !== 'undefined' && playerShips && !windowLoaded) {
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
                            setTimeout(() => {
                                setBattleMode(bmode);
                                let csnew = f.ship.battle_stations!.map(bs => bs.crew! as PlayerCrew);
                                if (!crewStations.every((cs, idx) => csnew[idx].id === cs?.id)) {
                                    setCrewStations(f.ship.battle_stations!.map(bs => bs.crew! as PlayerCrew));
                                }
                            });
                        }
                    }
                }
                catch {

                }
            }
        }
    });

    React.useEffect(() => {
        setCrewStations(activeSuggestion?.crew as PlayerCrew[] ?? ships[shipIdx].battle_stations?.map(b => undefined));
    }, [activeSuggestion]);

    React.useEffect(() => {
        if (suggestions?.length && (!activeSuggestion || sugWait !== undefined)) {
            setSuggestion(sugWait ?? 0);
            setSugWait(undefined);
        }
    }, [suggestions, sugWait]);

    const suggOpts = suggestions?.map((sug, idx) => {
        return {
            key: `_sug_${idx}`,
            value: idx,
            text: sug.crew.map(c => c.name).join(", "),
            content: <div style={{ width: '100%', gap: '0.5em', display: 'flex', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
                <div style={{ display: 'flex', width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5em' }}>
                    {sug.crew.map((crew, idx) => <div style={{ display: 'flex', width: `${98 / ships[shipIdx].battle_stations!.length}%`, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25em', textAlign: 'center' }}>

                        <img style={{ width: '32px', margin: '0.25em' }} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />

                        {crew.name}
                    </div>)}
                </div>
                <hr style={{ width: '100%', opacity: '0.25' }} />
                <div style={{
                    display: 'grid',
                    gridTemplateAreas: "'bonus rating percentile duration' 'weighted min max metric'",
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
                        {battleMode.startsWith("fbb") && <b>*</b>} {t('ship.max_attack')}{': '}<br />{Math.round(sug.max_attack).toLocaleString()}
                    </div>
                    <div style={{ gridArea: 'metric' }}>
                        {!battleMode.startsWith("fbb") && <b>*</b>} {t('ship.arena_metric')}{': '}<br />{Math.round(sug.arena_metric).toLocaleString()}
                    </div>
                </div>
            </div>
        }
    });

    const battleModes = (globalContext.player.playerData ? ['pvp', 'skirmish', 'fbb_0', 'fbb_1', 'fbb_2', 'fbb_3', 'fbb_4', 'fbb_5'] : ['pvp', 'skirmish']).map((mode) => {
        let rarity = 0;
        if (mode.startsWith('fbb')) {
            let sp = mode.split("_");
            rarity = Number.parseInt(sp[1]);
        }
        return {
            key: mode,
            value: mode,
            text: t(`ship.${mode.startsWith('fbb') ? 'fbb' : mode}`) + (mode.startsWith('fbb') ? ` ${rarity}*` : '')
        }
    });

    const powerDepths = [0, 1, 2, 3, 4].map((pd) => ({
        key: `pd_${pd}`,
        value: pd,
        text: `${pd}`
    }));

    const rarities = [] as DropdownItemProps[];

    for (let r = 1; r <= ship.rarity; r++) {
        rarities.push({
            key: `rare_${r}`,
            value: r,
            text: `${r}*`
        })
    }

    return <React.Fragment>
        <div className={'ui segment'} style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'left',
            alignItems: 'center',
            width: isMobile ? '100%' : '70%'
        }}>
            {!running && <div style={{ display: 'inline', textAlign: 'left', width: '100%' }}>
                <h3>{t('ship.calculated_crew')}</h3>
                <Dropdown
                    search
                    fluid
                    scrolling
                    selection
                    clearable
                    value={getSuggestion()}
                    onChange={(e, { value }) => setSuggestion(value as number)}
                    options={suggOpts}
                />
            </div>}
            {running && <div style={{ display: 'flex', textAlign: 'center', height: '5.5em', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {globalContext.core.spin(progressMsg || t('spinners.default'))}
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
                            scrolling
                            selection
                            value={battleMode}
                            onChange={(e, { value }) => setBattleMode(value as BattleMode)}
                            options={battleModes}
                        />
                    </div>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('ship.power_depth')}</h4>
                        <Dropdown
                            fluid
                            scrolling
                            selection
                            value={powerDepth}
                            onChange={(e, { value }) => setPowerDepth(value as number)}
                            options={powerDepths}
                        />
                    </div>
                    <div style={{ display: 'inline', width: '30%' }}>
                        <h4>{t('global.min_rarity')}</h4>
                        <Dropdown
                            fluid
                            scrolling
                            selection
                            value={minRarity}
                            onChange={(e, { value }) => setMinRarity(value as number)}
                            options={rarities}
                        />
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    width: '100%',
                    margin: '1em',
                    gap: '1em'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
                        <Checkbox
                            label={t('consider_crew.consider_frozen')}
                            value={t('consider_crew.consider_frozen')}
                            checked={considerFrozen}
                            onChange={(e, { checked }) => setConsiderFrozen(checked as boolean)} />
                    </div>

                    {!!globalContext.player.playerData &&
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
                            <Checkbox
                                label={t('consider_crew.consider_unowned')}
                                checked={considerUnowned}
                                onChange={(e, { checked }) => setConsiderUnowned(checked as boolean)} />
                        </div>}

                </div>
            </div>
            <div>
                <Button color='green' onClick={() => recommend()}>{running ? t('global.cancel') : t('global.recommend_crew')}</Button>
                {!running && crewStations?.filter(c => !!c).length === ship?.battle_stations?.length &&
                    <Button color='green' onClick={() => recommend(true)}>{t('ship.calc.run_current_line_up')}</Button>}
                {!running && <Button onClick={() => { setSuggestions([]); setSuggestion(undefined); setActiveSuggestion(undefined); }}>{t('global.clear')}</Button>}
                {!running && crewStations?.filter(c => !!c).length === ship?.battle_stations?.length && (!activeSuggestion?.attacks?.length || hideGraph) && 
                    <Button onClick={() => {
                        if (!hideGraph && !activeSuggestion?.attacks?.length) {
                            recommend(true) 
                        }
                        else {
                            setHideGraph(false);
                        }                        
                    }}>{t('ship.calc.show_battle_graph')}</Button>}
            </div>
            {!!activeSuggestion?.attacks?.length && !hideGraph &&
                <div className={'ui segment'} style={{ width: '100%' }}>
                    <Label as='a' corner='right' onClick={() => setHideGraph(true)}>
                        <Icon name='delete' style={{ cursor: 'pointer' }} />
                    </Label>
                    <div style={{ width: '100%', height: '540px', overflow: 'scroll' }}>
                        <BattleGraph battle={activeSuggestion} />
                    </div>
                </div>}
        </div>
    </React.Fragment>

    function recommend(current?: boolean) {
        if (running) {
            cancel();
            return;
        }
        if (ships?.length && crew?.length) {
            if (battleMode.startsWith('fbb') && !battleConfig.opponent) return;
            const config = {
                ship: JSON.parse(JSON.stringify(ship)),
                crew: JSON.parse(JSON.stringify(current ? crewStations : crew)),
                battle_mode: battleMode,
                power_depth: powerDepth,
                min_rarity: minRarity,
                max_rarity: ship.rarity,
                max_results: 50,
                opponents: battleConfig.opponent ? [battleConfig.opponent] : undefined,
                defense: battleConfig.defense,
                offense: battleConfig.offense,
                get_attacks: !!current
            } as ShipWorkerConfig;

            setProgressMsg('');
            setActiveSuggestion(undefined);
            setSuggestions([]);
            runWorker('shipworker', config, workerMessage);
        }
    }

    function setSuggestion(idx: number | undefined) {
        if (!suggestions?.length || !ships[shipIdx]) return;
        if (idx === undefined || idx < 0 || idx >= suggestions.length) {
            setActiveSuggestion(undefined);
        }
        else {
            setActiveSuggestion(suggestions[idx]);
        }
    }

    function getSuggestion() {
        let idx = suggestions?.findIndex(fi => fi === activeSuggestion);
        if (idx === -1) return undefined;
        return idx;
    }

    function workerMessage(result: { data: { result: { ships?: ShipWorkerItem[], format?: string, options?: any }, inProgress: boolean } }) {
        if (!result.data.inProgress && result.data.result.ships?.length) {
            if (result.data.result.ships.length === 1 && suggestions?.length && suggestions.length > 1) {
                let r = result.data.result.ships[0];
                let sug = suggestions.findIndex(f => f.crew.every((cr1, idx) => r.crew.findIndex(cr2 => cr2.id === cr1.id) === idx))
                if (sug !== -1) {
                    suggestions[sug] = r;
                    setSugWait(sug);
                    setSuggestions([...suggestions]);                    
                    return;
                }
            }
            setSugWait(0);
            setSuggestions(result.data.result.ships);            
        }
        else if (result.data.inProgress && result.data.result.format) {
            setProgressMsg(t(result.data.result.format, result.data.result.options));
        }
    }
}