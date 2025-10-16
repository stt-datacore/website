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
import { Slider } from "../../base/slider";
import { EventStats, makeTypeBuckets } from "../../../utils/event_stats";

export type EventDistributionType = 'event' | 'mega' | 'traits' | 'variants' | 'type' | 'type_series';


export interface DistributionPickerOpts {

}
type StatDataEntry = { events: number[], crew: string[], key: string, extra?: any };
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
        { key: 'event', value: 'event', text: t('stat_trends.events.event') },
        { key: 'mega', value: 'mega', text: t('stat_trends.events.mega') },
        { key: 'traits', value: 'traits', text: t('stat_trends.events.traits') },
        { key: 'variants', value: 'variants', text: t('stat_trends.events.variants') },
        { key: 'type', value: 'type', text: t('stat_trends.events.type') },
        { key: 'type_series', value: 'type_series', text: t('stat_trends.events.type') + " + " + t('base.series') },
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
        { key: 'sfa', value: 'sfa', text: t('series.sfa') },
        { key: 'original', value: 'original', text: t('series.original') },
    ];

    const chartData = React.useMemo(() => {
        if (type === 'event') return createSeriesEventStats();
        else if (type === 'traits') return createTraitEventStats();
        else if (type === 'variants') return createVariantEventStats();
        else if (type === 'type') return createEventTypeStats();
        else if (type === 'type_series') return createEventTypeStats(true);
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
                            let stats: EventStats | undefined = undefined;
                            let img: string | undefined = undefined;
                            if (data.datum.data.data.extra?.is_event) {
                                stats = data.datum.data.data.extra.bucket[0];
                                img = data.datum.data.data.extra?.image;
                            }
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
                                    {!!cmm && !stats && <span>
                                        <br />
                                        {cmm.date_added.toLocaleDateString()}
                                        </span>}

                                    {!!img && !!stats && (
                                        <div>
                                            <img src={`${process.env.GATSBY_ASSETS_URL}${img}`} style={{padding: 0,margin:0, height: '64px', border: '1px solid gray', borderRadius: '12px'}} />
                                            <br/>{stats?.event_name}
                                            <br/>{stats?.discovered?.toLocaleDateString()}
                                        </div>
                                    )}
                                </p>
                                <span>
                                    {amount}
                                </span>
                                <span>
                                    {t('global.n_x', { n: data.datum.data.events, x: t('menu.game_info.events') })}
                                </span>
                                {!!cmm && <div style={{textAlign:'center'}}>{t('base.rewards')} <AvatarView
                                        mode='crew'
                                        item={cmm}
                                        size={64}
                                    /></div>}
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

        for (let traitinfo of event_scoring.traits) {
                let trait = traitinfo.symbol;
                traits[trait] ??= {
                    events: [],
                    crew: [],
                    key: trait,
                    extra: traitinfo.score
                };

                let ntc = crew.filter(fc => fc.traits.includes(trait) || fc.traits_hidden.includes(trait)).map(cc => cc.symbol);
                traits[trait].crew = [...new Set([...traits[trait].crew ?? [], ...ntc ?? []])];
        }

        const seriesStats = [] as PieSeriesType[];
        let totals = 0;

        Object.keys(traits).forEach(key => {
            let label = TRAIT_NAMES[key];
            if (!label) {
                let so = seriesOptions.find(s => s.value === key);
                if (so) {
                    label = so.text;
                }
                else {
                    return;
                }
            }
            let slen = traits[key].extra as number;
            totals += slen;
            seriesStats.push({
                label: label,
                events: slen,
                proportion: slen / traits[key].crew.length,
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
        for (let evt of event_stats) {
            const featured = evt.featured_crew.map(fc => crew.find(c => c.symbol === fc)!);
            let etraits = [...new Set(featured.map(fe => getVariantTraits(fe)).flat())];

            if (etraits?.length) {
                if (etraits.includes('tpring')) {
                    console.log("here");
                }
                etraits.forEach(fc => {
                    let rcrew = crew.filter(f => f.traits_hidden.includes(fc));
                    if (!rcrew?.length) return;
                    variants[fc] ??= {
                        events: [],
                        crew: [],
                        key: fc
                    };
                    if (!variants[fc].events.includes(evt.instance_id)) variants[fc].events.push(evt.instance_id);
                    for (let rc of rcrew) {
                        if (!variants[fc].crew.includes(rc.symbol)) variants[fc].crew.push(rc.symbol);
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
        return sortSeries(seriesStats).filter(f => f.events >= 5)
    }

    function createEventTypeStats(by_series?: boolean) {
        if (!event_stats?.length) return [];
        const newStats = structuredClone(event_stats) as EventStats[];
        let buckets = makeTypeBuckets(newStats);
        let top = {} as { [key: string]: number };
        Object.entries(buckets).forEach(([type, bucket]) => {
            if (!bucket.length) return;
            bucket.sort((a, b) => {
                return b.min - a.min;
            });

            top[type] ??= 0;
            if (bucket[0] && bucket[0].min > top[type]) top[type] = bucket[0].min;
        });
        const newbucket ={} as {[key: string]: EventStats[]};
        Object.entries(buckets).forEach(([type, bucket]) => {
            const max = top[type];
            bucket.forEach((stat) => {
                let screw = crew.find(f => f.symbol === stat.featured_crew[0]);
                if (by_series && screw) {
                    newbucket[stat.event_type + "/" + screw.series!] ??= [];
                    newbucket[stat.event_type + "/" + screw.series!].push(stat);
                    stat.event_type = stat.event_type.split("/").map(type => t(`event_type.${type}`)).join(" / ") + " / " + t(`series.${screw.series!}`);
                }
                else {
                    stat.event_type = stat.event_type.split("/").map(type => t(`event_type.${type}`)).join(" / ");
                }
                stat.sorted_event_type = stat.sorted_event_type?.split("/").map(type => t(`event_type.${type}`)).join(" / ");
                if (screw && by_series) stat.sorted_event_type += " / " + t(`series.${screw.series!}`);
                stat.percentile = Number(((stat.min / max) * 100).toFixed(1));
            });
            bucket.sort((a, b) => b.percentile! - a.percentile!);
            bucket.forEach((stat, idx) => stat.rank = idx+1);
        });
        if (by_series) buckets = newbucket;
        newStats.sort((a, b) => a.instance_id - b.instance_id);

        let lastDiscovered = new Date();
        let maxidx = newStats.length - 1;

        if (newStats.length && newStats[newStats.length - 1].discovered) {
            lastDiscovered = new Date(newStats[newStats.length - 1].discovered!);
            lastDiscovered.setDate(lastDiscovered.getDate() + 7);
        }

        newStats.forEach((stat, idx) => {
            if (!stat.discovered) {
                let w = maxidx - idx;
                stat.discovered = new Date(lastDiscovered);
                let dow = stat.discovered.getDay();
                dow = 3 - dow;
                stat.discovered.setDate(stat.discovered.getDate() + dow);
                stat.discovered.setDate(stat.discovered.getDate() - (w * 7));
                stat.guessed = true;
            }
            else {
                stat.discovered = new Date(lastDiscovered);
            }
        });
        const seriesStats = [] as PieSeriesType[];
        let totals = newStats.length;

        Object.entries(buckets).forEach(([key, bucket]) => {
            bucket.sort((a, b) => b.discovered!.getTime() - a.discovered!.getTime());
            let ev = globalContext.core.event_instances.find(f => f.instance_id === bucket[0].instance_id);
            seriesStats.push({
                label: key.split("/").map(p => t(`event_type.${p}`) || t(`series.${p}`)).join("/"),
                events: bucket.length,
                proportion: bucket.length / newStats.length,
                score: 0,
                data: {
                    events: bucket.map(m => m.instance_id),
                    crew: bucket.map(b => b.crew),
                    key: bucket[0].event_name,
                    extra: {
                        is_event: true,
                        bucket,
                        image: ev?.image
                    }
                }
            });
        });

        seriesStats.forEach(stat => {
            stat.score = Number(((stat.events / totals) * 100).toFixed(2));
        });

        seriesStats.sort((a, b) => b.score - a.score);
        return sortSeries(seriesStats);
    }

    function randomColor() {
        const py = (n: number) => `${n.toString(16)}`.padStart(2, '0');
        let r = py(Math.floor(Math.random() * 200) + 50);
        let g = py(Math.floor(Math.random() * 200) + 50);
        let b = py(Math.floor(Math.random() * 200) + 50);
        return `#${b}${g}${r}`;
    }

}

