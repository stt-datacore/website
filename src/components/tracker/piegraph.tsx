import { ResponsiveBar } from "@nivo/bar";
import React from "react";
import { GlobalContext } from "../../context/globalcontext";
import themes from "../nivo_themes";
import { ResourceGraphProps } from "./graphpicker";
import { transKeys } from "./utils";
import { ResponsivePie } from "@nivo/pie";

export const ResourcePie = (props: ResourceGraphProps) => {
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
                value: res.total_change_pct * 100
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
                records[currency].label ??= currency;
                records[currency].value = Math.ceil(value as any);
            });
        })
        return { data: Object.values(records), maxVal, minVal, groups };
    }, [resources]);

    return (<div style={{width: '70vw', height: '70vw'}}>
        <ResponsivePie
            data={data}
            value={'value'}
            arcLinkLabel={(data) => data.data.label}
            arcLabel={(data) => `${t('global.n_%', { n: data.value })}`}
            theme={themes.dark}
            margin={{ top: 180, right: 180, bottom: 180, left: 180 }}
            innerRadius={0.4}
            padAngle={1}
            cornerRadius={12}
            borderWidth={1}
            animate={false}
            colors={(data) => randomColor()}
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