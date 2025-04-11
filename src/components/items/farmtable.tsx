import React from "react";
import { Table, Pagination, Dropdown } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { EquipmentItemSource, EquipmentItem } from "../../model/equipment";
import { useStateWithStorage } from "../../utils/storage";
import { GatherItemFilter } from "../gather/gather_planner";
import { ItemTarget } from "../hovering/itemhoverstat";
import ItemDisplay from "../itemdisplay";
import ItemSources from "../itemsources";
import { ItemDropDown } from "./itemdropdown";

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
    textStyle?: React.CSSProperties;
}

export const FarmTable = (props: FarmTableProps) => {
    // const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const { sources, pageId } = props;
    const hover_target = props.hoverTarget ?? 'farm_item_target';

    let allItems = [ ...new Set(sources.map(m => m.items).flat())];
    allItems = allItems.filter((f, i) => allItems.findIndex(f2 => f2.symbol === f.symbol) === i);
    const globalContext = React.useContext(GlobalContext);
    const { playerData } = globalContext.player;
    const { t } = globalContext.localized;

    const [itemFilter, setItemFilter] = useStateWithStorage(`${pageId}/farm/item_filter`, '', { rememberForever: true });

    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useStateWithStorage(`${pageId}/farm/items_per_page`, 10, { rememberForever: true });

    const [sortColumn, setSortColumn] = useStateWithStorage<'source' | 'demands'>(`${pageId}/farm/sort_column`, 'demands', { rememberForever: true });
    const [sortDirection, setSortDirection] = useStateWithStorage<'ascending' | 'descending'>(`${pageId}/farm/sort_direction`, 'descending', { rememberForever: true });

    const [sortedSources, setSortedSources] = React.useState(sources);

    const [distinctItems, setDistinctItems] = React.useState<EquipmentItem[]>([]);
    const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

    const searchText = selectedItems.join(',')

    React.useEffect(() => {
        const distinctItems = [ ... new Set(sources.map(m => m.items).flat().map(m => m.symbol)) ]
            .map(m => globalContext.core.items.find(f => f.symbol === m)!)
            .sort((a, b) => {
                let r = a.name.localeCompare(b.name);
                if (!r) r = a.rarity - b.rarity;
                return r;
            });

        const newList = (JSON.parse(JSON.stringify(sources)) as FarmSources[]).filter(item => {
            if (item.source.type === 4) return false;

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

            let phrase = searchText.toLowerCase().trim();
            if (!phrase || item.source.name.toLowerCase().includes(phrase)) return true;

            let phrases = phrase.split(",").map(p => p.trim());
            for (let phrase of phrases) {
                let test = item.items.filter(fitem => {
                    if (fitem.symbol.toLowerCase().includes(phrase)) return true;
                    if (fitem.name.toLowerCase().includes(phrase)) return true;
                    if (fitem.flavor.toLowerCase().includes(phrase)) return true;
                    if (fitem.name_english?.toLowerCase().includes(phrase)) return true;

                    return false;
                });
                if (!test.length) return false;
            }

            return true;
        });

        const mul = sortDirection === 'descending' ? -1 : 1;

        if (sortColumn === 'demands') {
            newList.sort((a, b) => {
                let acount = a.items.reduce((p, n) => p + n.needed!, 0);
                let bcount = b.items.reduce((p, n) => p + n.needed!, 0);
                return mul *  (acount - bcount);
            })
        }
        else if (sortColumn === 'source') {
            newList.sort((a, b) => {
                return mul * a.source.name.localeCompare(b.source.name);
            });
        }

        setDistinctItems(distinctItems);
        setSortedSources(newList);
    }, [sources, sortColumn, sortDirection, searchText, itemFilter]);

    const columnClick = (name: 'source' | 'demands') => {
        if (name === sortColumn) {
            setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
        }
        else {
            setSortColumn(name);
        }
    }

    const pagingOptions = [
        { key: "0", value: 10, text: "10" },
        { key: "1", value: 25, text: "25" },
        { key: "2", value: 50, text: "50" },
        { key: "3", value: 100, text: "100" },
    ];

    const totalPages = Math.ceil(sortedSources.length / itemsPerPage);

    let phrase = searchText.toLowerCase().trim();
    let phrases = phrase ? phrase.split(",").map(p => p.trim()) : [];

    if (currentPage > totalPages) {
        if (totalPages === 0) {
            if (currentPage !== 1) {
                setCurrentPage(1);
            }
        }
        else {
            setCurrentPage(totalPages);
        }
    }

    if (!playerData) return <></>

    return (<div style={{ marginTop: "1em"}}>
        <h2>{t('items.item_sources')}</h2>
        <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                margin: '0.25em',
                gap: '0.5em'
            }}>

            {t('global.search')}{": "}
            <ItemDropDown style={{width: '24em'}} items={distinctItems}
                icons={true}
                selectedSymbols={selectedItems}
                setSelectedSymbols={setSelectedItems}
                />

            <GatherItemFilter itemFilter={itemFilter} setItemFilter={setItemFilter} />
        </div>
        <Table striped sortable style={{overflowX: 'auto'}}>
            <Table.Header>
                {renderRowHeaders()}
            </Table.Header>
            <Table.Body>
                {sortedSources
                    .slice((currentPage - 1) * itemsPerPage, ((currentPage - 1) * itemsPerPage) + itemsPerPage)
                    .map((source) => renderTableRow(source, phrases))}
            </Table.Body>
            <Table.Footer>
                <Table.Row>
                    <Table.HeaderCell colSpan="8">
                        <Pagination
                            totalPages={totalPages}
                            activePage={currentPage}
                            onPageChange={(event, { activePage }) =>
                                setCurrentPage(activePage as number)
                            }
                        />
                        <span style={{ paddingLeft: "2em" }}>
                            {t("global.rows_per_page")}:{" "}
                            <Dropdown
                                inline
                                options={pagingOptions}
                                value={itemsPerPage}
                                onChange={(event, { value }) =>
                                    setItemsPerPage(value as number)
                                }
                            />
                        </span>
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Footer>

        </Table>
    </div>)

    function renderRowHeaders() {

        return <Table.Row>
            <Table.HeaderCell sorted={sortColumn === 'source' ? sortDirection : undefined} onClick={() => columnClick('source')}>
                {t('shuttle_helper.missions.columns.mission')}
            </Table.HeaderCell>
            <Table.HeaderCell sorted={sortColumn === 'demands' ? sortDirection : undefined} onClick={() => columnClick('demands')}>
                {t('demands.items')}
            </Table.HeaderCell>
        </Table.Row>
    }

    function renderTableRow(row: FarmSources, phrases: string[]) {

        return <Table.Row key={row.source.name + '_row_' + `${row.source.mastery}`}>
            <Table.Cell width={4}>
                <h3>{row.source.name}</h3>
                <div style={{ fontSize: '1em' }}>
                    <i>{t(`mission_type.type_${row.source.type}`)}</i>
                </div>
                <div>
                    <ItemSources farmFormat={true} item_sources={[row.source]} />
                </div>
            </Table.Cell>
            <Table.Cell>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1em',
                    flexWrap: 'wrap'
                }}>
                    {row.items.map((item, idx) => {
                        if (!item) return <div key={`empty_${idx}_event_demand_${row.source.name}_${row.source.mastery}`}></div>
                        const itemHi = phrases.some(p => item!.name.toLowerCase().includes(p));
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
                                textAlign: 'center'}}>

                                <span
                                    onClick={() => {
                                        if (!selectedItems.includes(item.symbol)) {
                                            setSelectedItems([...selectedItems, item.symbol ]);
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
                                <span
                                    style={{
                                        fontStyle: 'italic',
                                        ... props.textStyle,
                                        color: (item.needed ?? 0) > (item.quantity ?? 0) ? 'orange' : undefined
                                    }}
                                    >
                                        {t('items.n_needed', { n: item.needed?.toLocaleString() ?? '' })}
                                </span>
                                {!!props.showOwned && <span
                                    style={{
                                        fontStyle: 'italic',
                                        ... props.textStyle,
                                        color: (item.needed ?? 0) > (item.quantity ?? 0) ? undefined : 'lightgreen'
                                    }}
                                    >
                                        {t('items.n_owned', { n: item.quantity?.toLocaleString() ?? '' })}
                                </span>}
                                {!!props.showFarmable && !!item.needed && typeof item.quantity === 'number' && item.needed > item.quantity && <span
                                    style={{
                                        fontStyle: 'italic',
                                        ... props.textStyle,
                                        color: 'lightblue'
                                    }}
                                    >
                                        {t('items.n_farmable', { n: (item.needed - item.quantity)?.toLocaleString() ?? '' })}
                                </span>}
                            </div>
                        </div>
                    })}
                </div>

            </Table.Cell>
        </Table.Row>

    }

}