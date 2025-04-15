import React from "react"
import { GlobalContext } from "../../../context/globalcontext"
import { Dropdown } from "semantic-ui-react";
import { useStateWithStorage } from "../../../utils/storage";
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../utils";
import { ResponsivePie } from "@nivo/pie";
import themes from '../../nivo_themes';
import CONFIG from "../../CONFIG";
import { getVariantTraits } from "../../../utils/crewutils";
import { AvatarView } from "../../item_presenters/avatarview";

export type EventDistributionType = 'event' | 'mega' | 'traits' | 'variants';


export interface DistributionPickerOpts {

}
type StatDataEntry = { events: number[], crew: string[], key: string };
type StatDataType = { [key: string]: StatDataEntry };

type PieSeriesType = {
    label: string;
    events: number;
    proportion: number;
    score: number;
    data: StatDataEntry;
}

export const EventDistributionPicker = (props: DistributionPickerOpts) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;

    const [type, setType] = useStateWithStorage<EventDistributionType>('stattrends/distribution_type', 'event');

    const { event_stats, crew, event_scoring } = globalContext.core;

    const eventChoices = [
        { key: 'event', value: 'event', text: t('obtained.long.Event') },
        { key: 'mega', value: 'mega', text: t('obtained.long.Mega') },
        { key: 'traits', value: 'traits', text: t('base.traits') },
        { key: 'variants', value: 'variants', text: t('base.variants') },
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

    const chartData = React.useMemo(() => {
        if (type === 'event') return createSeriesEventStats();
        else if (type === 'traits') return createTraitEventStats();
        else if (type === 'variants') return createVariantEventStats();
        else return createSeriesMegaStats();
    }, [type]);

    return (
        <div style={{ ...flexCol, alignItems: 'flex-start' }}>
            <Dropdown
                selection
                options={eventChoices}
                value={type}
                onChange={(e, { value }) => {
                    setType(value as any);
                }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '1em' }}>
                <div style={{ height: '50vw', width: '70vw', border: '2px solid #666', borderRadius: '12px' }}>
                    <ResponsivePie
                        data={chartData}
                        value={'score'}
                        arcLinkLabel={(data) => data.data.label}
                        arcLabel={(data) => `${t('global.n_%', { n: data.value })}`}
                        tooltip={(data) => {
                            let fc = crew.filter(cc => data.datum.data.data.crew.includes(cc.symbol))
                            if (fc?.length) {
                                if (fc.some(cc => cc.obtained === 'Event' || cc.obtained === 'Mega')) {
                                    fc = fc.filter(cc => cc.obtained === 'Event' || cc.obtained === 'Mega')
                                    fc.sort((a, b) => b.date_added.getTime() - a.date_added.getTime());
                                }
                                else {
                                    fc.sort((a, b) => b.ranks.scores.overall - a.ranks.scores.overall);
                                }
                            }
                            let cmm = fc?.length ? fc[0] : undefined;

                            let label = `${data.datum.label}`;
                            let amount = `${t('global.n_%', { n: data.datum.value })}`;
                            return <div className="ui label" style={{...flexRow, justifyContent:'flex-start', gap: '1em'}}>
                                <div style={{width: '16px', height: '16px', backgroundColor: `${data.datum.color}`}}></div>
                                <p>
                                    <span>{label}</span>
                                    {!!cmm && <span>
                                        <br />
                                        {cmm.date_added.toLocaleDateString()}
                                        </span>}

                                </p>
                                <span>
                                    {amount}
                                </span>
                                <span>
                                    {t('global.n_x', { n: data.datum.data.data.events.length, x: t('menu.game_info.events') })}
                                </span>
                                {!!cmm && <AvatarView
                                        mode='crew'
                                        item={cmm}
                                        size={64}
                                    />}
                                </div>
                        }}
                        theme={themes.dark}
                        margin={{ top: 80, right: 80, bottom: 80, left: 80 }}
                        innerRadius={0.4}
                        padAngle={1}
                        cornerRadius={12}
                        borderWidth={1}
                        colors={(data) => {
                            let id = chartData.findIndex(fi => fi.score === data.data.score && fi.label === data.data.label)
                            if (id >= 0 && id < 5) {
                                id++;
                                id = 6 - id;
                                return CONFIG.RARITIES[id].color;
                            }
                            return `${randomColor()}`;
                        }}
                        animate={false}
                    />
                </div>
            </div>
        </div>
    )

    function createTraitEventStats() {
        const traits = {} as StatDataType;

        for (let evt of event_stats) {
            let etraits = evt?.bonus_traits ?? [];

            etraits = etraits.concat(evt?.featured_traits ?? []);
            if (etraits.length) {
                etraits.forEach(trait => {
                    traits[trait] ??= {
                        events: [],
                        crew: [],
                        key: trait
                    };

                    let ntc = crew.filter(fc => fc.traits.includes(trait) || fc.traits_hidden.includes(trait)).map(cc => cc.symbol);
                    if (!traits[trait].events.includes(evt.instance_id)) traits[trait].events.push(evt.instance_id);
                    traits[trait].crew = [...new Set([...traits[trait].crew ?? [], ...ntc ?? []])];
                });
            }
        }

        const seriesStats = [] as PieSeriesType[];
        let totals = 0;

        Object.keys(traits).forEach(key => {
            if (!TRAIT_NAMES[key]) return;
            let slen = traits[key].events.length;
            totals += slen;
            seriesStats.push({
                label: TRAIT_NAMES[key] || key,
                events: slen,
                proportion: traits[key].events.length / traits[key].crew.length,
                score: 0,
                data: traits[key]
            });
        });

        seriesStats.forEach(stat => {
            stat.score = Number(((stat.events / totals) * 100).toFixed(2));
        });

        seriesStats.sort((a, b) => b.score - a.score);
        return sortSeries(seriesStats);
    }

    function createSeriesEventStats() {
        const seriesList = seriesOptions.map(so => so.value);
        const series = {} as StatDataType;

        for (let evt of event_stats) {
            if (evt.featured_crew?.length) {
                evt.featured_crew.forEach(fc => {
                    let rcrew = crew.find(f => f.symbol === fc);
                    if (!rcrew) return;
                    let sfl = seriesList.filter(trait => rcrew.traits_hidden.includes(trait));
                    for (let ser of sfl) {
                        series[ser] ??= {
                            events: [],
                            crew: [],
                            key: ser
                        };
                        if (!series[ser].crew.includes(fc)) series[ser].crew.push(fc);
                        if (!series[ser].events.includes(evt.instance_id)) series[ser].events.push(evt.instance_id);
                    }
                });
            }
        }

        const seriesStats = [] as PieSeriesType[];
        let totals = 0;

        Object.keys(series).forEach(key => {
            let slen = series[key].events.length;
            totals += slen;
            seriesStats.push({
                label: t(`series.${key}`),
                events: slen,
                proportion: series[key].events.length / series[key].crew.length,
                score: 0,
                data: series[key]
            });
        });

        seriesStats.forEach(stat => {
            stat.score = Number(((stat.events / totals) * 100).toFixed(2));
        });

        seriesStats.sort((a, b) => b.score - a.score);
        return sortSeries(seriesStats);
    }

    function createSeriesMegaStats() {
        const seriesList = seriesOptions.map(so => so.value);
        const series = {} as StatDataType;
        const estats = [...event_stats];
        estats.sort((a, b) => a.instance_id - b.instance_id);

        const megacrew = crew.filter(c => c.obtained === 'Mega');
        megacrew.forEach(c => {
            let rcrew = crew.find(f => f.symbol === c.symbol);
            let evt = event_stats.find(f => f.featured_crew.includes(c.symbol));
            if (!rcrew || !evt) return;
            let sfl = seriesList.filter(trait => rcrew.traits_hidden.includes(trait));
            for (let ser of sfl) {
                series[ser] ??= {
                    events: [],
                    crew: [],
                    key: ser
                };
                if (!series[ser].crew.includes(c.symbol)) series[ser].crew.push(c.symbol);
                if (!series[ser].events.includes(evt.instance_id)) series[ser].events.push(evt.instance_id);
            }
        });
        const seriesStats = [] as PieSeriesType[];
        let totals = 0;

        Object.keys(series).forEach(key => {
            let slen = series[key].events.length;
            totals += slen;
            seriesStats.push({
                label: t(`series.${key}`),
                events: slen,
                proportion: series[key].events.length / series[key].crew.length,
                score: 0,
                data: series[key]
            });
        });

        seriesStats.forEach(stat => {
            stat.score = Number(((stat.events / totals) * 100).toFixed(2));
        });

        seriesStats.sort((a, b) => b.score - a.score);
        return sortSeries(seriesStats);
    }

    function sortSeries(pieSeries: PieSeriesType[]) {
        return pieSeries.sort((a, b) => {
            let r = b.score - a.score;
            if (!r) r = b.proportion - a.proportion;
            if (!r) r = a.label.localeCompare(b.label);
            return r;
        })
    }

    function createVariantEventStats() {
        const variants = {} as StatDataType;
        const vtry = event_scoring.variants.map(v => v.symbol)
        for (let evt of event_stats) {
            let etraits = evt?.bonus_traits ?? [];
            etraits = etraits.concat(evt?.featured_traits ?? []).filter(f => vtry.includes(f));
            if (etraits?.length) {
                etraits.forEach(fc => {
                    let rcrew = crew.find(f => f.traits_hidden.includes(fc));
                    if (!rcrew) return;
                    let sfl = getVariantTraits(rcrew);
                    for (let ser of sfl) {
                        variants[ser] ??= {
                            events: [],
                            crew: [],
                            key: ser
                        };
                        if (!variants[ser].crew.includes(fc)) variants[ser].crew.push(fc);
                        if (!variants[ser].events.includes(evt.instance_id)) variants[ser].events.push(evt.instance_id);
                    }
                });
            }
        }

        const seriesStats = [] as PieSeriesType[];
        let totals = 0;

        Object.keys(variants).forEach(key => {
            let slen = variants[key].events.length;
            totals += slen;
            seriesStats.push({
                label: key,
                events: slen,
                proportion: variants[key].events.length / variants[key].crew.length,
                score: 0,
                data: variants[key]
            });
        });

        seriesStats.forEach(stat => {
            stat.score = Number(((stat.events / totals) * 100).toFixed(2));
        });

        seriesStats.sort((a, b) => b.score - a.score);
        return sortSeries(seriesStats).slice(0, 25);
    }

    function randomColor() {
        const py = (n: number) => `${n.toString(16)}`.padStart(2, '0');
        let r = py(Math.floor(Math.random() * 200) + 50);
        let g = py(Math.floor(Math.random() * 200) + 50);
        let b = py(Math.floor(Math.random() * 200) + 50);
        return `#${b}${g}${r}`;
    }

}

