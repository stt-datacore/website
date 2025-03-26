import React from "react"
import { GlobalContext } from "../../../context/globalcontext"
import { ITableConfigRow, SearchableTable } from "../../searchabletable";
import { Checkbox, Table } from "semantic-ui-react";
import { approxDate, computePotentialColScores, GameEpoch, OptionsPanelFlexColumn, OptionsPanelFlexRow, potentialCols, SpecialCols } from "../utils";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';
import { AvatarView } from "../../item_presenters/avatarview";
import { CrewMember } from "../../../model/crew";
import { omniSearchFilter } from "../../../utils/omnisearch";
import { useStateWithStorage } from "../../../utils/storage";
import { getVariantTraits, gradeToColor, oneCrewCopy } from "../../../utils/crewutils";
import { getIconPath } from "../../../utils/assets";
import { TraitStats } from "../model";
import { TraitDive } from "./traitdive";
import { renderDataScoreColumn } from "../../crewtables/views/base";
import CONFIG from "../../CONFIG";

export const TraitStatsTable = () => {

    const globalContext = React.useContext(GlobalContext);
    const { t, tfmt, TRAIT_NAMES, COLLECTIONS } = globalContext.localized;
    const { crew, collections, keystones } = globalContext.core;
    const [stats, setStats] = React.useState<TraitStats[]>([]);
    const [excludeLaunch, setExcludeLaunch] = useStateWithStorage<boolean>('stat_trends/traits/exclude_launch', false, { rememberForever: true });
    const [showHidden, setShowHidden] = useStateWithStorage<boolean>('stat_trends/traits/show_hidden', false, { rememberForever: true });
    const [showSeries, setShowSeries] = useStateWithStorage<boolean>('stat_trends/traits/show_series', false, { rememberForever: true });
    const [showVisible, setShowVisible] = useStateWithStorage<boolean>('stat_trends/traits/show_visible', true, { rememberForever: true });
    const [onlyPotential, setOnlyPotential] = useStateWithStorage<boolean>('stat_trends/traits/only_potential', false, { rememberForever: true });
    const [hideOne, setHideOne] = useStateWithStorage<boolean>('stat_trends/traits/hide_one', false, { rememberForever: true });
    const [showVariantTraits, setShowVariantTraits] = useStateWithStorage<boolean>('stat_trends/traits/show_variant_traits', true, { rememberForever: true });

    const [showDive, setShowDive] = useStateWithStorage<TraitStats | undefined>('stat_trends/traits/trait_dive', undefined)

    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;

    const potential = React.useMemo(() =>
        computePotentialColScores(crew, collections, TRAIT_NAMES),
    [crew, collections, TRAIT_NAMES]);

    const calcReleaseVague = (min: number, max: number) => {
        let d = new Date(GameEpoch);
        let dn = ((max - min) / 4) + 91;
        d.setDate(d.getDate() + dn);
        return d;
    }

    const calcRelease = (number: number, items: { id: number, date: Date }[]) => {
        let n = -1;
        let nidx = -1;
        let i = 0;
        for (let item of items) {
            if (item.id > number) break;
            let z = number - item.id;
            if (z >= 0 && (n === -1 || z < n)) {
                n = z;
                nidx = i;
            }
            i++;
        }
        if (n < 0 || nidx < 0) return new Date(GameEpoch);
        let d = new Date(items[nidx].date);
        d.setHours(d.getHours() - ((number - n) / 40));
        return d;
    }

    const colSpecialDate = (c: string) => {
        let reg = /^([a-z]+)(\d+)$/;
        if (reg.test(c)) {
            let res = reg.exec(c);
            if (res && res[2].length === 4) {
                return new Date(`${res[1]} ${res[2]}`);
            }
        }
        return null;
    }

    React.useEffect(() => {
        if (!crew?.length) return;
        let work = [...crew];
        work.sort((a, b) => a.date_added.getTime() - b.date_added.getTime() || a.archetype_id - b.archetype_id || (a.name_english || a.name).localeCompare(b.name_english ?? b.name));
        let crewitems = crew.map(c => {
            let symbol = c.equipment_slots.findLast(f => f.level >= 99)?.symbol ?? '';
            let item = globalContext.core.items.find(f => f.symbol === symbol);
            if (item) {
                return {
                    id: Number(item.id),
                    date: c.date_added
                }
            }
            else return {
                id: 0,
                date: new Date()
            }
        }).filter(f => f.id).sort((a, b) => a.id - b.id);

        let workstones = [...keystones];
        workstones.sort((a, b) => a.id - b.id);

        const stones = {} as { [key: string]: Date }
        const stoneicons = {} as { [key: string]: string }
        const ntraits = [] as string[];
        const htraits = [] as string[];
        const min = workstones[0].id;
        workstones.forEach((ks) => {
            if (ks.symbol.endsWith("_crate")) return;
            let t = ks.symbol.replace("_keystone", "");
            let d = calcReleaseVague(min, ks.id);
            if (d.getUTCFullYear() >= 2022) d = calcRelease(ks.id, crewitems);
            if (d.getUTCFullYear() === 2016) d = new Date(GameEpoch);
            stones[t] = d;
            stoneicons[t] = getIconPath(ks.icon);
        });

        const vtsn = {} as { [key: string]: string[] };

        work.forEach((c) => {
            const variants = getVariantTraits(c);
            if (showVariantTraits) {
                c.traits_hidden.forEach(ct => {
                    if (!variants.includes(ct)) return;
                    if (!htraits.includes(ct) && !ntraits.includes(ct)) htraits.push(ct);
                    vtsn[ct] ??= [];
                    if (!vtsn[ct].includes(c.short_name)) {
                        vtsn[ct].push(c.short_name);
                    }
                });
            }
            if (showVisible) {
                c.traits.forEach(ct => {
                    if (!ntraits.includes(ct) && !htraits.includes(ct)) ntraits.push(ct);
                });
            }
            if (showHidden) {
                c.traits_hidden.forEach(ct => {
                    if (variants.includes(ct) && !showVariantTraits) return;
                    //if (CONFIG.SERIES.includes(ct) && !showSeries) return;
                    if (!htraits.includes(ct) && !ntraits.includes(ct)) htraits.push(ct);
                });
            }
            if (showSeries) {
                c.traits_hidden.forEach(ct => {
                    if (!CONFIG.SERIES.includes(ct)) return;
                    if (!htraits.includes(ct) && !ntraits.includes(ct)) htraits.push(ct);
                });
            }
        });

        const outstats = [] as TraitStats[];

        [ntraits, htraits].forEach((traitset, idx) => {
            const hidden = idx === 1;
            traitset.forEach((trait) => {
                let potrec = potential.find(f => f.trait === trait);
                if (onlyPotential && !potrec) return;
                let tcrew = work.filter(c => (!hidden ? c.traits : c.traits_hidden).includes(trait))
                if (!tcrew.length) return;
                if (hideOne && tcrew.length === 1) return;
                let d = colSpecialDate(trait) || stones[trait];
                let release = d && (d.getUTCFullYear() === 2016 && d.getUTCMonth() < 6);
                if (!d || d.getTime() < tcrew[0].date_added.getTime()) {
                    d = tcrew[0].date_added;
                }
                if (d.getUTCFullYear() === 2016) {
                    if (tcrew[0].date_added.getTime() !== GameEpoch.getTime()) {
                        d = tcrew[0].date_added;
                    }
                }
                let dscrew = [...tcrew].sort((a, b) => b.ranks.scores.overall - a.ranks.scores.overall)[0];
                let rcrew = tcrew.filter(c => c.date_added.getTime() < d.getTime() - (1000 * 24 * 60 * 60 * 10));
                const newtrait: TraitStats = {
                    trait: !hidden && TRAIT_NAMES[trait] || trait,
                    trait_raw: trait,
                    collection: '',
                    first_appearance: d,
                    first_crew: tcrew[0],
                    latest_crew: tcrew[tcrew.length - 1],
                    total_crew: tcrew.length,
                    hidden,
                    variant: !!vtsn[trait]?.length,
                    crew: tcrew,
                    short_names: vtsn[trait],
                    retro: release ? 0 : rcrew.length,
                    icon: stoneicons[trait],
                    grade: potrec?.count,
                    highest_datascore: dscrew
                };
                if (!hidden || SpecialCols[trait]) {
                    if (SpecialCols[trait]) {
                        let col = collections.find(f => f.id == SpecialCols[trait]);
                        if (col) {
                            newtrait.collection = COLLECTIONS[`cc-${col.type_id}`]?.name ?? col.name
                        }
                    }
                    else {
                        let col = collections.find(f => f.description?.toLowerCase().includes(">" + (TRAIT_NAMES[trait]?.toLowerCase() ?? '') + "<"));
                        if (col) {
                            newtrait.collection = COLLECTIONS[`cc-${col.type_id}`]?.name ?? col.name
                        }
                    }
                }
                else {
                    newtrait.collection = ''
                }
                tcrew.sort((a, b) => {
                    let adiff = Math.abs(a.date_added.getTime() - d.getTime());
                    let bdiff = Math.abs(b.date_added.getTime() - d.getTime());
                    let r = adiff - bdiff;
                    if (!r) r = a.archetype_id - b.archetype_id;
                    if (!r) r = a.name.localeCompare(b.name);
                    return r;
                });
                if (Math.abs(tcrew[0].date_added.getTime() - d.getTime()) <= (1000 * 24 * 60 * 60 * 10)) {
                    if (tcrew[0].symbol !== newtrait.first_crew.symbol)
                        newtrait.launch_crew = tcrew[0];
                }
                else if (!release) {
                    let t = tcrew.find(f => d.getTime() < f.date_added.getTime());
                    if (t) newtrait.launch_crew = t;
                }
                if (newtrait.launch_crew?.symbol === newtrait.latest_crew?.symbol) newtrait.launch_crew = undefined;
                if (newtrait.retro == tcrew.length) {
                    newtrait.retro = 0;
                    newtrait.first_appearance = newtrait.first_crew.date_added;
                }
                if (!newtrait.launch_crew || newtrait.launch_crew?.symbol === newtrait.latest_crew?.symbol) {
                    newtrait.retro = 0;
                    newtrait.first_appearance = newtrait.first_crew.date_added;
                }
                if (!excludeLaunch || newtrait.first_appearance.getTime() !== GameEpoch.getTime()) {
                    outstats.push(newtrait);
                }
            });
        });

        setStats(outstats);
    }, [crew, showHidden, showVariantTraits, hideOne, showVisible, excludeLaunch, onlyPotential, showSeries]);

    const potreckey = t('stat_trends.traits.potential_collection_score_n', { n: '' });
    const tableConfig = [
        { width: 1, column: 'trait', title: t('stat_trends.trait_columns.trait') },
        {
            width: 1,
            column: 'hidden',
            title: t('stat_trends.trait_columns.hidden'),
            customCompare: (a: TraitStats, b: TraitStats) => {
                if (a.hidden == b.hidden) return a.trait.localeCompare(b.trait)
                if (!a.hidden) return -1;
                else if (!b.hidden) return 1;
                return 0;
            }
        },
        {
            width: 1,
            column: 'collection',
            title: t('stat_trends.trait_columns.collection'),
            customCompare: (a: TraitStats, b: TraitStats) => {
                let f1 = potential.find(f => f.trait === a.trait_raw)
                let f2 = potential.find(f => f.trait === b.trait_raw)
                if (f1 && f2) {
                    return f1.count - f2.count
                }
                else if (f1 && !b.collection) return 1;
                else if (f1 && b.collection) return -1;
                else if (f2 && !a.collection) return -1;
                else if (f2 && a.collection) return 1;
                return a.collection.localeCompare(b.collection);
            }
        },
        {
            width: 1,
            column: 'first_appearance',
            title: t('stat_trends.trait_columns.first_appearance'),
            customCompare: (a: TraitStats, b: TraitStats) => {
                return a.first_appearance.getTime() - b.first_appearance.getTime();
            }
        },
        {
            width: 1,
            column: 'first_crew',
            title: t('stat_trends.trait_columns.first_crew'),
            reverse: true,
            customCompare: (a: TraitStats, b: TraitStats) => {
                return a.first_crew.date_added.getTime() - b.first_crew.date_added.getTime() || a.first_crew.name.localeCompare(b.first_crew.name)
            }
        },
        {
            width: 1,
            column: 'launch_crew',
            title: t('stat_trends.trait_columns.inaugural_crew'),
            reverse: true,
            customCompare: (a: TraitStats, b: TraitStats) => {
                if (a.launch_crew == b.launch_crew) return 0;
                else if (!a.launch_crew) return 1;
                else if (!b.launch_crew) return -1;
                return a.launch_crew.date_added.getTime() - b.launch_crew.date_added.getTime() || a.launch_crew.name.localeCompare(b.launch_crew.name)
            }
        },
        {
            width: 1,
            column: 'latest_crew',
            title: t('stat_trends.trait_columns.latest_crew'),
            reverse: true,
            customCompare: (a: TraitStats, b: TraitStats) => {
                return a.latest_crew.date_added.getTime() - b.latest_crew.date_added.getTime() || a.latest_crew.name.localeCompare(b.latest_crew.name)
            }
        },
        {
            width: 1,
            column: 'highest_datascore',
            reverse: true,
            title: t('stat_trends.trait_columns.highest_datascore'),
            customCompare: (a: TraitStats, b: TraitStats) => {
                return a.highest_datascore.ranks.scores.overall - b.highest_datascore.ranks.scores.overall
            }
        },
        { width: 1, column: 'total_crew', title: t('stat_trends.trait_columns.total_crew'), reverse: true },
    ] as ITableConfigRow[]

    if (showDive) {
        return <TraitDive
            onClose={() => setShowDive(undefined)}
            info={showDive}
            />
    }

    // if (!showHidden && !showVariantTraits) {
    //     tableConfig.splice(1, 1);
    // }
    return (
        <div style={{...flexCol, alignItems: 'stretch', justifyContent: 'flex-start', width: '100%', overflowX: 'auto' }}>
            <div style={flexRow}>
                <div style={{...flexCol, alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1em', margin: '1em 0'}}>
                    <Checkbox label={t('stat_trends.traits.only_show_potential_collections')}
                        checked={onlyPotential}
                        onChange={(e, { checked }) => setOnlyPotential(!!checked) }
                    />
                    <Checkbox label={t('stat_trends.traits.show_visible')}
                        checked={showVisible}
                        onChange={(e, { checked }) => setShowVisible(!!checked) }
                    />
                    <Checkbox label={t('stat_trends.traits.hide_only_one')}
                        checked={hideOne}
                        onChange={(e, { checked }) => setHideOne(!!checked) }
                    />
                    <Checkbox label={t('stat_trends.traits.exclude_launch')}
                        checked={excludeLaunch}
                        onChange={(e, { checked }) => setExcludeLaunch(!!checked) }
                    />
                    <Checkbox label={t('stat_trends.traits.show_hidden')}
                        checked={showHidden}
                        onChange={(e, { checked }) => setShowHidden(!!checked) }
                    />
                    <Checkbox label={t('stat_trends.traits.show_variant_traits')}
                        checked={showVariantTraits}
                        onChange={(e, { checked }) => setShowVariantTraits(!!checked) }
                    />
                    <Checkbox label={t('stat_trends.traits.show_series')}
                        checked={showSeries}
                        onChange={(e, { checked }) => setShowSeries(!!checked) }
                    />
                </div>
            </div>
            <SearchableTable
                data={stats}
                renderTableRow={(item, idx) => renderTableRow(item, idx)}
                config={tableConfig}
                filterRow={filterRow}
                />
        </div>)

    function filterRow(row: any, filter: any, filterType?: string) {
        if (filter) {
            return omniSearchFilter(row, filter, filterType, ['trait', 'collection', {
                field: 'first_crew',
                customMatch: (a: CrewMember, text) => {
                    return a.name.toLowerCase().includes(text.toLowerCase());
                }
            }])
        }
        return true;
    }

    function renderTableRow(item: TraitStats, idx: any) {
        const fcrew = item.first_crew;
        const lcrew = item.latest_crew;

        return <Table.Row key={`traitSetIdx_${idx}`}>
                <Table.Cell>
                    <div style={{... flexCol, gap: '0.5em', cursor: 'zoom-in', alignItems: 'flex-start'}} onClick={() => setShowDive(item)}>
                        <div style={{...flexRow, justifyContent: 'flex-start', gap: '1em'}}>
                            {!!item.icon && <img src={item.icon} style={{height: '32px'}} />}
                            <span>{item.trait}</span>
                        </div>
                        {!!item.short_names &&
                            <div style={{...flexRow, justifyContent: 'flex-start', gap: '0.25em', fontStyle: 'italic', color: 'lightgreen'}}>
                                ({item.short_names.sort().join(", ")})
                            </div>
                        }
                        {CONFIG.SERIES.includes(item.trait_raw) &&
                        <div style={{...flexRow, justifyContent: 'flex-start', gap: '0.25em', fontStyle: 'italic', color: 'lightgreen'}}>
                            {t(`series.${item.trait_raw}`)}
                        </div>
                        }
                        {CONFIG.SERIES.includes(item.trait_raw) &&
                            <img
                                style={{ height: '2em'}}
                                src={`${process.env.GATSBY_DATACORE_URL}/media/series/${item.trait_raw}.png`} />
                        }
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {item.hidden && t('global.yes')}
                    {!item.hidden && t('global.no')}
                </Table.Cell>
                <Table.Cell>
                    <div>
                        {!!item.grade && tfmt('stat_trends.traits.potential_collection_score_n', {
                            n: <div style={{color: gradeToColor(item.grade / 10)}}>
                                {item.grade}
                            </div>
                        })}
                        {!item.grade && <span>{item.collection}</span>}
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {/* {moment(item.first_appearance).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM D, y")} */}
                    {approxDate(item.first_appearance, t)}
                </Table.Cell>
                <Table.Cell>
                    <div style={{...flexCol, textAlign: 'center', gap: '0.25em'}}>
                        <AvatarView
                            targetGroup="stat_trends_crew"
                            mode='crew'
                            item={fcrew}
                            size={48}
                            />
                        {fcrew.name}
                        <i>{fcrew.preview ? t('global.pending_release') : fcrew.date_added.toLocaleDateString()}</i>
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {!!item.launch_crew && <div style={{...flexCol, textAlign: 'center', gap: '0.25em'}}>
                        <AvatarView
                            targetGroup="stat_trends_crew"
                            mode='crew'
                            item={item.launch_crew}
                            size={48}
                            />
                        <i>{item.launch_crew.preview ? t('global.pending_release') : item.launch_crew.date_added.toLocaleDateString()}</i>
                    </div>}
                </Table.Cell>
                <Table.Cell>
                    <div style={{...flexCol, textAlign: 'center', gap: '0.25em'}}>
                        <AvatarView
                            targetGroup="stat_trends_crew"
                            mode='crew'
                            item={lcrew}
                            size={48}
                            />
                        {lcrew.name}
                        <i>{lcrew.preview ? t('global.pending_release') : lcrew.date_added.toLocaleDateString()}</i>
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <div style={{...flexCol, textAlign: 'center', gap: '0.25em'}}>
                        <AvatarView
                            targetGroup="stat_trends_crew"
                            mode='crew'
                            item={item.highest_datascore}
                            size={48}
                            />
                        <i>{item.highest_datascore.name}</i>
                        <div style={{maxHeight: '4em'}}>
                            {renderDataScoreColumn(item.highest_datascore)}
                        </div>
                    </div>
                </Table.Cell>
                <Table.Cell style={{textAlign: 'center'}}>
                    {item.total_crew.toLocaleString()}
                    {!!item.retro && <>
                        <br />
                        <i>({t('stat_trends.traits.retroactively_added_to_n_crew', { n: item.retro.toLocaleString() })})</i>
                    </>}
                </Table.Cell>
        </Table.Row>
    }



}