import React from "react";

import { Link } from "gatsby";

import { useStateWithStorage } from "../../utils/storage";

import { Button, Dropdown, DropdownItemProps, Icon, Input, Pagination, Rating, SemanticWIDTHS, Table } from "semantic-ui-react";

import { Gauntlet, GauntletFilterProps } from "../../model/gauntlets";
import { CompletionState, PlayerCrew } from "../../model/player";

import { comparePairs, getPlayerPairs, printPortalStatus } from "../../utils/crewutils";

import { formatPair } from "./paircard";

import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { CrewHoverStat, CrewTarget } from "../hovering/crewhoverstat";

type SortDirection = 'ascending' | 'descending' | undefined;

export type GauntletTableHighlightMode = 'normal' | 'live';

export interface GauntletTableProps {
    pageId: string;
    gauntlet: Gauntlet;
    data: PlayerCrew[];
    mode: GauntletTableHighlightMode;
    filter: GauntletFilterProps;
    textFilter: string;
    setTextFilter: (value: string) => void;
    rankByPair: string[];
    setRankByPair: (value: string[]) => void;
}

export const GauntletCrewTable = (props: GauntletTableProps) => {
    const { filter, pageId, gauntlet, data, mode, textFilter, setTextFilter, rankByPair, setRankByPair } = props;
    if (!data) return <></>;

    const targetGroup = `${pageId}_gauntletTable`;

    const [crew, setCrew] = React.useState<PlayerCrew[] | undefined>(undefined);

    const [activePageCrew, setActivePageCrew] = React.useState<PlayerCrew[] | undefined>(undefined);

    const [totalPages, setTotalPages] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [activePage, setActivePage] = React.useState(1);

    const [sortDirection, setSortDirection] = useStateWithStorage<SortDirection>(`${pageId}/sortDirection`, 'ascending');

    const [sortKey, setSortKey] = useStateWithStorage<string | undefined>(`${pageId}/sortKey`, undefined);

    const pageStartIdx = (activePage - 1) * itemsPerPage;

    const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
        console.log("imageClick");
        // if (matchMedia('(hover: hover)').matches) {
        // 	window.location.href = "/crew/" + data.symbol;
        // }
    }


    const columnClick = (key: string) => {

        setRankByPair([]);        

        if (sortDirection === undefined) {
            if (key === 'name') {
                setSortDirection('ascending');
            }
            else {
                setSortDirection('descending');
            }
        }
        else if (key === sortKey) {
            if (sortDirection === 'descending') {
                setSortDirection('ascending');
            }
            else {
                setSortDirection('descending');
            }
        }

        setSortKey(key);

    }

    const prettyTraits = gauntlet.prettyTraits;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const columns = [
        { title: "Rank", key: "index" },
        { title: "Crew", key: "name", width: 3 as SemanticWIDTHS },
        { title: "Rarity", key: "rarity" },
        { title: "Crit Chance", key: "crit" },
        { title: "1st Pair", key: "pair_1" },
        { title: "2nd Pair", key: "pair_2" },
        { title: "3rd Pair", key: "pair_3" },
        // { title: "Owned", key: "have" },
        { title: "In Portal", key: "in_portal" },
    ]
    const pageSizes = [1, 5, 10, 20, 50, 100].map(size => {
        return {
            key: `pageSize_${size}`,
            value: size,
            text: `${size}`
        } as DropdownItemProps;
    });
    
    React.useEffect(() => {
        setCrew(data);        
    }, [data]);

    React.useEffect(() => {
        if (!crew) return;

        let pages = Math.ceil(crew.length / itemsPerPage);
        if (totalPages !== pages) {
            setTotalPages(pages);
            if (activePage > pages) {
                setActivePage(pages);
                return;
            }
        }
        
        setActivePageCrew(crew.slice(pageStartIdx, pageStartIdx + itemsPerPage));
    }, [crew, itemsPerPage, activePage, totalPages]);

    React.useEffect(() => {
        const prettyTraits = gauntlet?.prettyTraits;

        var newarr = JSON.parse(JSON.stringify(data)) as PlayerCrew[];

        const dir = sortDirection === 'descending' ? -1 : 1;
        let key = sortKey;

        if (key === 'index' && gauntlet.origRanks) {
            newarr = newarr.sort((a, b) => {
                if (gauntlet.origRanks) {
                    if (a.symbol in gauntlet.origRanks && b.symbol in gauntlet.origRanks) {
                        return dir * (gauntlet.origRanks[a.symbol] - gauntlet.origRanks[b.symbol]);
                    }
                }

                return 0;
            })
        }
        else if (key === 'name') {
            newarr = newarr.sort((a, b) => dir * a.name.localeCompare(b.name));
        }
        else if (key === 'rarity') {
            newarr = newarr.sort((a, b) => {
                let r = a.max_rarity - b.max_rarity;
                if (r === 0 && "rarity" in a && "rarity" in b) {
                    r = (a.rarity ?? 0) - (b.rarity ?? 0);
                }
                if (!r) {
                    if (gauntlet.origRanks) {
                        if (a.symbol in gauntlet.origRanks && b.symbol in gauntlet.origRanks) {
                            return (gauntlet.origRanks[a.symbol] - gauntlet.origRanks[b.symbol]);
                        }
                    }
                }
                return dir * r;
            });
        }
        else if (key === 'crit') {
            newarr = newarr.sort((a, b) => {
                let atr = prettyTraits?.filter(t => a.traits_named.includes(t))?.length ?? 0;
                let btr = prettyTraits?.filter(t => b.traits_named.includes(t))?.length ?? 0;
                let answer = atr - btr;
                if (!answer) {
                    if (gauntlet.origRanks) {
                        if (a.symbol in gauntlet.origRanks && b.symbol in gauntlet.origRanks) {
                            return (gauntlet.origRanks[a.symbol] - gauntlet.origRanks[b.symbol]);
                        }
                    }
                }
                return dir * answer;
            });
        }
        else if (key?.startsWith("pair_")) {
            let pairIdx = Number.parseInt(key.slice(5)) - 1;
            newarr = newarr.sort((a, b) => {
                let apairs = getPlayerPairs(a);
                let bpairs = getPlayerPairs(b);

                if (apairs && bpairs) {
                    let pa = [...apairs ?? []];
                    let pb = [...bpairs ?? []];
                    return dir * (-1 * comparePairs(pa[pairIdx], pb[pairIdx]));
                }
                else if (apairs) {
                    return dir * -1;
                }
                else if (bpairs) {
                    return dir * 1;
                }
                else {
                    return 0;
                }
            });
        }
        else if (key === 'have') {
            newarr = newarr.sort((a, b) => {
                let r = 0;
                if ("have" in a && "have" in b) {
                    if (a.have != b.have) {
                        if (a.have) r = 1;
                        else r = -1;
                    }
                }
                else if ("have" in a) {
                    if (a.have) r = 1;
                }
                else if ("have" in b) {
                    if (b.have) r = -1;
                }

                if (r === 0 && gauntlet.origRanks) {
                    if (a.symbol in gauntlet.origRanks && b.symbol in gauntlet.origRanks) {
                        return (gauntlet.origRanks[a.symbol] - gauntlet.origRanks[b.symbol]);
                    }
                }

                if (r === 0 && gauntlet.origRanks) {
                    if (a.symbol in gauntlet.origRanks && b.symbol in gauntlet.origRanks) {
                        return (gauntlet.origRanks[a.symbol] - gauntlet.origRanks[b.symbol]);
                    }
                }

                return r * dir;
            })
        }
        else if (key === 'in_portal') {
            newarr = newarr.sort((a, b) => {
                let r = (a.in_portal ? 1 : 0) - (b.in_portal ? 1 : 0);
                if (!r) {
                    if (gauntlet.origRanks) {
                        if (a.symbol in gauntlet.origRanks && b.symbol in gauntlet.origRanks) {
                            return (gauntlet.origRanks[a.symbol] - gauntlet.origRanks[b.symbol]);
                        }
                    }

                    return 0;
                }
                return dir * r;
            })
        }

        setCrew(newarr);
    }, [sortKey, sortDirection]);

    return (<div style={{ overflowX: "auto" }}>
        <Input
            style={{ width: isMobile ? '100%' : '50%' }}
            iconPosition="left"
            placeholder="Search..."
            value={textFilter}
            onChange={(e, { value }) => setTextFilter(value)}>
            <input />
            <Icon name='search' />
            <Button icon onClick={() => setTextFilter('')} >
                <Icon name='delete' />
            </Button>
        </Input>

        <Table sortable celled selectable striped collapsing unstackable compact="very">
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell colSpan={columns.length}>
                        <div style={{ margin: "1em 0", width: "100%" }}>
                            <Pagination fluid totalPages={totalPages} activePage={activePage} onPageChange={(e, data) => setActivePage(data.activePage as number)} />
                        </div>
                    </Table.HeaderCell>
                </Table.Row>
                <Table.Row>
                    {columns.map((col, hidx) =>
                        <Table.HeaderCell
                            width={col.width}
                            sorted={sortKey === col.key ? sortDirection : undefined}
                            onClick={(e) => columnClick(col.key)}
                            key={"k_" + hidx}>
                            {col.title}
                        </Table.HeaderCell>)}
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {activePageCrew?.map((row, idx: number) => {
                    const crew = row;
                    const pairs = crew.pairs ?? getPlayerPairs(crew);
                    const rank = gauntlet.origRanks ? gauntlet.origRanks[crew.symbol] : idx + pageStartIdx + 1;
                    const inMatch = !!gauntlet.contest_data?.selected_crew?.some((c) => c.archetype_symbol === crew.symbol);

                    return (crew &&
                        <Table.Row key={idx}
                            negative={crew.isOpponent}
                            positive={
                                (mode !== 'live' && (filter?.ownedStatus === 'maxall' || filter?.ownedStatus === 'ownedmax') && crew.immortal === CompletionState.DisplayAsImmortalOwned)
                                || (mode === 'live' && inMatch)
                            }
                        >
                            <Table.Cell>{rank}</Table.Cell>
                            <Table.Cell>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '60px auto',
                                        gridTemplateAreas: `'icon stats' 'icon description'`,
                                        gridGap: '1px'
                                    }}>
                                    <div style={{ gridArea: 'icon' }}

                                    >
                                        <CrewTarget targetGroup={targetGroup}
                                            inputItem={crew}
                                        >
                                            <img
                                                onClick={(e) => imageClick(e, crew)}
                                                width={48}
                                                src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                                            />
                                        </CrewTarget>
                                        {crew.immortal > 0 &&
                                            <div style={{
                                                marginTop: "-16px",
                                                color: "white",
                                                display: "flex",
                                                flexDirection: "row",
                                                justifyContent: "flex-end"
                                            }}>
                                                <i className="snowflake icon" />
                                            </div>}
                                    </div>
                                    <div style={{ gridArea: 'stats' }}>
                                        <span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}><Link to={`/crew/${crew.symbol}/`}>{crew.name}</Link></span>
                                    </div>
                                </div>
                            </Table.Cell>
                            <Table.Cell>
                                <Rating icon='star' rating={crew.rarity} maxRating={crew.max_rarity} size='large' disabled />
                            </Table.Cell>
                            <Table.Cell>
                                {((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5) + "%"}
                            </Table.Cell>
                            <Table.Cell width={2}>
                                {pairs && pairs.length >= 1 && formatPair(pairs[0])}
                            </Table.Cell>
                            <Table.Cell width={2}>
                                {pairs && pairs.length >= 2 && formatPair(pairs[1])}
                            </Table.Cell>
                            <Table.Cell width={2}>
                                {pairs && pairs.length >= 3 && formatPair(pairs[2])}
                            </Table.Cell>
                            {/* <Table.Cell width={2}>
                                {crew.have === true ? "Yes" : "No"}
                            </Table.Cell> */}
                            <Table.Cell width={2}>
                                <span title={printPortalStatus(crew, true, true, true)}>
                                    {printPortalStatus(crew, true, false)}
                                </span>
                            </Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
            <Table.Footer>
                <Table.Row>
                    <Table.HeaderCell colSpan={columns.length}>
                        <Pagination 
                             
                            totalPages={totalPages} 
                            activePage={activePage} 
                            onPageChange={(e, data) => setActivePage(data.activePage as number)} 
                            />                
                        <span style={{ paddingLeft: '2em' }}>
                            Items per page:{' '}
                            <Dropdown 
                            options={pageSizes} 
                            value={itemsPerPage}
                            inline
                            onChange={(e, { value }) => setItemsPerPage(value as number)}
                        />
                        </span>
                    </Table.HeaderCell>
                </Table.Row>
            </Table.Footer>
        </Table>
        <CrewHoverStat targetGroup={targetGroup} />
    </div>);
}


