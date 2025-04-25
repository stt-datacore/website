import React from "react";
import { Header, Pagination, Table } from "semantic-ui-react";
import { GlobalContext } from "../../context/globalcontext";
import { CrewMember } from "../../model/crew";
import { CrewQuipStats, VoyageHOFPeriod, VoyageStatEntry, getNiceNames } from "../../model/hof";
import { PlayerCrew } from "../../model/player";
import { RankMode } from "../../utils/misc";
import { OwnedLabel } from "../crewtables/commonoptions";
import { IRosterCrew } from "../crewtables/model";
import ItemDisplay from "../itemdisplay";
import { formatNumber } from "./hofdetails";

export interface VoyageStatsProps {
    period: VoyageHOFPeriod;
    allCrew: (PlayerCrew | CrewMember)[];
    stats: VoyageStatEntry[];
    rankBy: RankMode;
    clickCrew: (value: string) => void;
}

export const VoyageStatsForPeriod = ({ period, stats, allCrew, rankBy, clickCrew: setGlance }: VoyageStatsProps) => {

    const pageSize = 10;
    const context = React.useContext(GlobalContext);
    const { t, useT, tfmt } = context.localized;
    const { t: hof } = useT('hof');
    const quipment = context.core.items.filter(i => i.type === 14);
    const myCrew = context.player.playerData?.player.character.crew ?? [];

    const [rankedCrew, setRankedCrew] = React.useState<(PlayerCrew & VoyageStatEntry)[]>([]);

    const [totalPages, setTotalPages] = React.useState(0);
    const [activePage, setActivePage] = React.useState(-1);
    const [innerRankBy, setInnerRankBy] = React.useState<RankMode | ''>('');

    React.useEffect(() => {
        if (innerRankBy === '' || !stats?.length) return;

        const newRank = innerRankBy;
        const newCrew = stats
            ?.map((s) => {
                const crew = allCrew.find((c) => c.symbol === s.crewSymbol);
                if (!crew) {
                    return undefined;
                }
                let newQuip = [] as CrewQuipStats[];
                if (s.quipmentCounts) {
                    Object.entries(s.quipmentCounts).forEach(([key, value]) => {
                        let cquip = newQuip.find(f => f.kwipment_id === key);
                        if (!cquip) {
                            newQuip.push({
                                kwipment_id: key,
                                count: value,
                                equipment: quipment.find(f => f.kwipment_id?.toString() === key)!
                            });
                        }
                        else {
                            cquip.count += value;
                        }
                    });
                }

                newQuip.sort((a, b) => b.count - a.count);

                return {
                    ...s,
                    ...crew,
                    ...(myCrew.find(fc => fc.symbol === crew.symbol) ?? {}),
                    quipStats: newQuip
                };
            })
            .filter((s) => s)
            .sort((a, b) => {
                if (!a || !b) {
                    if (!a) {
                        return 1;
                    }
                    else if (!b) {
                        return -1;
                    }
                    else {
                        return 0;
                    }
                }

                a.averageDuration ??= 1;
                b.averageDuration ??= 1;

                a.maxDuration ??= 1;
                b.maxDuration ??= 1;

                a.crewCount ??= 0;
                b.crewCount ??= 0;

                if (newRank === 'voyages') {
                    return b.crewCount - a.crewCount;
                }
                else if (newRank === 'duration') {
                    return b.averageDuration - a.averageDuration;
                }
                else if (newRank === 'maxdur') {
                    return b.maxDuration - a.maxDuration;
                }
                else if (newRank === 'voymaxdur') {
                    let ac = a.crewCount * a.maxDuration;
                    let bc = b.crewCount * b.maxDuration;
                    return bc - ac;
                }
                else {
                    let ac = a.crewCount * a.averageDuration;
                    let bc = b.crewCount * b.averageDuration;
                    return bc - ac;
                }
            })
            .slice(0, 100) as (PlayerCrew & VoyageStatEntry)[];

        setRankedCrew(newCrew);
        let pages = Math.ceil(newCrew.length / pageSize);
        setTotalPages(pages);
        if (activePage >= pages) {
            setActivePage(pages - 1);
        }
        else if (activePage < 0) {
            setActivePage(0);
        }
    }, [stats, innerRankBy]);

    React.useEffect(() => {
        setActivePage(-1);
        setInnerRankBy(rankBy);
    }, [rankBy]);

    const rowColors = {
        "0": "#AF9500",
        "1": "#B4B4B4",
        "2": "#AD8A56",
    };

    const maxDuration = rankedCrew.map(rc => rc?.averageDuration ?? 0).reduce((p, n) => p > n ? p : n, 0);
    const maxVoy = rankedCrew.map(rc => rc?.crewCount ?? 0).reduce((p, n) => p > n ? p : n, 0);
    const minVoy = rankedCrew.map(rc => rc?.crewCount ?? 0).reduce((p, n) => p < n ? p : n, maxVoy);

    rankedCrew.forEach((rc) => {
        rc.seats = rc.seats.filter(f => f.seat_skill in rc.base_skills)
        rc.seats.sort((a, b) => b.crewCount - a.crewCount);
    })

    const niceNames = getNiceNames(t);

    return (
        <>
            <Header textAlign="center">
                {t('hof.voyage_stats_for_timeframe', {
                    timeframe: niceNames[period]
                })}
            </Header>
            {activePage >= 0 &&
                <Table striped>
                    <Table.Header>
                        <Table.Row>
                            <Table.Cell colspan={3}>
                                <Pagination fluid activePage={activePage + 1} totalPages={totalPages} onPageChange={(e, { activePage }) => { setActivePage((activePage as number) - 1) }} />
                            </Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.HeaderCell>{t('rank_names.rank')}</Table.HeaderCell>
                            <Table.HeaderCell textAlign="left">{t('base.crew')}</Table.HeaderCell>
                            <Table.HeaderCell textAlign="left">{t('base.quipment')}</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {rankedCrew.slice(activePage * pageSize, pageSize + (activePage * pageSize)).map((crew, index) => (
                            <React.Fragment key={`${crew.symbol}_${index}_stats`}>
                                <Table.Row key={crew?.symbol + "_" + period}>
                                    <Table.Cell>
                                        <Header
                                            as="h2"
                                            textAlign="center"
                                            style={{ color: rowColors[index] }}
                                        >
                                            {index + (activePage * pageSize) + 1}
                                        </Header>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div
                                            title={"Click for more details"}
                                            onClick={(e) => setGlance(crew.symbol)}
                                            style={{
                                                cursor: "pointer",
                                                display: "grid",
                                                gridTemplateColumns: "80px auto",
                                                gridTemplateAreas: `'icon name' 'footer footer' 'quip quip'`,
                                                gridGap: "1px",
                                            }}
                                        >
                                            <div style={{ gridArea: "icon", display: "flex", flexDirection: "row", alignItems: "center" }}>
                                                <ItemDisplay
                                                    itemSymbol={crew.symbol}
                                                    src={`${process.env.GATSBY_ASSETS_URL}/${crew?.imageUrlPortrait}`}
                                                    allCrew={context.core.crew}
                                                    rarity={context.player.playerData ? crew.rarity : crew.max_rarity}
                                                    maxRarity={crew.max_rarity}
                                                    targetGroup="voyagehof"
                                                    playerData={context.player.playerData}
                                                    size={64}
                                                />
                                                {/* <CrewTarget inputItem={crew} targetGroup="voyagehof">
                                             <img
                                                 width={48}
                                                 src={`${process.env.GATSBY_ASSETS_URL}/${crew?.imageUrlPortrait}`}
                                             />
                                        </CrewTarget> */}
                                            </div>
                                            <div style={{ gridArea: "name" }}>
                                                <span style={{ fontWeight: "bolder", fontSize: "1.25em", textDecoration: 'underline' }}>
                                                    {crew?.name}
                                                </span>
                                                <Header as="h4" style={{ marginTop: "10px" }}>
                                                    {hof('voyage_count{{:}}')}{" "}
                                                    {formatNumber(crew.crewCount, maxVoy, 1)}
                                                </Header>
                                                {crew?.averageDuration && (
                                                    <Header as="h4" style={{ marginTop: "10px" }}>
                                                        {hof('average_duration{{:}}')}{" "}
                                                        {tfmt('duration.n_h', {
                                                            hours: formatNumber(crew.averageDuration, maxDuration, 1 / 3600)
                                                        })}
                                                    </Header>
                                                )}
                                                {crew?.maxDuration && (
                                                    <Header as="h4" style={{ marginTop: "10px" }}>
                                                        {hof('max_duration{{:}}')}{" "}
                                                        {tfmt('duration.n_h', {
                                                            hours: formatNumber(crew.maxDuration, maxDuration, 1 / 3600)
                                                        })}
                                                    </Header>
                                                )}
                                                {crew?.have && <OwnedLabel statsPopup crew={crew as IRosterCrew} />}
                                            </div>
                                            <div style={{ marginTop: "0.5em", marginRight: "0.5em", gridArea: "footer", display: 'flex', flexDirection: 'row', justifyContent: 'left', gap: '3em', alignItems: 'center' }}>
                                                {crew.seats.map((seat, idx) => {
                                                    return (<div
                                                        title={`${seat.crewCount.toLocaleString()} voyages.`}
                                                        key={`${idx}_${crew.symbol}_seat_${seat.seat_skill}`} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
                                                        <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.seat_skill}.png`}
                                                            style={{ height: "24px", margin: "0.5em" }} />

                                                        <div>{Math.round(100 * (seat.crewCount / crew.crewCount))}%</div>
                                                    </div>)
                                                })}
                                            </div>
                                            {/* <div style={{gridArea: 'quip', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'left'}}>
                                        {!!crew.quipmentCounts && Object.entries(crew.quipmentCounts).map(([key, value]) => {
                                            const quip = context.core.items.find(f => f.kwipment_id === key);

                                            return <div key={`${key}_${value}_${crew.symbol}`} style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'left'}}>
                                                {!!quip && <><img style={{height: "1.5em"}} src={`${process.env.GATSBY_ASSETS_URL}${quip.imageUrl}`} />
                                                <span>{quip.name} - {value.toLocaleString()}</span>
                                                </>
                                                }
                                            </div>
                                        })}
                                    </div> */}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell width={5}>
                                        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', overflowY: 'auto', height: '14em' }}>
                                            {Object.entries(crew.quipStats!).map(([key, value]) => {
                                                let equipment = value.equipment;
                                                return <div style={{ width: 'calc(32px + 0.5em)', marginTop: '0.25em', marginBottom: '0.25em', display: 'flex', flexDirection: 'column', justifyItems: 'center', gap: "0.25em", alignItems: 'center' }}>
                                                    {equipment && <ItemDisplay
                                                        src={`${process.env.GATSBY_ASSETS_URL}${equipment.imageUrl}`}
                                                        size={32}
                                                        targetGroup="voyagehofitem"
                                                        itemSymbol={equipment.symbol}
                                                        allItems={context.core.items}
                                                        rarity={equipment.rarity}
                                                        maxRarity={equipment.rarity}
                                                    />}
                                                    <span style={{ fontSize: '0.8em' }}>{value.count}</span>
                                                </div>
                                            })}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            </React.Fragment>
                        ))}
                    </Table.Body>
                    <Table.Footer>
                        <Table.Row>
                            <Table.Cell colspan={3}>
                                <Pagination fluid activePage={activePage + 1} totalPages={totalPages} onPageChange={(e, { activePage }) => { setActivePage((activePage as number) - 1) }} />
                            </Table.Cell>
                        </Table.Row>
                    </Table.Footer>
                </Table>}
            {activePage === -1 && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '4em' }}>

                {context.core.spin(t('spinners.calculating'))}
            </div>}
        </>
    );
};