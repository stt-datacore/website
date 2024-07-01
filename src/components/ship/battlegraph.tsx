import React from "react"
import { ShipWorkerItem } from "../../model/ship"
import { GlobalContext } from "../../context/globalcontext"
import { BumpDatum, BumpSerie, BumpSerieExtraProps } from "@nivo/bump";

import themes from "../nivo_themes";
import { Bump, ResponsiveBump } from '@nivo/bump';


export interface BattleGraphProps {
    battle?: ShipWorkerItem;
    className?: string;
    style?: React.CSSProperties;
}

export const BattleGraph = (props: BattleGraphProps) => {
    const globalContext = React.useContext(GlobalContext);

    const { t } = globalContext.localized;
    const { battle, style, className } = props;

    const [chartData, setChartData] = React.useState<BumpSerie<BumpDatum, BumpSerieExtraProps>[] | undefined>(undefined);

    React.useEffect(() => {
        setChartData(shipRunToChartData());
    }, [battle])

    if (!battle || !chartData?.length) {
        return <>{globalContext.core.spin(t('spinners.default'))}</>
    }

    return <div className={className}
                style={style}>
        {chartData && <Bump
            width={300 + (chartData[0].data.length * 60)}
            height={500}
            data={chartData}
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
            layers={['grid', 'axes', 'labels', 'lines',  'mesh']}
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
            isInteractive={chartData[0].data.length < 50}
            defaultActiveSerieIds={[]}            
            lineTooltip={(series) => ''}
            pointTooltip={(series) => ''}
            role={''}
            //animate={true}
            renderWrapper={false}
            debugMesh={false}
        />}
    </div>

    function shipRunToChartData(): BumpSerie<BumpDatum, BumpSerieExtraProps>[] {
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
                        x: `${attack.second + 1}`,
                        y: (i * 2) - 1
                    });
                }
                else {
                    curr.data.push({
                        x: `${attack.second + 1}`,
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
}