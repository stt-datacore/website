import React from "react";

import { Link } from "gatsby";

import { useStateWithStorage } from "../../utils/storage";

import { Button, Dropdown, DropdownItemProps, Icon, Input, Label, Pagination, Popup, Rating, SemanticWIDTHS, Table } from "semantic-ui-react";

import { Gauntlet, GauntletFilterProps } from "../../model/gauntlets";
import { CompletionState, PlayerCrew } from "../../model/player";

import { comparePairs, getPlayerPairs, isImmortal, prettyObtained, printPortalStatus, qbitsToSlots } from "../../utils/crewutils";

import { formatPair } from "./paircard";

import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { CrewHoverStat, CrewTarget } from "../hovering/crewhoverstat";
import { arrayIntersect } from "../../utils/misc";
import CONFIG from "../CONFIG";
import { GlobalContext } from "../../context/globalcontext";
import { GauntletBucketType, getCrewCrit, getCritColor, getElevatedBuckets, makeGauntletKey } from "../../utils/gauntlet";

type SortDirection = 'ascending' | 'descending' | undefined;

export type GauntletTableHighlightMode = 'normal' | 'live';

export interface GauntletTableProps {
    pageId: string;
    gauntlet: Gauntlet;
    gauntlets?: Gauntlet[]
    data: PlayerCrew[];
    mode: GauntletTableHighlightMode;
    filter: GauntletFilterProps;
    textFilter: string;
    setTextFilter: (value: string) => void;
    rankByPair: string[];
    setRankByPair: (value: string[]) => void;
}

export const GauntletCrewTable = (props: GauntletTableProps) => {
    const { filter, pageId, gauntlet, gauntlets, data, mode, textFilter, setTextFilter, rankByPair, setRankByPair } = props;
    const { t, TRAIT_NAMES } = React.useContext(GlobalContext).localized;
    if (!data) return <></>;

    const targetGroup = `${pageId}_gauntletTable`;

    const [crew, setCrew] = React.useState<PlayerCrew[] | undefined>(undefined);

    const [activePageCrew, setActivePageCrew] = React.useState<PlayerCrew[] | undefined>(undefined);
    const [openCrit, setOpenCrit] = React.useState<number>(0);
    const [totalPages, setTotalPages] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [activePage, setActivePage] = React.useState(1);

    const [sortDirection, setSortDirection] = useStateWithStorage<SortDirection>(`${pageId}/sortDirection`, 'ascending');

    const [sortKey, setSortKey] = useStateWithStorage<string | undefined>(`${pageId}/sortKey`, undefined);

    const pageStartIdx = (activePage - 1) * itemsPerPage;
    const [elevated, setElevated] = React.useState({} as { [key: string]: number });
    const [crewBuckets, setCrewBuckets] = React.useState({} as {[key:string]: GauntletBucketType[] });
    const imageClick = (e: React.MouseEvent<HTMLImageElement, MouseEvent>, data: any) => {
        console.log("imageClick");
        // if (matchMedia('(hover: hover)').matches) {
        // 	window.location.href = "/crew/" + data.symbol;
        // }
    }


    const columnClick = (key: string) => {
        if (rankByPair?.length) setRankByPair([]);
        if (sortDirection === undefined) {
            if (['name', 'rank'].includes(key)) {
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
        else if (sortKey !== key) {
            setSortKey(key);
        }
    }

    const prettyTraits = gauntlet.prettyTraits;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

    const columns = [
        { title: t('gauntlet.columns.rank'), key: "index" },
        { title: t('gauntlet.columns.crew'), key: "name", width: 3 as SemanticWIDTHS },
        { title: t('gauntlet.columns.rarity'), key: "rarity", reverse: true },
        {
            title: gauntlets?.length ?

            <Popup
                trigger={<div>{t('gauntlet.columns.high_crits')} <Icon name='help'/></div>}
                content={<div>
                    {t('gauntlet.elevated_note')}
                </div>}
             />

            : t('gauntlet.columns.crits'),
            key: "crit",
            reverse: true
        },
        { title: t('gauntlet.columns.first_pair'), key: "pair_1", reverse: true },
        { title: t('gauntlet.columns.second_pair'), key: "pair_2", reverse: true },
        { title: t('gauntlet.columns.third_pair'), key: "pair_3", reverse: true },
        // { title: "Owned", key: "have" },
        { title: t('gauntlet.columns.in_portal'), key: "in_portal" },
        { title: t('gauntlet.columns.qp'), key: "q_bits", reverse: true }
    ];

    const pageSizes = [1, 5, 10, 20, 50, 100].map(size => {
        return {
            key: `pageSize_${size}`,
            value: size,
            text: `${size}`
        } as DropdownItemProps;
    });

    React.useEffect(() => {
        if (gauntlets?.length) {
            const elev: {[key:string]:number} = {};
            const cb: {[key:string]:GauntletBucketType[]} = {};
            for (let c of data) {
                const buckets = getElevatedBuckets(c, gauntlets, TRAIT_NAMES);
                let high = buckets.filter(f => f.crit >= 45);
                if (high?.length) {
                    elev[c.symbol] = high.length;
                }
                cb[c.symbol] = buckets;
            }
            setElevated(elev);
            setCrewBuckets(cb);
        }
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
            else if (activePage < 1 && pages) {
                setActivePage(1);
                return;
            }
        }
        setActivePageCrew(crew.slice(pageStartIdx, pageStartIdx + itemsPerPage));
    }, [crew, itemsPerPage, activePage, totalPages]);

    React.useEffect(() => {
        setCrew(rosterizeCrew(data));
    }, [sortKey, sortDirection, elevated, data]);

    return (<div style={{ overflowX: "auto" }}>
        <Input
            style={{ width: isMobile ? '100%' : '50%' }}
            iconPosition="left"
            placeholder={t('global.search_ellipses')}
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
                            key={"k_gauntlet_header_" + hidx}
                            width={col.width}
                            sorted={sortKey === col.key ? sortDirection : undefined}
                            onClick={() => {
                                columnClick(col.key);
                                if (!!col.reverse && col.key !== sortKey && sortDirection !== 'descending') {
                                    setSortDirection('descending');
                                }
                                else if (!col.reverse && col.key !== sortKey && sortDirection !== 'ascending') {
                                    setSortDirection('ascending');
                                }
                            }}>
                            {col.title}
                        </Table.HeaderCell>)}
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {activePageCrew?.map((row, idx: number) => renderTableRow(row, idx))}
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
                            {t('global.rows_per_page')}:{' '}
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

    function renderTableRow(crew: PlayerCrew, idx: number) {
        const pairs = crew.pairs ?? getPlayerPairs(crew);
        const rank = gauntlet.origRanks ? gauntlet.origRanks[crew.symbol] : idx + pageStartIdx + 1;
        const inMatch = !!gauntlet.contest_data?.selected_crew?.find((c) => c.crew_id === crew.id && crew.isSelected);
        const obtained = prettyObtained(crew, t);
        const color = printPortalStatus(crew, t, true, false) === t('global.never') ? CONFIG.RARITIES[5].color : undefined;
        const qbslots = qbitsToSlots(crew.q_bits);
        const trueImmo = isImmortal(crew);
        const negative = !!crew.isOpponent;
        const positive = (mode !== 'live' &&
                (filter?.ownedStatus === 'maxall' || filter?.ownedStatus === 'ownedmax') &&
                crew.immortal === CompletionState.DisplayAsImmortalOwned)
                || (mode === 'live' && inMatch);

        return (
            <Table.Row key={`gauntletTable_row_${idx}`} negative={negative} positive={positive}>
                <Table.Cell>{rank}</Table.Cell>
                <Table.Cell>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '60px auto',
                            gridTemplateAreas: `'icon stats' 'icon description'`,
                            gridGap: '1px'
                        }}>
                        <div style={{ gridArea: 'icon' }}>
                            <CrewTarget targetGroup={targetGroup} inputItem={crew} passDirect={crew.isSelected || crew.isOpponent}>
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
                    {gauntlets?.length && <>
                        <div style={{cursor: openCrit !== crew.id ? 'zoom-in' : 'zoom-out'}} onClick={() => setOpenCrit(openCrit === crew.id ? 0 : crew.id)}>
                            {openCrit !== crew.id && <>{elevated[crew.symbol]}</>}
                            {openCrit === crew.id && renderElevatedCritTable(crew)}
                        </div>
                    </>}
                    {!gauntlets?.length && ((prettyTraits?.filter(t => crew.traits_named.includes(t))?.length ?? 0) * 20 + 5) + "%"}
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
                <Table.Cell width={2}>
                    <span title={printPortalStatus(crew, t, true, true, true)}>
                        {printPortalStatus(crew, t, true, false)}
                        {!!color && <div style={{ color: color }}>{obtained}</div>}
                    </span>
                </Table.Cell>
                <Table.Cell>
                    <div title={
                        !trueImmo ? 'Frozen, unfinished or unowned crew do not have q-bits' : qbslots + " Slot(s) Open"
                    }>
                        <div>
                            {!trueImmo ? 'N/A' : crew.q_bits}
                        </div>
                        {trueImmo &&
                            <div style={{ fontSize: "0.8em" }}>
                                ({qbslots} Slot{qbslots != 1 ? 's' : ''})
                            </div>}
                    </div>
                </Table.Cell>
            </Table.Row>)
    }

    function renderElevatedCritTable(crew: PlayerCrew) {
        if (!gauntlets) return <></>
        const buckets = crewBuckets[crew.symbol];
        if (!buckets) return <></>
        return (
            <div style={{maxHeight: '15em', overflowY: 'auto'}}>
                <Table striped>
                    {buckets.map((bucket, idx) => {
                        const { key, name, crit, count } = bucket;
                        return (
                            <Table.Row key={`gpcrit_${crew.symbol}_${key}_${crit}`}>
                                <Table.Cell>
                                    {count}
                                </Table.Cell>
                                <Table.Cell>
                                    {name || key}
                                </Table.Cell>
                                <Table.Cell>
                                    <div style={{minWidth: '4em'}}>
                                    <Label color={getCritColor(crit)}>
                                        {t('global.n_%', { n: crit })}
                                    </Label>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table>
            </div>
        )
    }

    function rosterizeCrew(data: PlayerCrew[]) {
        const prettyTraits = gauntlet?.prettyTraits;

        var newarr = [...data]; // JSON.parse(JSON.stringify(data)) as PlayerCrew[];

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
            if (gauntlets?.length) {
                newarr = newarr.sort((a, b) => {
                    let atr = elevated[a.symbol] ?? 0;
                    let btr = elevated[b.symbol] ?? 0;
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
            else {
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
        else if (key === 'q_bits') {
            newarr = newarr.sort((a, b) => {
                let r = (a.q_bits - b.q_bits);
                if (r === 0) {
                    let aa = 0;
                    let bb = 0;
                    if (!a.have) aa++;
                    if (!b.have) bb++;
                    if (a.rarity !== a.max_rarity) aa++;
                    if (b.rarity !== b.max_rarity) bb++;
                    r = bb - aa;
                    if (r === 0) {
                        r = a.name.localeCompare(b.name);
                    }
                }
                return r * dir;
            });
        }

        return newarr;
    }
}


