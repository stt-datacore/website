import { BoxPlotDatum, ResponsiveBoxPlot } from "@nivo/boxplot";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import themes from "../nivo_themes";
import { ResourceGraphProps } from "./graphpicker";
import { resVal, transKeys } from "./utils";

export const ResourceCandles = (props: ResourceGraphProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { resources, mode } = props;
    const maxDays = props.maxDays || 14;
    const { data, maxVal, minVal } = React.useMemo(() => {
        let maxVal = 0;
        let minVal = -1;
        let data: BoxPlotDatum[] = resources.map(res => {
            let group = res.timestamp.toLocaleDateString();
            let n = resVal(res[mode!]);
            if (n > maxVal) maxVal = n;
            if (minVal == -1 || n < minVal) minVal = n;
            return {
                group,
                subgroup: t(`global.item_types.${transKeys[res.resource]}`),
                value: n,
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
    }, [resources, mode]);

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