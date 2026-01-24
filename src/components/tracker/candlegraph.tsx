import { BoxPlotDatum, ResponsiveBoxPlot } from "@nivo/boxplot";
import React from "react"
import { ResourceData, transKeys } from "./utils";
import themes from "../nivo_themes";
import { GlobalContext } from "../../context/globalcontext";
import { ResourceGraphProps } from "./graphpicker";



export const ResourceCandles = (props: ResourceGraphProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { resources } = props;
    const maxDays = props.maxDays || 14;
    const { data, maxVal, minVal } = React.useMemo(() => {
        let maxVal = 0;
        let minVal = -1;
        let data: BoxPlotDatum[] = resources.map(res => {
            let group = res.timestamp.toLocaleDateString();
            if (res.amount > maxVal) maxVal = res.amount;
            if (minVal == -1 || res.amount < minVal) minVal = res.amount;
            return {
                group,
                subgroup: t(`global.item_types.${transKeys[res.resource]}`),
                value: res.amount,
            }
        });
        let d = new Date();
        data = data.filter(rec => {
            let d2 = new Date(rec.group);
            let diff = Math.ceil((d.getTime() - d2.getTime()) / (1000 * 24 * 60 * 60));
            if (diff > maxDays) return false;
            return true;
        });
        return { data, maxVal, minVal };
    }, [resources]);

    return (<div style={{width: '70vw', height: '70vw'}}>
        <ResponsiveBoxPlot /* or BoxPlot for fixed dimensions */
            data={data}
            margin={{ top: 60, right: 200, bottom: 80, left: 100 }}
            minValue={minVal}
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