import { BoxPlotDatum, ResponsiveBoxPlot } from "@nivo/boxplot";
import React from "react"
import { ResourceData, transKeys } from "./utils";
import themes from "../nivo_themes";
import { GlobalContext } from "../../context/globalcontext";


export interface ResourceCandleProps {
    resources: ResourceData[];
}

export const ResourceCandles = (props: ResourceCandleProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { resources } = props;

    const { data, maxVal } = React.useMemo(() => {
        let maxVal = 0;
        let data: BoxPlotDatum[] = resources.map(res => {
            let group = res.timestamp.toLocaleDateString();
            if (res.amount > maxVal) maxVal = res.amount;
            return {
                group,
                subgroup: t(`global.item_types.${transKeys[res.resource]}`),
                value: res.amount
            }
        });
        return { data, maxVal };
    }, [resources]);

    return (<div style={{width: '70vw', height: '70vw'}}>
        <ResponsiveBoxPlot /* or BoxPlot for fixed dimensions */
            data={data}
            margin={{ top: 60, right: 200, bottom: 80, left: 100 }}
            minValue={0}
            maxValue={maxVal}
            theme={themes.dark as any}
            subGroupBy="subgroup"
            axisBottom={{ legend: 'Date', legendOffset: 32 }}
            axisLeft={{ legend: 'Value', legendOffset: -80 }}
            borderRadius={2}
            medianColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
            whiskerColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
            legends={[
                {
                    anchor: 'right',
                    direction: 'column',
                    translateX: 100,
                    itemWidth: 60,
                    itemHeight: 20,
                    itemsSpacing: 3
                }
            ]}
        />
    </div>);
}