import { ResponsiveBar } from "@nivo/bar";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import themes from "../nivo_themes";
import { ResourceGraphProps } from "./graphpicker";
import { transKeys } from "./utils";

export const ResourceBar = (props: ResourceGraphProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;
    const { resources } = props;
    const maxDays = props.maxDays || 14;
    const { data, maxVal, minVal, groups } = React.useMemo(() => {
        let maxVal = 0;
        let minVal = -1;
        let groups = [] as string[];
        let currgroups = {} as any;
        let data = resources.map(res => {
            let group = res.timestamp.toLocaleDateString();
            let currency = t(`global.item_types.${transKeys[res.resource]}`);
            return {
                group,
                currency,
                value: res.amount
            }
        });
        let d = new Date();
        data = data.filter(rec => {
            let d2 = new Date(rec.group);
            let diff = Math.ceil((d.getTime() - d2.getTime()) / (1000 * 24 * 60 * 60));
            if (diff > maxDays) return false;
            let group = rec.group;
            let currency = rec.currency;
            currgroups[group] ??= {} as any;
            currgroups[group][currency] ??= 0;
            currgroups[group][currency] = rec.value;
            if (minVal == -1 || rec.value < minVal) minVal = rec.value;
            if (rec.value > maxVal) maxVal = rec.value;

            return true;
        });
        let records = {} as {[key:string]: any};
        Object.entries(currgroups).forEach(([group, currencies]) => {
            if (!groups.includes(group)) groups.push(group);
            Object.entries(currencies as any).forEach(([currency, value]) => {
                records[currency] ??= {};
                records[currency].currency ??= currency;
                records[currency][group] = value;
            });
        })
        return { data: Object.values(records), maxVal, minVal, groups };
    }, [resources]);

    return (<div style={{width: '70vw', height: '70vw'}}>
        <ResponsiveBar /* or BoxPlot for fixed dimensions */
            data={data}
            margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
            // minValue={minVal}
            // maxValue={maxVal}
            keys={groups}
            theme={themes.dark as any}
            indexBy="currency"
            axisBottom={{ legend: 'Currency', legendOffset: 32 }}
            axisLeft={{ legend: 'Value', legendOffset: -40 }}
            borderRadius={2}
            labelSkipWidth={12}
            labelSkipHeight={12}
            legends={[
            {
                dataFrom: 'keys',
                anchor: 'bottom-right',
                direction: 'column',
                translateX: 120,
                itemsSpacing: 3,
                itemWidth: 100,
                itemHeight: 16
            }
        ]}
        />
    </div>);
}