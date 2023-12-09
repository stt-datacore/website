import React, { Component } from "react";
import {
    Table, Dropdown, Header, Grid, Button
} from "semantic-ui-react";
import { RankMode } from "../utils/misc";
import { CrewMember } from "../model/crew";
import { PlayerCrew } from "../model/player";
import { TinyStore } from "../utils/tiny";
import { GlobalContext } from "../context/globalcontext";
import { OwnedLabel } from "./crewtables/commonoptions";
import { IRosterCrew } from "./crewtables/model";
import { gradeToColor, skillToRank } from "../utils/crewutils";
import ItemDisplay from "./itemdisplay";
import { RawVoyageRecord, guessSkillsFromCrew } from "../utils/voyageutils";
import { navigate } from "gatsby";
 
const formatNumber = (value: number, max: number, mult?: number, suffix?: string) => {
    let s = "";
    mult ??= 1;
    if (suffix) suffix = " " + suffix;
    else suffix = "";
    let fmt = Math.round((value * mult) * 10) / 10;
    return (
    <span style={{color: gradeToColor(value/max) ?? undefined}}>
    {fmt.toLocaleString() + suffix}
    </span>
    );
};


type VoyageHOFProps = {};

type VoyageStatSeat = {
    seat_skill: string;
    seat_index: number;
    averageDuration: number;
    crewCount: number;
}

type VoyageStatEntry = {
    crewSymbol: string;
    crewCount: number;
    estimatedDuration?: number;
    averageDuration?: number;
    startDate?: Date;
    endDate?: Date;
    seats: VoyageStatSeat[];
}

type VoyageHOFState = {
    voyageStats?: {
        lastSevenDays: VoyageStatEntry[];
        lastThirtyDays: VoyageStatEntry[];
        lastNinetyDays: VoyageStatEntry[];
        lastSixMonths?: VoyageStatEntry[];
        oneYear?: VoyageStatEntry[];
        allTime?: VoyageStatEntry[];
    };
    allCrew?: (CrewMember | PlayerCrew)[];
    errorMessage?: string;
    rankBy: RankMode;
    crewSymbol?: string;
    rawVoyages?: RawVoyageRecord[];
    glanceDays: number;
};

export type VoyageHOFPeriod = "allTime" | "lastSevenDays" | "lastThirtyDays" | "lastSixMonths" | "lastNinetyDays" | "oneYear";

const niceNamesForPeriod = {
    lastNinetyDays: "Last 90 days",
    lastThirtyDays: "Last 30 days",
    lastSevenDays: "Last 7 days",
    lastSixMonths: "Last 6 Months",
    oneYear: "Last Year",
//    allTime: "All Time",
};

export interface VoyageStatsProps {
    period: VoyageHOFPeriod;
    allCrew: (PlayerCrew | CrewMember)[];
    stats: VoyageStatEntry[];
    rankBy: RankMode;
    setGlance: (value: string) => void;
}

const VoyageStatsForPeriod = ({ period, stats, allCrew, rankBy, setGlance }: VoyageStatsProps) => {
    
    const context = React.useContext(GlobalContext);    
    const myCrew = context.player.playerData?.player.character.crew ?? [];

    const rankedCrew = stats
        ?.map((s) => {
            const crew = allCrew.find((c) => c.symbol === s.crewSymbol);
            if (!crew) {
                return undefined;
            }
            
            return {
                ...s,
                ...crew,
                ...(myCrew.find(fc => fc.symbol === crew.symbol) ?? {})
            };
        })
        .filter((s) => s)
        .sort((a, b) => rankBy === 'voyages' ? (b?.crewCount ?? 0) - (a?.crewCount ?? 0) : (b?.averageDuration ?? 0) - (a?.averageDuration ?? 0))
        .slice(0, 100) as (PlayerCrew & VoyageStatEntry)[];
    const rowColors = {
        "0": "#AF9500",
        "1": "#B4B4B4",
        "2": "#AD8A56",
    };

    const maxDuration = rankedCrew.map(rc => rc?.averageDuration ?? 0).reduce((p, n) => p > n ? p : n, 0);
    const maxVoy = rankedCrew.map(rc => rc?.crewCount ?? 0).reduce((p, n) => p > n ? p : n, 0);

    rankedCrew.forEach((rc) => {
        rc.seats.sort((a, b) => b.crewCount - a.crewCount);
    })

    return (
        <>
            <Header textAlign="center">
                Voyage stats for {niceNamesForPeriod[period]}
            </Header>
            <Table striped>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>Rank</Table.HeaderCell>
                        <Table.HeaderCell textAlign="right">Crew</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {rankedCrew.map((crew, index) => (
                        <React.Fragment>
                        <Table.Row key={crew?.symbol + "_" + period}>
                            <Table.Cell>
                                <Header
                                    as="h2"
                                    textAlign="center"
                                    style={{ color: rowColors[index] }}
                                >
                                    {index + 1}
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
                                        gridTemplateAreas: `'icon name' 'footer footer'`,
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
                                                Voyage Count:{" "}
                                                {formatNumber(crew.crewCount, maxVoy, 1)}
                                        </Header>
                                        {crew?.averageDuration && (
                                            <Header as="h4" style={{ marginTop: "10px" }}>
                                                Average Duration:{" "}
                                                {formatNumber(crew.averageDuration, maxDuration, 1/3600, "h")}
                                            </Header>
                                        )}
                                        {crew?.have && <OwnedLabel statsPopup crew={crew as IRosterCrew} />}
                                    </div>
                                    <div style={{marginTop: "0.5em", gridArea: "footer", display:'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center'}}>
                                    {crew.seats.map((seat, idx) => {

                                        return (<div 
                                            title={`${seat.crewCount.toLocaleString()} voyages.`}
                                            key={`${idx}_${crew.symbol}_seat_${seat.seat_skill}`} style={{display:'flex', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center'}}>
                                            <img src={`${process.env.GATSBY_ASSETS_URL}atlas/icon_${seat.seat_skill}.png`} 
                                                style={{height: "24px", margin: "0.5em"}} />
                                            
                                            <div>{Math.round(100 * (seat.crewCount / crew.crewCount))}%</div>
                                        </div>)
                                    })}
                                    

                                </div>

                                </div>
                            </Table.Cell>
                        </Table.Row>
                        </React.Fragment>
                    ))}
                </Table.Body>
            </Table>
        </>
    );
};

class VoyageHOF extends Component<VoyageHOFProps, VoyageHOFState> {
    static contextType = GlobalContext;
    context!: React.ContextType<typeof GlobalContext>;

    private readonly tiny = TinyStore.getStore('voyagehof');

    constructor(props: VoyageHOFProps) {
        super(props);

        this.state = {
            voyageStats: undefined,
            errorMessage: undefined,
            allCrew: undefined,
            rankBy: this.tiny.getValue<RankMode>('rankMode', 'voyages') ?? 'voyages',
            glanceDays: 31
        };
    }

    readonly setGlance = (crew?: string) => {
        navigate(`/hall_of_fame?crew=${crew}`);
        this.setState({ ...this.state, crewSymbol: crew, rawVoyages: undefined });
    }

    readonly loadCrew = (crew: string) => {
        fetch(`${process.env.GATSBY_DATACORE_URL}api/voyagesByCrew?crew=${crew}&days=${this.state.glanceDays}`)
            .then((response) => response.json())
            .then((rawVoyages) => this.setState({ ... this.state, rawVoyages }));

    }

    componentDidUpdate(prevProps: Readonly<VoyageHOFProps>, prevState: Readonly<VoyageHOFState>, snapshot?: any): void {
        if (prevState.crewSymbol !== this.state.crewSymbol) {
            const crew = this.state.crewSymbol;
            if (!crew) {
                this.setState({ ...this.state, rawVoyages: undefined });
                return;
            }
            this.loadCrew(crew);
        }
    }

    componentDidMount() {
        fetch("/structured/crew.json")
            .then((response) => response.json())
            .then((allCrew) => this.setState({ allCrew }));
        fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry?type=voyage`)
            .then((response) => response.json())
            .then((voyageStats) => {
                this.setState({ ...this.state, voyageStats });
                setTimeout(() => {
                    if (window?.location?.search) {
                        let search = new URLSearchParams(window.location.search);
                        let crew = search.get("crew");
                        if (crew) {
                            this.setState({ ...this.state, crewSymbol: crew, rawVoyages: undefined })
                        }
                    }
                });
            })
            .catch((err) => {
                this.setState({ ...this.state, errorMessage: err });
            });

    }

    private readonly setRankBy = (rank: RankMode) => {
        this.tiny.setValue('rankMode', rank, true);
        this.setState({ ...this.state, rankBy: rank });
    };

    render() {
        const { crewSymbol, rawVoyages, rankBy, voyageStats, allCrew } = this.state;

        if (!this.state.voyageStats || !this.state.allCrew) {
            return (
                <div className="ui medium centered text active inline loader">
                    Loading hall of fame...
                </div>
            );
        }
        
        let rows = [] as { stats: VoyageStatEntry[], key: VoyageHOFPeriod }[][];
        let stats = Object.keys(niceNamesForPeriod)?.filter(p => !!p?.length);
       
        while (stats.length) {
            rows.push(stats.splice(0, 3).map(p => { return { stats: (voyageStats as Object)[p] as VoyageStatEntry[], key: p as VoyageHOFPeriod } } ))
        }

        const featured = allCrew?.find(c => c.symbol === crewSymbol);
        const voyCounts = {} as { [key: string]: number };
        let ridesWith = [] as CrewMember[];
        let countKeys = [] as string[];
        const ccount = {} as { [key: string]: number };

        if (featured && rawVoyages) {
            
            rawVoyages.forEach((voyage) => {
                if (!voyage.primary_skill || !voyage.secondary_skill) {
                    let guess = guessSkillsFromCrew(voyage, this.context.core.crew);
                    if (guess?.length && guess.length >= 2) {
                        voyage.primary_skill = guess[0];
                        voyage.secondary_skill = guess[1];
                    }
                }
                for (let c of voyage.crew) {
                    if (c === crewSymbol) continue;

                    ccount[c] ??= 0;
                    ccount[c]++;
                }
                let key = `${skillToRank(voyage.primary_skill as string)}/${skillToRank(voyage.secondary_skill as string)}`;

                voyCounts[key] ??= 0;
                voyCounts[key]++;

            });
            let csymbols = Object.keys(ccount);
            csymbols.sort((a, b) => {
                return ccount[b] - ccount[a];
            });

            ridesWith = csymbols.map(symbol => allCrew?.find(c => c.symbol === symbol) as CrewMember);
            countKeys = Object.keys(voyCounts);
            countKeys.sort((a, b) => voyCounts[b] - voyCounts[a]);
        }

        

        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center', justifyContent: 'center'}}>
                <Header as="h1" textAlign="center">
                    Voyage Hall of Fame
                </Header>
                {!!crewSymbol && (!rawVoyages || (featured?.symbol !== crewSymbol)) && this.context.core.spin(`Loading details for '${featured?.name ?? crewSymbol}' ...`)}
                {!!crewSymbol && !!rawVoyages?.length && !!featured &&
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: "12pt"
                }}>
                    <h2>{featured.name}</h2>
                    <img style={{height: "25em"}} src={`${process.env.GATSBY_ASSETS_URL}${featured.imageUrlFullBody}`} />
                    
                    <p>{this.state.glanceDays} Day Glance: {formatNumber(rawVoyages.length, Math.max(rawVoyages.length, this.state.voyageStats?.lastThirtyDays?.length ?? rawVoyages.length), 1)} Voyages</p>
                    <p>Average Duration:{" "}{formatNumber(rawVoyages.map(r => r.estimatedDuration ?? 0).reduce((p, n, idx) => ((p * idx) + n) / (idx + 1), 0), 0, 1/3600, "h")}</p>
                    <h4>Most Popular Voyage Types:</h4>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        flexWrap: 'wrap',
                        gap: "0.5em"
                    }}>
                        
                    {countKeys.slice(0, 3).map((skills) => {
                        return <div 
                            className={'ui label'} 
                            style={{width: "10em", fontSize: "1.25em", height: "2em", display: 'grid', gridTemplateAreas: "'skills value'"}} 
                            key={`voycountskill_${skills}`}>                                
                                <div style={{gridArea: 'skills'}}>{skills}</div>
                                <div style={{gridArea: 'value', textAlign: 'right'}}>{Math.round(100 * (voyCounts[skills] / rawVoyages.length))}%</div>
                            </div>
                    })}
                    </div>
                    <h4><b>Frequently Rides With: </b></h4>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-evenly'
                    }}>
                    {ridesWith.slice(0, 5).map((crew) => {

                        return <div key={"hofkey_ride_"+crew.symbol}
                            title={'Click to switch to this crew'}
                            onClick={(e) => this.setGlance(crew.symbol)}
                            style={{
                                cursor: "pointer",
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: "10em"
                            }}>
                            <ItemDisplay 
                                itemSymbol={crew.symbol}
                                allCrew={allCrew}
                                playerData={this.context?.player.playerData}
                                size={64}
                                rarity={crew.max_rarity}
                                maxRarity={crew.max_rarity}
                                src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`}
                                targetGroup={'voyagehof'}
                            />
                            <div style={{margin:"0.5em"}}>{crew.name}</div>
                            <h4 className={'ui label'}>{ccount[crew.symbol].toLocaleString()}</h4>
                            </div>
                    })}
                    </div>                    
                    <Button style={{margin: "0.5em"}} onClick={(e) => this.setGlance()}>{"Clear At A Glance View"}</Button>
                </div>
                
                }

                <div
                    style={{
                        margin: "1em",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "0.5em"
                    }}
                >
                    <span>Rank By: </span>
                    <Dropdown
                        options={[
                            {
                                key: "voyages",
                                value: "voyages",
                                text: "Number of Voyages",
                            },
                            {
                                key: "duration",
                                value: "duration",
                                text: "Average Duration",
                            },
                        ]}
                        value={rankBy}
                        onChange={(e, { value }) => this.setRankBy(value as RankMode)}
                    />
                </div>
                <Grid columns={3} divided>
                    {rows.map((row) => {

                        return (
                            <Grid.Row>

                                {row.map((stats) => {

                                    if (!niceNamesForPeriod[stats.key]) return <></>
                                    return (
                                        <Grid.Column>
                                        <VoyageStatsForPeriod
                                            setGlance={this.setGlance}
                                            rankBy={rankBy}
                                            period={stats.key}
                                            stats={stats.stats}
                                            allCrew={allCrew ?? []}

                                        />

                                        </Grid.Column>
                                    )
                                })}

                            </Grid.Row>
                        )
                    })}
                    
                       
                </Grid>
            </div>
        );
    }
}

export default VoyageHOF;
