import { PieTooltipProps, ResponsivePie } from "@nivo/pie";
import React from "react";
import { Checkbox, Dropdown } from "semantic-ui-react";
import { GlobalContext } from "../../../context/globalcontext";
import { getPermutations } from "../../../utils/misc";
import { useStateWithStorage } from "../../../utils/storage";
import CONFIG from "../../CONFIG";
import { AvatarView } from "../../item_presenters/avatarview";
import themes from '../../nivo_themes';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../utils";

export type TraitDistributionType = 'frequent' | 'combo' | 'rarity' | 'series';

export type TraitDataSet = 'portal' | 'variant' | 'hidden' | 'all';

export const CommonExclusions = ['human', 'federation', 'starfleet', 'male', 'female', 'nonhuman', 'organic'];

interface TraitDistributionProps {
    portalTraits: string[];
    variantTraits: string[];
    hiddenTraits: string[];
    allTraits: string[];
}

type StatDataEntry = { traits: string[], crew: string[], key: string, extra?: any };
type StatDataType = { [key: string]: StatDataEntry };

type PieSeriesType = {
    label: string;
    crew: number;
    proportion: number;
    score: number;
    data: StatDataEntry;
}

export const TraitDistributions = (props: TraitDistributionProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES } = globalContext.localized;
    const {
        portalTraits: portalIn,
        allTraits: allIn,
        variantTraits,
        hiddenTraits: hiddenIn
    } = props;

    const [type, setType] = useStateWithStorage<TraitDistributionType>('stattrends/trait_distribution_type', 'frequent');
    const [dataSet, setDataSet] = useStateWithStorage<TraitDataSet>('stattrends/trait_data_set', 'portal');
    const [comboSize, setComboSize] = useStateWithStorage<number>('stattrends/trait_distribution/combo_size', 2, { rememberForever: true });
    const [excludeHFS, setExcludeHFS] = useStateWithStorage<boolean>('stattrends/trait_distribution/exclude_hfs', false, { rememberForever: true });
    const [chartData, setChartData] = React.useState<PieSeriesType[]>([]);
    const [keyedData, setKeyedData] = React.useState<{ [key: string]: PieSeriesType[]}>({});
    const { crew } = globalContext.core;
    const [calculate, setCalculate] = React.useState(0);

    const portalTraits = React.useMemo(() => {
        if (!excludeHFS) return portalIn;
        return portalIn.filter(trait => !CommonExclusions.includes(trait))
    }, [portalIn, excludeHFS]);

    const allTraits = React.useMemo(() => {
        if (!excludeHFS) return allIn;
        return allIn.filter(trait => !CommonExclusions.includes(trait))
    }, [allIn, excludeHFS]);

    const hiddenTraits = React.useMemo(() => {
        if (!excludeHFS) return hiddenIn;
        return hiddenIn.filter(trait => !CommonExclusions.includes(trait))
    }, [hiddenIn, excludeHFS]);

    const dataSetChoices = [
        { key: 'all', value: 'all', text: t('stat_trends.traits.distributions.data_set.all_traits') },
        { key: 'portal', value: 'portal', text: t('stat_trends.traits.distributions.data_set.portal_traits') },
        { key: 'variant', value: 'variant', text: t('stat_trends.traits.distributions.data_set.variant_traits') },
        { key: 'hidden', value: 'hidden', text: t('stat_trends.traits.distributions.data_set.hidden_traits') },
    ];

    const traitChoices = [
        { key: 'frequent', value: 'frequent', text: t('stat_trends.traits.distributions.traits') },
        // { key: 'series', value: 'series', text: t('stat_trends.traits.distributions.series') },
        // { key: 'rarity', value: 'rarity', text: t('stat_trends.traits.distributions.rarity') },
        { key: 'combo', value: 'combo', text: t('stat_trends.traits.distributions.combo') },
    ];

    const flexCol = OptionsPanelFlexColumn;
    const flexRow = OptionsPanelFlexRow;

    const comboOptions = React.useMemo(() => {
        let output = [] as { key: string, value: any, text: string }[];
        let max = dataSet === 'all' ? 2 : 4;
        for (let i = 2; i <= max; i++) {
            output.push({
                key: `combo_${i}`,
                value: i,
                text: `${i} ${t('base.traits')}`
            })
        }
        if (!output.some(o => o.value === comboSize)) setComboSize(output[0].value);
        return output;
    }, [dataSet]);

    React.useEffect(() => {
        if (!portalTraits.length) return;
        if (type === 'combo' && dataSet !== 'variant' && comboSize) {
            createComboStats(comboSize);
        }
        else if (type === 'frequent' || dataSet === 'variant') {
            createComboStats(1);
        }
    }, [type, portalTraits, comboSize, dataSet]);

    return (
        <div style={{ ...flexCol, alignItems: 'flex-start' }}>
            <div style={{margin: '1em 0'}}>
                <Checkbox
                    checked={excludeHFS}
                    onChange={(e, { checked }) => setExcludeHFS(!!checked)}
                    label={t('stat_trends.traits.exclude_x', { x: CommonExclusions.map(trait => TRAIT_NAMES[trait] || trait).join(", ")})}
                    />
            </div>
            <div style={{margin: '1em 0'}}>
                <div style={{margin: '0.5em 0'}}>{t('stat_trends.traits.distributions.select_data_set')}</div>
                <Dropdown
                    selection
                    options={dataSetChoices}
                    value={dataSet}
                    onChange={(e, { value }) => {
                        setDataSet(value as any);
                    }}
                />
            </div>
            {dataSet !== 'variant' && (
            <div>
                <div style={{margin: '0.5em 0'}}>{t('graph.type')}</div>
                    <Dropdown
                    selection
                    options={traitChoices}
                    value={type}
                    onChange={(e, { value }) => {
                        setType(value as any);
                    }}
                    />
                </div>
            )}
            {type === 'combo' && dataSet !== 'variant' &&  (
                <div style={{margin: '1em 0'}}>
                    <div style={{margin: '0.5em 0'}}>{t('retrieval.combo_length')}</div>
                    <Dropdown
                        selection
                        options={comboOptions}
                        value={comboSize}
                        onChange={(e, { value }) => setComboSize(value as number)}
                        />
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '1em' }}>
                <div style={{ height: '50vw', width: '70vw', border: '2px solid #666', borderRadius: '12px' }}>
                    {!!calculate && (<>
                        <div style={{margin: '2em'}}>
                            {globalContext.core.spin(t('spinners.calculating'))}
                        </div>
                    </>)}
                    {!calculate && <ResponsivePie
                        data={chartData}
                        value={'score'}
                        arcLinkLabel={(data) => data.data.label}
                        arcLabel={(data) => `${t('global.n_%', { n: data.value })}`}
                        tooltip={renderTooltip}
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
                    />}
                </div>
            </div>
        </div>
    )

    function renderTooltip(data: PieTooltipProps<PieSeriesType>) {
        let stats: any | undefined = undefined;
        let img: string | undefined = undefined;
        if (data.datum.data.data.extra?.is_event) {
            stats = data.datum.data.data.extra.bucket[0];
            img = data.datum.data.data.extra?.image;
        }
        let fc = crew.filter(cc => data.datum.data.data.crew.includes(cc.symbol))
        if (fc?.length) {
            fc.sort((a, b) => b.date_added.getTime() - a.date_added.getTime());
        }
        let cmm = fc?.length ? fc[0] : undefined;
        let cmmnext = fc?.length ? fc.slice(1, 6) : undefined;
        let label = `${data.datum.label}`;
        let amount = `${t('global.n_%', { n: data.datum.value })}`;
        return (
            <div className="ui label" style={{...flexCol, justifyContent:'flex-start', gap: '1em'}}>
                <div style={{...flexRow, justifyContent:'flex-start', gap: '1em'}}>
                    <div style={{width: '16px', height: '16px', backgroundColor: `${data.datum.color}`}}></div>
                    <p>
                        <span>{label.split("/").map((trait, idx) => <b>{!!idx && <>,&nbsp;</>}{trait}</b>)}</span>
                        {!!cmm && !stats && (
                            <span>
                                <br />
                                {cmm.date_added.toLocaleDateString()}
                            </span>
                        )}
                    </p>
                    <span>
                        {amount}
                    </span>
                    <span>
                        {t('global.n_x', { n: data.datum.data.crew, x: t('base.crew') })}
                    </span>
                    {!!cmm && (
                        <div style={{textAlign:'center'}}>
                            <AvatarView
                                mode='crew'
                                item={cmm}
                                size={64}
                            />
                        </div>
                    )}
                </div>
                {!!cmmnext?.length && (<>
                    <div style={{...flexRow}}>
                        {cmmnext.map(cmmn => (
                            <div style={{textAlign:'center', marginBottom: '0.5em'}}><AvatarView
                                mode='crew'
                                item={cmmn}
                                size={48}
                            /></div>
                        ))}
                    </div>
                </>)}
            </div>
        );
    }

    function createComboStats(comboSize: number) {
        const traitdata = {} as StatDataType;
        const workData = (() => {
            if (dataSet === 'all') return allTraits;
            if (dataSet === 'portal') return portalTraits;
            if (dataSet === 'variant') return variantTraits;
            if (dataSet === 'hidden') return hiddenTraits;
            return portalTraits;
        })();
        setCalculate(1);
        setTimeout(() => {
            const combos = {} as { [key:string]: string[] };
            getPermutations(workData, comboSize, undefined, true, undefined, (items) => {
                let key = items.sort().join("/");
                let fc = crew.filter(f => items.every(trait => f.traits.includes(trait) || f.traits_hidden.includes(trait))).map(c => c.symbol);
                if (fc.length > 2) {
                    combos[key] = fc;
                }
                return items;
            });
            Object.entries(combos).forEach(([combo, roster]) => {
                traitdata[combo] = {
                    key: combo,
                    crew: roster,
                    traits: combo.split("/")
                }
            });
            const seriesStats = [] as PieSeriesType[];
            let totals = 0;

            Object.keys(traitdata).forEach(key => {
                let slen = traitdata[key].traits.length;
                totals += traitdata[key].crew.length;
                let label = key.split("/").map(trait => TRAIT_NAMES[trait] || trait).join("/")
                seriesStats.push({
                    label,
                    crew: traitdata[key].crew.length,
                    proportion: slen,
                    score: 0,
                    data: traitdata[key]
                });
            });

            seriesStats.forEach(stat => {
                stat.score = Number(((stat.crew / totals) * 100).toFixed(2));
            });

            seriesStats.sort((a, b) => b.score - a.score);
            let final = sortSeries(seriesStats);
            if (dataSet === 'variant') final = final.slice(0, 40);
            if (dataSet === 'all') final = final.slice(0, 40);
            if (dataSet === 'portal') final = final.slice(0, 40);
            if (dataSet === 'hidden') final = final.slice(0, 40);
            setChartData(final);
            setCalculate(0);
        }, 100);
    }

    function sortSeries(pieSeries: PieSeriesType[]) {
        return pieSeries.sort((a, b) => {
            let r = b.score - a.score;
            if (!r) r = b.proportion - a.proportion;
            if (!r) r = a.label.localeCompare(b.label);
            return r;
        })
    }

    function randomColor() {
        const py = (n: number) => `${n.toString(16)}`.padStart(2, '0');
        let r = py(Math.floor(Math.random() * 200) + 50);
        let g = py(Math.floor(Math.random() * 200) + 50);
        let b = py(Math.floor(Math.random() * 200) + 50);
        return `#${b}${g}${r}`;
    }
}