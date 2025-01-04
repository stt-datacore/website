import React from "react"
import { GlobalContext } from "../../../context/globalcontext"
import { ITableConfigRow, SearchableTable } from "../../searchabletable";
import { EpochDiff } from "../model";
import { Checkbox, Table } from "semantic-ui-react";
import { approxDate, dateToEpoch, formatElapsedDays, GameEpoch, OptionsPanelFlexColumn, OptionsPanelFlexRow } from "../utils";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';
import moment from "moment";
import { AvatarView } from "../../item_presenters/avatarview";
import { CrewMember } from "../../../model/crew";
import { omniSearchFilter } from "../../../utils/omnisearch";
import { useStateWithStorage } from "../../../utils/storage";
import { crewCopy, getVariantTraits } from "../../../utils/crewutils";
import { getIconPath } from "../../../utils/assets";
import { calculateCrewDemands, calculateRosterDemands } from "../../../utils/equipment";
import { EquipmentItem, ICrewDemands, IDemand } from "../../../model/equipment";
import { ItemHoverStat } from "../../hovering/itemhoverstat";
import CONFIG from "../../CONFIG";


interface ItemTraitInfo {
    trait: string,
    symbols: string[],
    exclusive?: boolean
};

interface ItemStats {
    name: string,
    type: string,
    symbol: string,
    data: EquipmentItem,
    latest_usage?: Date
    first_crew?: CrewMember,
    latest_crew?: CrewMember,
    demand_percent?: number,
    demand_count?: number,
    popular_trait?: ItemTraitInfo,
    extra_traits?: ItemTraitInfo[],
    more_traits?: number;
}

export interface ItemStatsTableProps {
    refresh: boolean;
    setRefresh: (value: boolean) => void;
}

export const ItemStatsTable = (props: ItemStatsTableProps) => {
    const globalContext = React.useContext(GlobalContext);
    const { t, TRAIT_NAMES, COLLECTIONS, ITEM_ARCHETYPES } = globalContext.localized;
    const { crew, items } = globalContext.core;
    const { refresh, setRefresh } = props;
    const [stats, setStats] = React.useState<ItemStats[]>([]);
    const flexRow = OptionsPanelFlexRow;
    const flexCol = OptionsPanelFlexColumn;
    const [expanded, setExpanded] = React.useState('');

    React.useEffect(() => {
        if (!crew?.length || !items?.length || stats.length) return;
        setTimeout(() => calculateStats());
    }, [crew, items, stats]);

    React.useEffect(() => {
        if (refresh) {
            setTimeout(() => {
                setStats([]);
            });
            setRefresh(false);
        }
    }, [refresh]);

    const tableConfig = [
        { width: 3, column: 'name', title: t('stat_trends.items.name') },
        { width: 1, column: 'type', title: t('items.columns.item_type') },
        { width: 1, column: 'demand_percent',
            title: <div style={{textWrap: 'wrap'}}>{t('stat_trends.items.percentage')}</div>
        },
        { width: 1, column: 'demand_count',
            title: <div style={{textWrap: 'wrap'}}>{t('stat_trends.items.demanded')}</div>
        },
        {
            width: 3,
            column: 'popular_trait',
            title: t('stat_trends.items.popular_trait'),
            pseudocolumns: ['popular_trait', 'popular_trait.symbols.length', 'popular_trait.exclusive'],
            translatePseudocolumn: (column) => {
                if (column === 'popular_trait') return t('global.name');
                if (column === 'popular_trait.symbols.length') return t('base.crew');
                if (column === 'popular_trait.exclusive') return t('global.exclusive');
                return t('global.default');
            },
            customCompare: (a: ItemStats, b: ItemStats, conf) => {
                if (!a.popular_trait && !b.popular_trait) return 0;
                else if (!a.popular_trait) return -1;
                else if (!b.popular_trait) return 1;
                let r = 0;
                if (conf.field === 'popular_trait') {
                    r = TRAIT_NAMES[a.popular_trait.trait].localeCompare(TRAIT_NAMES[b.popular_trait.trait]);
                }
                if (conf.field === 'popular_trait.symbols.length') {
                    r = a.popular_trait.symbols.length - b.popular_trait.symbols.length;
                }
                if (conf.field === 'popular_trait.exclusive') {
                    r = (a.popular_trait?.exclusive ? 1 : 0) - (b.popular_trait?.exclusive ? 1 : 0);
                    if (!r) r = getExclusiveRarity(a) - getExclusiveRarity(b);
                }
                if (!r) {
                    if (!r) r = a.popular_trait.symbols.length - b.popular_trait.symbols.length;
                    if (!r) r = (a.popular_trait?.exclusive ? 1 : 0) - (b.popular_trait?.exclusive ? 1 : 0);
                    if (!r) r = getExclusiveRarity(a) - getExclusiveRarity(b);
                    if (!r) r = TRAIT_NAMES[a.popular_trait.trait].localeCompare(TRAIT_NAMES[b.popular_trait.trait]);
                }
                return r;
            }
        },
        {
            width: 2,
            column: 'latest_usage',
            title: t('stat_trends.items.latest_usage'),
            customCompare: (a: ItemStats, b: ItemStats) => {
                if (!a.latest_usage && !b.latest_usage) return 0;
                else if (!a.latest_usage) return -1;
                else if (!b.latest_usage) return 1;
                return a.latest_usage.getTime() - b.latest_usage.getTime();
            }
        },
        {
            width: 2,
            column: 'first_crew',
            title: t('stat_trends.trait_columns.first_crew'),
            customCompare: (a: ItemStats, b: ItemStats) => {
                if (!a.first_crew && !b.first_crew) return 0;
                else if (!a.first_crew) return -1;
                else if (!b.first_crew) return 1;
                return a.first_crew.date_added.getTime() - b.first_crew.date_added.getTime() || a.first_crew.name.localeCompare(b.first_crew.name)
            }
        },
        {
            width: 2,
            column: 'latest_crew',
            title: t('stat_trends.trait_columns.latest_crew'),
            customCompare: (a: ItemStats, b: ItemStats) => {
                if (!a.latest_crew && !b.latest_crew) return 0;
                else if (!a.latest_crew) return -1;
                else if (!b.latest_crew) return 1;
                return a.latest_crew.date_added.getTime() - b.latest_crew.date_added.getTime() || a.latest_crew.name.localeCompare(b.latest_crew.name)
            }
        },
    ] as ITableConfigRow[]

    if (!stats.length) return <div style={{...flexCol, width: '100%', height: '20vh'}}>{globalContext.core.spin(t('spinners.demands'))}</div>;

    return (
        <div style={{...flexCol, alignItems: 'stretch', justifyContent: 'flex-start', width: '100%', overflowX: 'auto' }}>
            <div style={flexRow}>
                <div style={{...flexCol, alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1em', margin: '1em 0'}}>
                </div>
            </div>
            <SearchableTable
                data={stats}
                renderTableRow={(item, idx) => renderTableRow(item, idx)}
                config={tableConfig}
                filterRow={filterRow}
                />
            <ItemHoverStat targetGroup="stat_trends_items" />
        </div>)

    function filterRow(row: any, filter: any, filterType?: string) {
        if (filter) {
            return omniSearchFilter(row, filter, filterType, ['data.name', 'collection', {
                field: 'first_crew',
                customMatch: (a: CrewMember, text) => {
                    return a.name.toLowerCase().includes(text.toLowerCase());
                }
            }])
        }
        return true;
    }

    function renderTableRow(item: ItemStats, idx: any) {
        const fcrew = item.first_crew;
        const lcrew = item.latest_crew;

        return <Table.Row key={`traitSetIdx_${idx}`}>
                <Table.Cell>
                    <div style={{...flexRow, justifyContent: 'flex-start', gap: '1em'}}>
                        <AvatarView
                            mode='item'
                            item={item}
                            partialItem={true}
                            targetGroup="stat_trends_items"
                            size={48}
                            />
                        <span>{item.name}</span>
                    </div>
                </Table.Cell>
                <Table.Cell>
                    {item.type}
                </Table.Cell>
                <Table.Cell>
                    {!!item.demand_percent && <>{item.demand_percent.toLocaleString()}%</> || 'N/A'}
                </Table.Cell>
                <Table.Cell>
                    {!!item.demand_count && <>{item.demand_count.toLocaleString()}</> || 'N/A'}
                </Table.Cell>
                <Table.Cell>
                    {drawTrait(item)}
                </Table.Cell>
                <Table.Cell>
                    {/* {moment(item.first_appearance).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM D, y")} */}
                    {!!item.latest_usage && <>{approxDate(item.latest_usage, t)}</> || 'N/A'}
                </Table.Cell>
                <Table.Cell>
                    {!!fcrew && <div style={{...flexCol, textAlign: 'center', gap: '1em'}}>
                        <AvatarView
                            targetGroup="stat_trends_crew"
                            mode='crew'
                            item={fcrew}
                            size={48}
                            />
                        <i>{fcrew.name}</i>
                    </div> || 'N/A'}
                </Table.Cell>
                <Table.Cell>
                    {!!lcrew && <div style={{...flexCol, textAlign: 'center', gap: '1em'}}>
                        <AvatarView
                            targetGroup="stat_trends_crew"
                            mode='crew'
                            item={lcrew}
                            size={48}
                            />
                        <i>{lcrew.name}</i>
                    </div> || 'N/A'}
                </Table.Cell>
            </Table.Row>
    }

    function getExclusiveRarity(item: ItemStats) {
        return !item.extra_traits?.length && item.popular_trait?.exclusive ? 5 : item.extra_traits?.every(e => e.exclusive) && item.popular_trait?.exclusive  ? 4 : 3
    }

    function drawTrait(item: ItemStats) {
        if (!item.popular_trait) return <></>;
        const rarity = getExclusiveRarity(item);
        return (
            <div>
                <Table
                    striped
                    style={{
                        textAlign: 'left',
                        cursor: expanded === item.symbol ? 'zoom-out' : (item.extra_traits!.length || item.more_traits ? 'zoom-in' : undefined)}}
                        onClick={() => {
                            if (expanded === item.symbol) {
                                setExpanded('');
                            }
                            else if (item.extra_traits!.length || item.more_traits) {
                                setExpanded(item.symbol);
                            }
                        }}
                    >
                    {drawTraitRow(item.popular_trait!, 0, rarity)}
                    {expanded === item.symbol &&
                        item.extra_traits!.map((trait, idx) => drawTraitRow(trait, idx + 1, rarity))
                    }
                    {expanded === item.symbol && !!item.more_traits &&
                        <Table.Row>
                            <Table.Cell colspan={2}>
                                {t('global.and_n_more_ellipses', { n: item.more_traits })}
                            </Table.Cell>
                        </Table.Row>
                    }

                </Table>
            </div>
        )
    }

    function drawTraitRow(trait: ItemTraitInfo, idx: number, very_exclusive?: number) {
        return (<Table.Row key={`${trait.trait}_${idx}_stat_trends_items`}>
            <Table.Cell style={{width: '50%'}}>
                {TRAIT_NAMES[trait.trait]}
                {!!trait.exclusive &&
                <div>
                    <sub>
                        <b style={{color: very_exclusive ? CONFIG.RARITIES[very_exclusive].color : undefined }}>{t('global.exclusive')}</b>
                    </sub>
                </div>
                }
            </Table.Cell>
            <Table.Cell style={{textAlign: 'right'}}>
                {trait.symbols.length.toLocaleString()} {t('base.crew')}
            </Table.Cell>
        </Table.Row>)
    }

    function dateSortCrew(crew: CrewMember[]) {
        crew.sort((a, b) => a.date_added.getTime() - b.date_added.getTime() || a.archetype_id - b.archetype_id || (a.name_english || a.name).localeCompare(b.name_english ?? b.name))
    }

    function calculateStats() {
        const work = crewCopy(crew);

        dateSortCrew(work);
        const demands = [] as ICrewDemands[];
        const newstats = [] as ItemStats[];
        const counts = {} as {[key:string]: number};
        const itemcrew = {} as {[key:string]: string[] };
        const itemhash = {} as {[key:string]: EquipmentItem };
        const itemtraits = {} as { [key: string]: ItemTraitInfo[] }

        for (let crew of work) {
            const demand = calculateCrewDemands(crew, items);
            demands.push(demand);
        }

        for (let demand of demands) {
            for (let item of demand.demands) {
                if (item.crewSymbols.length) {
                    const crewSym = item.crewSymbols[0]

                    if (!itemcrew[item.symbol]?.includes(crewSym)) {
                        itemcrew[item.symbol] ??= [];
                        itemcrew[item.symbol].push(crewSym);
                        counts[item.symbol] ??= 0;
                        counts[item.symbol] += item.count;
                        itemhash[item.symbol] = item.equipment || items.find(f => f.symbol === item.symbol)!;
                    }
                }
            }
        }

        function createStat(symbol: string) {
            let crew = itemcrew[symbol].map(sym => work.find(fc => fc.symbol === sym)!);
            let item = itemhash[symbol];
            if (!item || !crew?.length) return null;
            itemtraits[symbol] ??= [];
            for (let c of crew) {
                for (let t of c.traits) {
                    let tx = itemtraits[symbol].find(f => f.trait === t)
                    if (!tx) {
                        itemtraits[symbol].push({
                            trait: t,
                            symbols: [c.symbol]
                        });
                    }
                    else {
                        tx.symbols.push(c.symbol)
                    }
                }
            }
            dateSortCrew(crew);
            itemtraits[symbol].sort((a, b) => b.symbols.length - a.symbols.length);
            let allcrew = [... new Set(itemtraits[symbol].map(m => m.symbols).flat()) ];
            let common = traitsInCommon(allcrew);
            for (let traitset of itemtraits[symbol]) {
                if (common.includes(traitset.trait)) {
                    traitset.exclusive = true;
                }
            }

            let pct = Number(((crew.length / work.length) * 100).toFixed(2));
            let etraits = itemtraits[symbol]?.slice(1)?.filter(f => f.symbols.length > 9 || f.exclusive).slice(0, 10);

            const newitem: ItemStats = {
                name: item.name,
                type: CONFIG.REWARDS_ITEM_TYPE[item.type],
                data: item,
                symbol: item.symbol,
                latest_usage: crew[crew.length - 1].date_added,
                first_crew: crew[0],
                latest_crew: crew[crew.length - 1],
                demand_percent: pct,
                demand_count: crew.length,
                popular_trait: itemtraits[symbol]?.length ? itemtraits[symbol][0] : undefined,
                extra_traits: etraits,
                more_traits: etraits ? itemtraits[symbol].length - etraits.length : undefined
            }
            return newitem;
        }

        Object.entries(counts).forEach(([symbol, count]) => {
            const stat = createStat(symbol);
            if (!stat) return;
            newstats.push(stat);
        });

        let types = [...new Set(newstats.map(m => m.data.type))]
        const remaining = items.filter(f => !!f.recipe?.list?.length && !newstats.some(ns => ns.symbol === f.symbol) && types.includes(f.type));

        setStats(newstats);
    }

    function traitsInCommon(symbols: string[]) {
        let work = crew.filter(f => symbols.includes(f.symbol));
        if (!work.length) return [];
        const output = [] as string[];
        const ref = work[0].traits;
        ref.forEach((trait) => {
            if (work.every(e => e.traits.includes(trait))) output.push(trait)
        });
        return output;
    }


}