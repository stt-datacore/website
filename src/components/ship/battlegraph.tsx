import React from "react"
import { Ship, ShipAction } from "../../model/ship"
import { GlobalContext } from "../../context/globalcontext"
import { BumpDatum, BumpSerie, BumpSerieExtraProps } from "@nivo/bump";

import themes from "../nivo_themes";
import { Bump, ResponsiveBump } from '@nivo/bump';
import { SwarmPlot, ResponsiveSwarmPlot } from '@nivo/swarmplot';

import { Dropdown } from "semantic-ui-react";
import { useStateWithStorage } from "../../utils/storage";
import { ShipSkill, TinyShipSkill } from "../item_presenters/shipskill";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { ShipWorkerItem } from "../../model/worker";


interface SwarmData {
    id: string,
    group: string,
    group_data: ShipAction,
    attack: number,
    second: number,
    group_size: number,
    crew?: CrewMember | PlayerCrew,
    ship: Ship
}

export interface BattleGraphProps {
    battle?: ShipWorkerItem;
    className?: string;
    style?: React.CSSProperties;
}

export const BattleGraph = (props: BattleGraphProps) => {
    const globalContext = React.useContext(GlobalContext);

    const { t } = globalContext.localized;
    const { battle, style, className } = props;

    const [bumpData, setBumpData] = React.useState<BumpSerie<BumpDatum, BumpSerieExtraProps>[] | undefined>(undefined);
    const [swarmData, setSwarmData] = React.useState<SwarmData[] | undefined>(undefined);
    const [graphType, setGraphType] = useStateWithStorage<'bump' | 'swarm'>('battleGraph_type', 'bump', { rememberForever: true });

    React.useEffect(() => {
        if (graphType === 'bump') {
            setBumpData(shipRunToBumpChartData());
        }
        else if (graphType === 'swarm') {
            setSwarmData(shipRunToSwarmPlotData());
        }
    }, [battle, graphType])

    if (!battle?.attacks) {
        return <>{globalContext.core.spin(t('spinners.default'))}</>
    }

    const maxAttack = battle.attacks.reduce((p, n) => p > n.attack * n.actions.length ? p : n.attack * n.actions.length, 0);
    const minAttack = battle.attacks.reduce((p, n) => p && p < n.attack * n.actions.length ? p : n.attack * n.actions.length, 0);

    const graphOpts = [{
        key: 'bump',
        value: 'bump',
        text: t('graph.bump')
    },
    {
        key: 'swarm',
        value: 'swarm',
        text: t('graph.swarm')
    }]

    return <div className={className}
        style={{
            display: 'flex',
            flexDirection: 'column',
            justifyItems: 'center',
            alignItems: 'flex-start',
            gap: '1em',
            ...style
        }}>

        <div className={'ui label'} style={{position: 'absolute', zIndex: '100', border:'1px solid #111'}}>
            <Dropdown

                options={graphOpts}
                value={graphType}
                onChange={(e, { value }) => setGraphType(value as 'bump' | 'swarm')}
            />
        </div>

        {bumpData?.length && graphType === 'bump' && <Bump
            width={300 + (bumpData[0].data.length * 60)}
            height={500}
            data={bumpData}
            colors={{ scheme: 'spectral' }}
            lineWidth={3}
            activeLineWidth={6}
            inactiveLineWidth={3}
            inactiveOpacity={0.15}
            pointSize={10}
            activePointSize={10}
            inactivePointSize={0}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={3}
            activePointBorderWidth={3}
            pointBorderColor={{ from: 'serie.color' }}
            axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: -36,
                truncateTickAt: 0
            }}
            axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 32,
                truncateTickAt: 0
            }}
            axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: t('ship.bonus_ability'),
                legendPosition: 'middle',
                legendOffset: -250,
                truncateTickAt: 0,
            }}
            axisRight={{
                // tickSize: 5,
                // tickPadding: 5,
                // tickRotation: 0,
                // legend: 'ranking',
                // legendPosition: 'middle',
                // legendOffset: -40,
                // truncateTickAt: 0

            }}
            layers={['grid', 'axes', 'labels', 'lines', 'mesh']}
            margin={{ top: 40, right: 30, bottom: 40, left: 300 }}
            useMesh={true}
            interpolation={'smooth'}
            xPadding={0}
            xOuterPadding={0}
            yOuterPadding={0}
            theme={themes.dark}
            opacity={1}
            activeOpacity={1}
            startLabel={(series) => series.id}
            startLabelPadding={40}
            startLabelTextColor={'white'}
            endLabel={(series) => ''}
            endLabelPadding={1}
            endLabelTextColor={'transparent'}
            inactivePointBorderWidth={1}
            enableGridX={true}
            enableGridY={true}
            isInteractive={bumpData[0].data.length < 50}
            defaultActiveSerieIds={[]}
            lineTooltip={(series) => ''}
            pointTooltip={(series) => ''}
            role={''}
            //animate={true}
            renderWrapper={false}
            debugMesh={false}
        />}

        {swarmData?.length && graphType === 'swarm' && <SwarmPlot
            width={300 + (battle.attacks!.length * 60)}
            height={500}
            data={swarmData}
            groups={getAllActions().map(act => act.name)}
            value="second"
            valueScale={{ nice: true, type: 'linear', min: 1, max: battle.battle_time, reverse: false }}
            groupBy={'group'}
            theme={themes.dark}
            //valueFormat="$.2f"
            size={(node) => {
                return 10 + (20 * ((node.attack * node.group_size) / (maxAttack - minAttack)));
            }}
            gap={20}
            layout="horizontal"
            forceStrength={1}
            simulationIterations={100}
            borderColor={{
                from: 'color',
                modifiers: [
                    [
                        'darker',
                        0.6
                    ],
                    [
                        'opacity',
                        0.5
                    ]
                ]
            }}
            margin={{ top: 40, right: 30, bottom: 40, left: 300 }}
            axisTop={{
                tickSize: 10,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: -46,
                truncateTickAt: 0
            }}
            tooltip={(node) => {
                return <div className='ui segment' style={{zIndex: '1000'}}>
                    <div style={{display: 'flex'}}>
                        <div className='ui label'>{t('ship.attack')}: {Math.round(node.data.attack).toLocaleString()}</div>
                        <div className='ui label'>{t('ship.battle_stations')}: {node.data.group_size}</div>
                    </div>

                    <TinyShipSkill action={node.data.group_data} />
                </div>
            }}
            colorBy={'group'}
            axisRight={{
                // tickSize: 10,
                // tickPadding: 5,
                // tickRotation: 0,
                // legend: t('ship.bonus_ability'),
                // legendPosition: 'middle',
                // legendOffset: 76,
                // truncateTickAt: 0
            }}
            axisBottom={{
                // tickSize: 10,
                // tickPadding: 5,
                // tickRotation: 0,
                // legend: '',
                // legendPosition: 'middle',
                // legendOffset: 46,
                // truncateTickAt: 0
            }}
            axisLeft={{
                tickSize: 40,
                tickPadding: 10,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: -76,
                truncateTickAt: 0

            }}
        />}
    </div>

    function shipRunToBumpChartData(): BumpSerie<BumpDatum, BumpSerieExtraProps>[] {
        if (!battle?.attacks?.length) return [];
        const allactions = [...battle.ship.actions ?? [], ...battle.crew.map(m => m.action)]

        let attacks = battle.attacks;
        const results = [] as BumpSerie<BumpDatum, BumpSerieExtraProps>[];

        attacks?.forEach((attack) => {
            let i = 0;
            attack.actions.forEach((action) => {
                let curr = results.find(f => action.crew?.toString() === f.id || f.id === action.symbol);
                if (!curr) {
                    curr = {
                        id: action.crew?.toString() || action.symbol,
                        data: []
                    }
                    results.push(curr);
                }
            })
            i++;
        });

        results.sort((a, b) => {
            let aidx = allactions.findIndex(fi => fi.symbol === a.id || fi.crew?.toString() === a.id);
            let bidx = allactions.findIndex(fi => fi.symbol === b.id || fi.crew?.toString() === b.id);
            return aidx - bidx;
        });

        attacks?.forEach((attack, idx) => {
            let i = 1;
            for (let curr of results) {
                if (attack.actions.some(act => act.crew?.toString() === curr.id || act.symbol === curr.id)) {
                    curr.data.push({
                        x: `${attack.second}`,
                        y: (i * 2) - 1
                    });
                }
                else {
                    curr.data.push({
                        x: `${attack.second}`,
                        y: (i * 2)
                    });
                }
                i++;
            }
        });

        results.forEach((r) => {
            r.data.sort((a, b) => {
                let an = typeof a.x === 'number' ? a.x : Number.parseInt(a.x);
                let bn = typeof b.x === 'number' ? b.x : Number.parseInt(b.x);
                return an - bn;
            });
        });

        results.forEach((data) => {
            let curr = allactions.find(f => data.id === f.crew?.toString() || f.symbol === data.id);
            if (curr) {
                data.id = curr.name;
            }
        })

        return results;
    }

    function getAllActions() {
        if (!battle?.attacks?.length) return [];
        return [...battle.ship.actions ?? [], ...battle.crew.map(m => m.action)]
    }

    function shipRunToSwarmPlotData() {
        if (!battle?.attacks?.length) return [];

        let attacks = battle.attacks;
        const results = [] as SwarmData[];
        let id = 0.1;
        attacks?.forEach((attack, idx) => {
            attack.actions.forEach((act) => {
                let resid = `${act.name}_${attack.second}`;
                if (results.some(r => r.id === resid)) return;
                results.push({
                    id: resid,
                    group: act.name,
                    group_data: act,
                    attack: attack.attack,
                    second: attack.second,
                    group_size: attack.actions.length,
                    crew: act.crew ? battle.crew.find(f => f.id === act.crew) : undefined,
                    ship: battle.ship
                });
            });
        });

        return results;
    }

}