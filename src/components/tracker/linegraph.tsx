import { ResponsiveLine } from "@nivo/line";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import themes from "../nivo_themes";
import { ResourceGraphProps } from "./graphpicker";
import { printTipRecord, ResourceData, resVal, transKeys } from "./utils";

export const ResourceLine = (props: ResourceGraphProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { resources, mode } = props;
    const maxDays = props.maxDays || 14;
    const { data } = React.useMemo(() => {
        let maxVal = 0;
        let minVal = -1;
        let currencies = [] as string[];
        let data = resources.map(res => {
            let group = new Date(res.timestamp);
            let currency = t(`global.item_types.${transKeys[res.resource]}`);
            if (!currencies.includes(currency)) currencies.push(currency);
            return {
                group,
                currency,
                value: resVal(res[mode!]),
                data: res
            }
        });
        let d = new Date();
        data = data.filter(rec => {
            let d2 = new Date(rec.group);
            let diff = Math.ceil((d.getTime() - d2.getTime()) / (1000 * 24 * 60 * 60));
            if (diff > maxDays) return false;
            return true;
        });
        let recout = [] as any[]
        for (let currency of currencies) {
            let records = data.filter(df => df.currency === currency).map((rec) => ({ x: rec.group, y: rec.value, data: rec.data }));
            //records = records.filter((r, i) => records.findLastIndex(r2 => r.x.getTime() === r2.x.getTime()) === i);
            recout.push({
                id: currency,
                data: records
            });
        }
        return { data: recout, maxVal, minVal, groups: currencies };
    }, [resources, mode]);

    return (<div style={{width: '70vw', height: '70vw'}}>
        <ResponsiveLine /* or Line for fixed dimensions */
            data={data}
            margin={{ top: 50, right: 160, bottom: 50, left: 60 }}
            yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: true, reverse: false }}
            xScale={{ type: 'time', format: '%Y-%m-%d', nice: true }}
            axisBottom={{ legend: '', legendOffset: 36, tickValues: 'every day', format: '%b %d', }}
            axisLeft={{ legend: '', legendOffset: -40 }}
            tooltip={(data) => {
                let rec = (data.point.data as any)?.data as ResourceData;
                if (rec) {
                    return printTipRecord(rec, t);
                }
                return <></>
            }}
            pointSize={8}
            curve={'monotoneX'}
            pointBorderWidth={2}
            pointBorderColor={{ from: 'seriesColor' }}
            pointLabelYOffset={-12}
            enableTouchCrosshair={true}
            theme={themes.dark as any}
            useMesh
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