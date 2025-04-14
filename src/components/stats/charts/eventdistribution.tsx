import React from "react"
import { GlobalContext } from "../../../context/globalcontext"
import { Dropdown } from "semantic-ui-react";
import { useStateWithStorage } from "../../../utils/storage";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../utils";
import { ResponsivePie } from "@nivo/pie";
import themes from '../../nivo_themes';
import CONFIG from "../../CONFIG";

export type EventDistributionType = 'event' | 'mega';


export interface DistributionPickerOpts {

}

export const EventDistributionPicker = (props: DistributionPickerOpts) => {
    const globalContext = React.useContext(GlobalContext);
    const { t } = globalContext.localized;

    const [type, setType] = useStateWithStorage<EventDistributionType>('stattrends/distribution_type', 'event');

    const { event_stats, crew } = globalContext.core;

    const choices = [
        { key: 'event', value: 'event', text: t('obtained.long.Event') },
        { key: 'mega', value: 'mega', text: t('obtained.long.Mega') },
    ];

    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;
    const seriesOptions = [
        { key: 'tos', value: 'tos', text: t('series.tos') },
        { key: 'tas', value: 'tas', text: t('series.tas') },
        { key: 'tng', value: 'tng', text: t('series.tng') },
        { key: 'ds9', value: 'ds9', text: t('series.ds9') },
        { key: 'voy', value: 'voy', text: t('series.voy') },
        { key: 'ent', value: 'ent', text: t('series.ent') },
        { key: 'dsc', value: 'dsc', text: t('series.dsc') },
        { key: 'pic', value: 'pic', text: t('series.pic') },
        { key: 'low', value: 'low', text: t('series.low') },
        { key: 'snw', value: 'snw', text: t('series.snw') },
        { key: 'vst', value: 'vst', text: t('series.vst') },
        { key: 'original', value: 'original', text: t('series.original') },
    ];
    const seriesList = seriesOptions.map(so => so.value);
    const series = {} as any;
    const traits = {} as any;

    for (let evt of event_stats) {
        let etraits = evt?.bonus_traits ?? [];
        etraits = etraits.concat(evt?.featured_traits ?? []);
        if (etraits.length) {
            etraits.forEach(trait => {
                traits[trait] ??= {
                    events: [],
                    crew: []
                };

                let ntc = crew.filter(fc => fc.traits.includes(trait) || fc.traits_hidden.includes(trait)).map(cc => cc.symbol);
                if (!traits[trait].events.includes(evt.instance_id)) traits[trait].events.push(evt.instance_id);
                traits[trait].crew = [...new Set([...traits[trait].crew ?? [], ...ntc ?? []])];
            });
        }
        if (evt.featured_crew?.length) {
            evt.featured_crew.forEach(fc => {
                let rcrew = crew.find(f => f.symbol === fc);
                if (!rcrew) return;
                let sfl = seriesList.filter(trait => rcrew.traits_hidden.includes(trait));
                for (let ser of sfl) {
                    series[ser] ??= {
                        events: [],
                        crew: []
                    };
                    if (!series[ser].crew.includes(fc)) series[ser].crew.push(fc);
                    if (!series[ser].events.includes(evt.instance_id)) series[ser].events.push(evt.instance_id);
                }
            });
        }
    }

    const seriesStats = [] as any[];
    let totals = 0;

    Object.keys(series).forEach(key => {
        let slen = series[key].events.length;
        totals += slen;
        seriesStats.push({
            label: t(`series.${key}`),
            events: slen,
            proportion: series[key].events.length / series[key].crew.length
        });
    });

    seriesStats.forEach(stat => {
        stat.score = Number(((stat.events / totals) * 100).toFixed(2));
    });

    seriesStats.sort((a, b) => b.score - a.score);

    return (
        <div style={{ ...flexCol, alignItems: 'flex-start' }}>
            <Dropdown
                selection
                options={choices}
                value={type}
                onChange={(e, { value }) => {
                    setType(value as any);
                }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '1em' }}>
                <div style={{ height: '50vw', width: '70vw', border: '2px solid #666', borderRadius: '12px' }}>
                    <ResponsivePie
                        data={seriesStats}
                        value={'score'}
                        arcLinkLabel={(data) => data.data.label}
                        arcLabel={(data) => `${t('global.n_%', { n: data.value })}`}
                        tooltip={(data) => {

                            let series = `${data.datum.label}`;
                            let amount = `${t('global.n_%', { n: data.datum.value })}`;
                            return <div className="ui label" style={{...flexRow, justifyContent:'flex-start', gap: '1em'}}>
                                <div style={{width: '16px', height: '16px', backgroundColor: `${data.datum.color}`}}></div>
                                {series} {amount}
                                </div>
                        }}
                        theme={themes.dark}
                        margin={{ top: 80, right: 80, bottom: 80, left: 80 }}
                        innerRadius={0.2}
                        padAngle={2}
                        cornerRadius={2}
                        borderWidth={1}
                        colors={(data) => {
                            let id = seriesStats.findIndex(fi => fi.score === data.value)
                            id = 5 - id;
                            if (id >= 0) {
                                if (id > 5) id = 5;
                                return CONFIG.RARITIES[id].color;
                            }
                            return `#${Math.ceil(Math.random() * 0x7fffff).toString(16)}`;
                        }}
                        animate={false}
                        //slicesLabelsTextColor='#333333'
                        // legends={[
                        //     {
                        //         anchor: 'bottom',
                        //         direction: 'column',
                        //         translateY: 280,
                        //         translateX: 400,
                        //         itemWidth: 100,
                        //         itemHeight: 18,
                        //         itemTextColor: '#999',
                        //         symbolSize: 18,
                        //         symbolShape: 'circle',
                        //         effects: [
                        //             {
                        //                 on: 'hover',
                        //                 style: {
                        //                     itemTextColor: '#000',
                        //                 },
                        //             },
                        //         ],
                        //     },
                        // ]}
                    />
                </div>
            </div>
        </div>
    )

}


export const EventDistributionGrid = () => {

    const globalContext = React.useContext(GlobalContext);





}