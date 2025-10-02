import React from "react";
import { Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { EquipmentItem, EquipmentItemSource } from "../../model/equipment";
import { Filter } from "../../model/game-elements";
import { omniSearchFilter } from "../../utils/omnisearch";
import { useStateWithStorage } from "../../utils/storage";
import { IEventData } from "../eventplanner/model";
import { GatherItemFilter } from "../gather/gather_planner";
import { ItemTarget } from "../hovering/itemhoverstat";
import ItemDisplay from "../itemdisplay";
import ItemSources from "../itemsources";
import { printChrons, printIntel } from "../retrieval/context";
import { ITableConfigRow, SearchableTable } from "../searchabletable";
import { OptionsPanelFlexRow } from "../stats/utils";
import { ItemDropDown } from "./itemdropdown";
import { Quest } from "../../model/missions";

export interface FarmSources {
    source: EquipmentItemSource,
    items: EquipmentItem[]
}

export interface FarmTableProps {
    pageId: string;
    sources: FarmSources[];
    hoverTarget?: string;
    showOwned?: boolean;
    showFarmable?: boolean;
    excludedSourceTypes?: number[];
    textStyle?: React.CSSProperties;
    eventData?: IEventData;
    renderExpanded?: (row: FarmSources) => React.JSX.Element;
}

export const FarmTable = (props: FarmTableProps) => {
    // const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const { sources, pageId, renderExpanded, excludedSourceTypes, eventData } = props;
    const hover_target = props.hoverTarget ?? 'farm_item_target';

    let allItems = [...new Set(sources.map(m => m.items).flat())];
    allItems = allItems.filter((f, i) => allItems.findIndex(f2 => f2.symbol === f.symbol) === i);
    const globalContext = React.useContext(GlobalContext);
    const { episodes } = globalContext.core;
    const { playerData, ephemeral } = globalContext.player;
    const { t } = globalContext.localized;

    const [itemFilter, setItemFilter] = useStateWithStorage(`${pageId}/farm/item_filter`, '', { rememberForever: true });

    const [sortedSources, setSortedSources] = React.useState(sources);

    const [distinctItems, setDistinctItems] = React.useState<EquipmentItem[]>([]);
    const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

    const [expanded, setExpanded] = React.useState<FarmSources | undefined>(undefined);

    const { searchText, phrases } = React.useMemo(() => {
        const searchText = selectedItems.join(',')
        const phrase = searchText.toLowerCase().trim();
        const phrases = phrase ? phrase.split(",").map(p => p.trim()) : [];
        return { searchText, phrases };
    }, [selectedItems]);

    const expanding = !!renderExpanded;
    const flexRow = OptionsPanelFlexRow;

    const eps = React.useMemo(() => {
        let res = [] as React.JSX.Element[];
        let eps = {} as {[key:string]: string};

        if (episodes) {
            episodes.forEach(e => {
                let prefilter = e.quests.filter(f => f.challenges?.length || f.action === 'Enter Space Battle');
                let questidx = [] as { quest: Quest, index: number }[]

                questidx = prefilter.map((item, idx) => ({ quest: item, index: idx + 1}));

                if (e.symbol.startsWith("dispute_")) {
                    questidx[questidx.length - 1].index--;
                }

                questidx.forEach(({ quest: q, index: idx}) => {
                    let ep = (e.episode === -1 ? (e.episode_title || '') : `${e.episode}`).padStart(3, '0');
                    let idxs = `${idx}`.padStart(3, '0');
                    eps[q.symbol] = `${ep}_${idxs}`;
                });
            });
        }
        return eps;
    }, [episodes]);

    React.useEffect(() => {
        const distinctItems = [... new Set(sources.map(m => m.items).flat().map(m => m.symbol))]
            .map(m => globalContext.core.items.find(f => f.symbol === m)!)
            .sort((a, b) => {
                let r = a.name.localeCompare(b.name);
                if (!r) r = a.rarity - b.rarity;
                return r;
            });

        const newList = (structuredClone(sources) as FarmSources[]).filter(item => {
            //if (item.source.type === 4) return false;
            if (excludedSourceTypes?.includes(item.source.type)) return false;
            item.items = item.items.filter(fitem => {
                if (itemFilter === 'single_source_items') {
                    return (fitem.item_sources.length === 1);
                }
                else if (itemFilter === 'multi_source_items') {
                    return (fitem.item_sources.length > 1);
                }
                else if (itemFilter === 'needed' && fitem.quantity !== undefined && fitem.needed !== undefined) {
                    return fitem.quantity < fitem.needed;
                }
                return true;
            });
            if (itemFilter === 'single_source_mission') {
                if (!item.items.some(item => item.item_sources.length === 1)) return false;
            }
            else if (itemFilter === 'needed_mission') {
                if (!item.items.some(item => (item.needed ?? 0) > (item.quantity ?? 0))) return false;
            }

            if (!item.items.length) return false;

            if (phrases.length) {
                for (let phrase of phrases) {
                    let test = item.items.filter(fitem => {
                        if (fitem.symbol?.toLowerCase().includes(phrase)) return true;
                        if (fitem.name?.toLowerCase().includes(phrase)) return true;
                        if (fitem.flavor?.toLowerCase().includes(phrase)) return true;
                        if (fitem.name_english?.toLowerCase().includes(phrase)) return true;

                        return false;
                    });
                    if (test.length) return true;
                }
                return false;
            }

            let mp_name = (getEpName(item.source.mission_symbol || ""));
            if (mp_name) {
                item.source.map_position = mp_name;
            }
            else {
                item.source.map_position = item.source.name;
            }

            return true;
        });

        setDistinctItems(distinctItems);
        setSortedSources(newList);
    }, [sources, searchText, itemFilter, eps]);

    if (!playerData) return <></>

    const tableConfig = [
        {
            width: 2, column: 'source.name', title: t('shuttle_helper.missions.columns.mission'),
            pseudocolumns: ['source.name', 'source.cost', 'source.type', 'source.map_position'],
            translatePseudocolumn: (field) => {
                field = field.replace('source.', '');
                return t(`global.${field}`) || field;
            },
            customCompare: (a: FarmSources, b: FarmSources, options) => {
                let r = 0;
                if (options.field === 'source.name') r = a.source.name.localeCompare(b.source.name) || (a.source.cost ?? 0) - (b.source.cost ?? 0) || (a.source.type - b.source.type);
                else if (options.field === 'source.cost') r = (a.source.cost ?? 0) - (b.source.cost ?? 0) || a.source.name.localeCompare(b.source.name) || (a.source.type - b.source.type);
                else if (options.field === 'source.type') r = (a.source.type - b.source.type) || a.source.name.localeCompare(b.source.name) || (a.source.cost ?? 0) - (b.source.cost ?? 0);
                else if (options.field === 'source.map_position') r = ((a.source.map_position || a.source.name).localeCompare(b.source.map_position || b.source.name)) || (a.source.mastery ?? 0) - (b.source.mastery ?? 0) || a.source.name.localeCompare(b.source.name) || (a.source.cost ?? 0) - (b.source.cost ?? 0);

                return r;
            }
        },
        {
            width: 9, column: 'source.items', title: t('demands.items'),
            customCompare: (a: FarmSources, b: FarmSources, options) => {
                let acount = a.items.reduce((p, n) => p + n.needed!, 0);
                let bcount = b.items.reduce((p, n) => p + n.needed!, 0);
                return acount - bcount;
            }
        }
    ] as ITableConfigRow[];

    return (<div style={{ marginTop: "1em" }}>
        <h2>{t('items.item_sources')}</h2>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            margin: '0.25em',
            marginBottom: '1em',
            gap: '0.5em'
        }}>

            {t('global.search')}{": "}
            <ItemDropDown style={{ width: '24em' }} items={distinctItems}
                icons={true}
                selectedSymbols={selectedItems}
                setSelectedSymbols={setSelectedItems}
            />

            <GatherItemFilter itemFilter={itemFilter} setItemFilter={setItemFilter} />
        </div>
        <SearchableTable
            showSortDropdown
            tableStyle={{ width: '100%' }}
            id={`${pageId}/farm_table`}
            data={sortedSources}
            config={tableConfig}
            renderTableRow={(row, idx, isActive) => renderTableRow(row, phrases)}
            filterRow={filterTableRow}
        />
    </div>)

    function filterTableRow(row: FarmSources, filter: Filter[], search?: string) {
        return omniSearchFilter(row, filter, search, [
            'source.name',
            {
                field: 'items',
                customMatch: (value: EquipmentItem[], text) => {
                    text = text.toLowerCase();
                    return value.some(eq => {
                        return eq.name.toLowerCase().includes(text) || eq.name_english?.toLowerCase().includes(text)
                    });
                }
            }
        ]);
    }

    function renderTableRow(row: FarmSources, phrases: string[]) {
        let cost = row.source.cost ?? 0;
        let intel = 0;
        let costColor = undefined as string | undefined;
        if (row.source.type === 2 && eventData?.activeContent?.content_type === 'skirmish') {
            intel = cost * 10;
        }
        if ([0, 2].includes(row.source.type) && ephemeral?.stimpack?.energy_discount) {
            cost = Math.ceil(cost - (cost * (ephemeral.stimpack.energy_discount / 100)));
            costColor = 'lightgreen';
        }
        return <Table.Row key={row.source.name + '_row_' + `${row.source.mastery}`}
            style={{
                cursor: expanding ? (expanded ? 'zoom-out' : 'zoom-in') : undefined
            }}
            onClick={() => {
                if (!expanding) return;
                if (expanded == row) {
                    setExpanded(undefined);
                }
                else {
                    setExpanded(row);
                }
            }}
        >
            <Table.Cell width={4}>
                <h3>{row.source.name}</h3>
                <div style={{ fontSize: '1em' }}>
                    <i>{t(`mission_type.type_${row.source.type}`)}</i>
                </div>
                <div>
                    <ItemSources farmFormat={true} item_sources={[row.source]} />
                </div>
                {[0, 2].includes(row.source.type) && !!row.source.cost &&
                    <div style={{ ...flexRow, gap: '0.5em', marginTop: '1em' }}>
                        {t('global.cost{{:}}')}<span style={{ color: costColor }}>{printChrons(cost)}</span>
                    </div>}
                {!!intel &&
                    <div style={{ ...flexRow, gap: '0.5em', marginTop: '1em' }}>
                        <span style={{ color: 'white' }}>{printIntel(intel, t, true)}</span>
                    </div>}
            </Table.Cell>
            <Table.Cell>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1em',
                    flexWrap: 'wrap'
                }}>
                    {row.items.map((item, idx) => {
                        if (!item) return <div key={`empty_${idx}_event_demand_${row.source.name}_${row.source.mastery}`}></div>
                        const itemHi = phrases.some(p => item!.name.toLowerCase().includes(p));
                        const srcRef = item.item_sources.find(src => src.name === row.source.name);
                        const chance = srcRef ? srcRef.chance_grade : 0;
                        return <div
                            key={item.symbol + "_event_demand_mapping" + idx.toString()}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5em',
                                textAlign: 'center',
                                width: '10em',
                                fontSize: '0.8em',
                            }}>
                            <ItemTarget inputItem={item} targetGroup={hover_target}>
                                <ItemDisplay
                                    src={`${process.env.GATSBY_ASSETS_URL}${item?.imageUrl}`}
                                    size={48}
                                    allItems={allItems}
                                    itemSymbol={item!.symbol}
                                    rarity={item!.rarity}
                                    maxRarity={item!.rarity}
                                />
                            </ItemTarget>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center'
                            }}>

                                <span
                                    onClick={() => {
                                        if (!selectedItems.includes(item.symbol)) {
                                            setSelectedItems([...selectedItems, item.symbol]);
                                        }
                                        else {
                                            setSelectedItems(selectedItems.filter(f => f !== item.symbol));
                                        }
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        color: itemHi ? 'lightgreen' : undefined,
                                        fontWeight: itemHi ? 'bold' : undefined
                                    }}
                                >{item!.rarity}* <u>{item!.name}</u></span>
                                {!!chance && <span>({t('shuttle_helper.missions.columns.success_chance{{:}}')}{chance}/5)</span>}
                                <span
                                    style={{
                                        fontStyle: 'italic',
                                        ...props.textStyle,
                                        color: (item.needed ?? 0) > (item.quantity ?? 0) ? 'orange' : undefined
                                    }}
                                >
                                    {t('items.n_needed', { n: item.needed?.toLocaleString() ?? '' })}
                                </span>
                                {!!props.showOwned && <span
                                    style={{
                                        fontStyle: 'italic',
                                        ...props.textStyle,
                                        color: (item.needed ?? 0) > (item.quantity ?? 0) ? undefined : 'lightgreen'
                                    }}
                                >
                                    {t('items.n_owned', { n: item.quantity?.toLocaleString() ?? '' })}
                                </span>}
                                {!!props.showFarmable && !!item.needed && typeof item.quantity === 'number' && item.needed > item.quantity && <span
                                    style={{
                                        fontStyle: 'italic',
                                        ...props.textStyle,
                                        color: 'lightblue'
                                    }}
                                >
                                    {t('items.n_farmable', { n: (item.needed - item.quantity)?.toLocaleString() ?? '' })}
                                </span>}
                            </div>
                        </div>
                    })}
                </div>
                {expanded === row && !!renderExpanded &&
                    <div>
                        {renderExpanded(row)}
                    </div>}
            </Table.Cell>
        </Table.Row>

    }

    function getEpName(e: string) {
        if (e in eps) {
            return eps[e];
        }
        return '';
    }

}