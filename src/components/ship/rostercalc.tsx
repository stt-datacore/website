import React from "react";
import { CrewMember } from "../../model/crew";
import { BattleMode, Ship, ShipWorkerConfig, ShipWorkerItem } from "../../model/ship"
import { Button, Checkbox, Dropdown, DropdownItemProps, SearchResults } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { WorkerContext } from "../../context/workercontext";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { PlayerCrew } from "../../model/player";
import { useStateWithStorage } from "../../utils/storage";
import { BossShip } from "../../model/boss";
import { CrewTarget } from "../hovering/crewhoverstat";



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

export const ShipRosterCalc = (props: RosterCalcProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;		
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);
    const { running, runWorker, cancel } = workerContext;
    const { t } = globalContext.localized;

    const { ships, crew, crewStations, setCrewStations, pageId, considerFrozen, setConsiderFrozen, considerUnowned, setConsiderUnowned } = props;
    const shipIdx = props.shipIdx ?? 0;
    const ship = ships[shipIdx];

    const [suggestions, setSuggestions] = React.useState<ShipWorkerItem[]>([]);
    const [battleMode, setBattleMode] = useStateWithStorage<BattleMode>(`${pageId}/${ship.symbol}/battleMode`, 'pvp', { rememberForever: true });
    const [powerDepth, setPowerDepth] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/powerDepth`, 1, { rememberForever: true });
    const [minRarity, setMinRarity] = useStateWithStorage<number>(`${pageId}/${ship.symbol}/minRarity`, ship.rarity - 1, { rememberForever: true });
    const [opponent, setOpponent] = React.useState<Ship | undefined>();
    const [defense, setDefense] = React.useState<number | undefined>();
    const [offense, setOffense] = React.useState<number | undefined>();
    const [progressMsg, setProgressMsg] = React.useState<string>('');

    // React.useEffect(() => {
    //     recommend()
    // }, [powerDepth, battleMode, minRarity, opponent]);

    React.useEffect(() => {
        if (globalContext.player.playerData) {
            let bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'fbb_boss_ship_attack');
            if (bs?.value) {
                setDefense(bs.value);
            }
            else {
                setDefense(undefined);
            }
            bs = globalContext.player.playerData.player.character.captains_bridge_buffs.find(f => f.stat === 'fbb_player_ship_attack');
            if (bs?.value) {
                setOffense(bs.value);
            }
            else {
                setOffense(undefined);
            }
        }

        if (battleMode.startsWith('fbb')) {
            let rarity = Number.parseInt(battleMode.slice(4));
            let boss = globalContext.player.ephemeral?.fleetBossBattlesRoot?.statuses.find(gr => gr.desc_id === rarity + 1)?.boss_ship;
            if (boss) {
                boss = JSON.parse(JSON.stringify(boss)) as BossShip;
                boss.rarity = rarity;
            }
            setOpponent(boss);
        }
        else {
            setOpponent(undefined);
        }
    }, [battleMode]);

    const suggOpts = suggestions?.map((sug, idx) => {
        return {
            key: sug.ship.symbol + `_sug_${idx}`,
            value: sug.crew.map(c => c.id).join(","),
            text: sug.crew.map(c => c.name).join(", "),
            content: <div style={{width: '100%', gap: '0.5em', display:'flex', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly'}}>
                <div style={{display:'flex', width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5em'}}>
                    {sug.crew.map((crew, idx) => <div style={{display:'flex', width: `${98 / ships[shipIdx].battle_stations!.length}%`, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25em', textAlign: 'center'}}>
                        
                        <img style={{width: '32px', margin: '0.25em'}} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
                        
                        {crew.name}
                    </div>)}
                </div>
                <hr style={{width:'100%', opacity: '0.25'}}/>
                <div style={{
                    display: 'grid', 
                    gridTemplateAreas: "'bonus rating percentile duration' 'blank min max blank2'",
                    gridTemplateColumns: '20% 20% 20% 20%',
                    lineHeight: '1.25em',
                    paddingLeft: '2em',
                    paddingRight: '2em',
                    justifyContent: 'center',
                    width: '100%',
                    gap: '1em',
                    alignItems: 'center'
                    }}>
                    
                    <div style={{gridArea: 'bonus'}}>
                        {t('ship.crit_bonus')}{': '}<br />{sug.ship.crit_bonus}
                    </div>
                    <div style={{gridArea: 'rating'}}>
                        {t('ship.crit_rating')}{': '}<br />{sug.ship.crit_chance}
                    </div>
                    <div style={{gridArea: 'percentile'}}>
                        {t('global.percentile')}{': '}<br />{sug.percentile.toFixed(1)}
                    </div>
                    <div style={{gridArea: 'duration'}}>
                        {t('ship.duration')}{': '}<br />{sug.battle_time.toFixed()}
                    </div>
                   
                    <div style={{gridArea: 'min'}}>
                        {t('ship.min_attack')}{': '}<br />{Math.round(sug.min_attack).toLocaleString()}
                    </div>
                    <div style={{gridArea: 'max'}}>
                        {battleMode.startsWith("fbb") && <b>*</b>} {t('ship.max_attack')}{': '}<br />{Math.round(sug.max_attack).toLocaleString()}
                    </div>

                    <div style={{gridArea: 'blank2'}}>
                        {!battleMode.startsWith("fbb") && <b>*</b>} {t('ship.weighted_attack')}{': '}<br />{Math.round(sug.weighted_attack).toLocaleString()}
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
            text: t(`ship.${mode.startsWith('fbb') ? 'fbb' : mode}`) + (mode.startsWith('fbb') ?  ` ${rarity}*` : '')
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
					{!running && <div style={{display: 'inline', textAlign: 'left', width: '100%'}}>
						<h3>{t('ship.calculated_crew')}</h3>
                        <Dropdown 
                            search 
                            fluid
                            scrolling
                            selection        
                            clearable                            
                            value={getSuggestion()}
                            onChange={(e, { value }) => setSuggestion(value as string)}
                            options={suggOpts}
                            />
					</div>}
					{running && <div style={{display: 'flex', textAlign: 'center', height: '5.5em', width: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                        {globalContext.core.spin(progressMsg || t('spinners.default'))}
                    </div>}
                    <div style={{display: 'inline', textAlign: 'left', marginTop: '0.5em', width: '100%'}}>
                        <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end',
                                width: '100%',
                                gap: '1em'
                            }}>						
                            <div style={{display: 'inline', width: '30%'}}>
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
                            <div style={{display: 'inline', width: '30%'}}>
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
                            <div style={{display: 'inline', width: '30%'}}>
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
                            <div style={{display:'flex', alignItems:'center', gap: '1em'}}>
                                <Checkbox 
                                    value={t('consider_crew.consider_frozen')}
                                    checked={considerFrozen}
                                    onChange={(e, { checked }) => setConsiderFrozen(checked as boolean)} />
                                
                                {t('consider_crew.consider_frozen')}
                            </div>

                            {!!globalContext.player.playerData && 
                                <div style={{display:'flex', alignItems:'center', gap: '1em'}}>
                                    <Checkbox 
                                        checked={considerUnowned}
                                        onChange={(e, { checked }) => setConsiderUnowned(checked as boolean)} />
                                    {t('consider_crew.consider_unowned')}
                                </div>}

                        </div>
                    </div>
                    <div> 
                        <Button color='green' onClick={() => recommend()}>{running ? t('global.cancel') : t('global.recommend_crew')}</Button>
                        {!running && crewStations?.filter(c => !!c).length === ship?.battle_stations?.length && 
                            <Button color='green' onClick={() => recommend(true)}>{t('ship.calc.run_current_line_up')}</Button>}
                        {!running && <Button onClick={() => setSuggestions([])}>{t('global.clear')}</Button>}
                    </div>
				</div>
    </React.Fragment>

    function recommend(current?: boolean) {
        if (running) {
            cancel();
            return;
        }
        if (ships?.length && crew?.length) {
            if (battleMode.startsWith('fbb') && !opponent) return;
            const config = {
                ship: JSON.parse(JSON.stringify(ship)),
                crew: current ? crewStations : crew,
                battle_mode: battleMode,
                power_depth: powerDepth,
                min_rarity: minRarity,
                max_rarity: ship.rarity,
                max_results: 50,
                opponents: opponent ? [opponent] : undefined,
                defense,
                offense
            } as ShipWorkerConfig;

            setProgressMsg('');
            runWorker('shipworker', config, workerMessage);
        }
    }

    function setSuggestion(sug: string) {
        if (!suggestions?.length || !ships[shipIdx]) return;
        let ids = sug?.length ? sug.split(",").map(s => Number.parseInt(s)) : [];
        let f = sug?.length ? suggestions.find(f => f.crew.every(c => ids.some(s => s === c.id))) : undefined;
        
        setCrewStations(f?.crew as PlayerCrew[] ?? ships[shipIdx].battle_stations?.map(b => undefined))
    }

    function getSuggestion() {    
        if (!crewStations?.length || !suggestions?.length) return '';
        return suggestions.find(f => f.crew.every(c => crewStations.some(s => s?.id === c.id)))?.crew?.map(m => m.id)?.join(",");
    }

    function workerMessage(result: { data: { result: { ships?: ShipWorkerItem[], format?: string, options?: any }, inProgress: boolean }}) {
        if (!result.data.inProgress && result.data.result.ships) {
            setSuggestions(result.data.result.ships);
            setTimeout(() => {
                setCrewStations(result.data.result.ships![0].crew as PlayerCrew[])
            });        
        }
        else if (result.data.inProgress && result.data.result.format) {
            setProgressMsg(t(result.data.result.format, result.data.result.options));
        }
    }
}