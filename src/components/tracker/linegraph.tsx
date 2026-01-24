import { ResponsiveBar } from "@nivo/bar";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import themes from "../nivo_themes";
import { ResourceGraphProps } from "./graphpicker";
import { transKeys } from "./utils";
import { ResponsiveLine } from "@nivo/line";

export const ResourceLine = (props: ResourceGraphProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { resources } = props;
    const maxDays = props.maxDays || 14;
    const { data, maxVal, minVal, groups } = React.useMemo(() => {
        let maxVal = 0;
        let minVal = -1;
        let groups = [] as string[];
        let data = resources.map(res => {
            let group = res.timestamp.toISOString().slice(0, 13);
            let currency = t(`global.item_types.${transKeys[res.resource]}`);
            return {
                group,
                currency,
                value: res.total_change_pct * 100
            }
        });
        let d = new Date();
        data = data.filter(rec => {
            let d2 = new Date(rec.group);
            let diff = Math.ceil((d.getTime() - d2.getTime()) / (1000 * 24 * 60 * 60));
            if (diff > maxDays) return false;
            if (!groups.includes(rec.currency)) groups.push(rec.currency)
            return true;
        });
        let recout = [] as any[]
        for (let currency of groups) {
            let records = data.filter(df => df.currency === currency).map((rec) => ({ x: rec.group, y: rec.value }));
            records = records.filter((r, i) => records.findLastIndex(r2 => r.x === r2.x) === i);
            recout.push({
                id: currency,
                data: records
            });
        }
        return { data: recout, maxVal, minVal, groups };
    }, [resources]);

    return (<div style={{width: '70vw', height: '70vw'}}>
        <ResponsiveLine /* or Line for fixed dimensions */
            data={data}
            margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: true, reverse: false }}
            axisBottom={{ legend: '', legendOffset: 36 }}
            axisLeft={{ legend: '', legendOffset: -40 }}
            pointSize={10}
            pointColor={{ theme: 'background' }}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'seriesColor' }}
            pointLabelYOffset={-12}
            enableTouchCrosshair={true}
            theme={themes.dark as any}
            useMesh={true}
            legends={[
                {
                    anchor: 'bottom-right',
                    direction: 'column',
                    translateX: 100,
                    itemWidth: 80,
                    itemHeight: 22,
                    symbolShape: 'circle'
                }
            ]}
        />
    </div>);

    function randomColor() {
        const py = (n: number) => `${n.toString(16)}`.padStart(2, '0');
        let r = py(Math.floor(Math.random() * 200) + 50);
        let g = py(Math.floor(Math.random() * 200) + 50);
        let b = py(Math.floor(Math.random() * 200) + 50);
        return `#${b}${g}${r}`;
    }

}