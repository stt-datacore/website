import React from "react";
import { CrewMember } from "../../model/crew";
import { Ship, ShipWorkerConfig, ShipWorkerItem } from "../../model/ship"
import { Dropdown } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { WorkerContext } from "../../context/workercontext";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { PlayerCrew } from "../../model/player";



export interface RosterCalcProps {
    ships: Ship[],
    shipIdx?: number,
    crew: (CrewMember | PlayerCrew)[],
    crewStations: (PlayerCrew | undefined)[],
    setCrewStations: (value: (PlayerCrew | undefined)[]) => void
}

export const ShipRosterCalc = (props: RosterCalcProps) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;		
    const globalContext = React.useContext(GlobalContext);
    const workerContext = React.useContext(WorkerContext);
    const { running, runWorker } = workerContext;
    const { t } = globalContext.localized;

    const { ships, crew, crewStations, setCrewStations } = props;
    const shipIdx = props.shipIdx ?? 0;

    const [suggestions, setSuggestions] = React.useState<ShipWorkerItem[]>([]);

    React.useEffect(() => {
        if (ships?.length && crew?.length) {
            const ship = ships[shipIdx];
            const config = {
                ship,
                crew,
                battle_mode: 'pvp',
                power_depth: 3,
                min_rarity: ship.rarity - 1,
                max_rarity: ship.rarity,
                max_results: 50
            } as ShipWorkerConfig;
    
            runWorker('shipworker', config, afterWorker);
        }
    }, []);

    const suggOpts = suggestions?.map((sug, idx) => {
        return {
            key: sug.ship.symbol + `_sug_${idx}`,
            value: sug.crew.map(c => c.id).join(","),
            text: sug.crew.map(c => c.name).join(", "),
            content: <div style={{width: '100%', gap: '0.5em', display:'flex', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly'}}>
                <div style={{display:'flex', width: '100%', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5em'}}>
                    {sug.crew.map((crew, idx) => <div style={{display:'flex', width: `${98 / ships[shipIdx].battle_stations!.length}%`, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25em', textAlign: 'center'}}>
                        <img style={{width: '24px'}} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
                        {crew.name}
                    </div>)}
                </div>
                <div>
                    {t('ship.crit_bonus')}{' '}{sug.ship.crit_bonus}
                    {', '}
                    {t('ship.crit_rating')}{' '}{sug.ship.crit_chance}
                    {', '}
                    {t('global.percentile')}{' '}{sug.attack.toFixed(1)}
                </div>
            </div>
        }
    })

    return <React.Fragment>
        <div className={'ui segment'} style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'left',
					alignItems: 'center',
					width: isMobile ? '100%' : '50%'
				}}>
					{!running && <>
						<h3>{t('ship.calculated_crew')}</h3>
						<div className={'ui segment'} style={{
							display: 'flex',
							flexDirection: 'row',
							justifyContent: 'left',
							alignItems: 'center',
							width: '100%'
						}}>						
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
						</div>
					</>}
					{running && globalContext.core.spin(t('spinners.default'))}
				</div>
    </React.Fragment>

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

    function afterWorker(result: { data: { result: { ships: ShipWorkerItem[] } }}) {
        const resultCrew = result.data.result.ships[0].crew as PlayerCrew[];
        setSuggestions(result.data.result.ships);
        setTimeout(() => {
            setCrewStations(result.data.result.ships[0].crew as PlayerCrew[])
        });        
    }
}