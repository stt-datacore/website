import React, { Component } from "react";
import {
    Table, Dropdown, Header, Grid, Button
} from "semantic-ui-react";
import { RankMode, appelate } from "../../utils/misc";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { TinyStore } from "../../utils/tiny";
import { GlobalContext } from "../../context/globalcontext";
import { OwnedLabel } from "../crewtables/commonoptions";
import { IRosterCrew } from "../crewtables/model";
import { gradeToColor, skillToRank } from "../../utils/crewutils";
import ItemDisplay from "../itemdisplay";
import { RawVoyageRecord, guessSkillsFromCrew } from "../../utils/voyageutils";
import { navigate } from "gatsby";
import CONFIG from "../CONFIG";
import { VoyageHOFPeriod, VoyageStatEntry, niceNamesForPeriod, VoyageHOFProps, VoyageHOFState } from "../../model/hof";
import { HofDetails, formatNumber } from "./hofdetails";
import { CrewDropDown } from "../base/crewdropdown";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
 
export interface VoyageStatsProps {
    period: VoyageHOFPeriod;
    allCrew: (PlayerCrew | CrewMember)[];
    stats: VoyageStatEntry[];
    rankBy: RankMode;
    clickCrew: (value: string) => void;
}

const VoyageStatsForPeriod = ({ period, stats, allCrew, rankBy, clickCrew: setGlance }: VoyageStatsProps) => {
    
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
            rankBy: this.tiny.getValue<RankMode>('rankMode', 'voyages') ?? 'voyages',
            glanceDays: 31
        };
    }

    readonly setGlance = (crew?: string[]) => {
        crew = crew?.filter(f => !!f?.length && f !== 'undefined');

        if (crew?.length) {
            navigate(`/hall_of_fame?crew=${crew?.join(",")}`);
        }
        else {
            navigate(`/hall_of_fame`);
        }
                
        this.setState({ ...this.state, crewSymbol: crew, rawVoyages: undefined });
    }

    readonly setSelection = (crew?: number[]) => {
        const { crew: allCrew } = this.context.core;
        const maps = allCrew?.filter(f => crew?.includes((f as PlayerCrew).id)).map(m => (m as PlayerCrew).symbol);
        this.setGlance(maps);
    }

    readonly clickCrew = (crew?: string) => {
        let current = [ ... this.state.crewSymbol ?? [] ];        
        if (crew) {
            if (!current.includes(crew)) {
                current.push(crew);
            }
            else if (current.includes(crew)) {
                current = current.filter(f => f !== crew);
            }
        }
        current = current?.filter(f => !!f?.length && f !== 'undefined');
        if (current?.length === 0) {
            navigate("/hall_of_fame");
            this.setState({ ... this.state, crewSymbol: undefined })
        }
        else {
            navigate(`/hall_of_fame?crew=${current?.join(",")}`);
            this.setState({ ... this.state, crewSymbol: current })
        }
        
    }

    readonly loadCrew = (crew: string[]) => {
        fetch(`${process.env.GATSBY_DATACORE_URL}api/voyagesByCrew?opand=1&crew=${crew.join(",")}&days=${this.state.glanceDays}`)
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
        fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry?type=voyage`)
            .then((response) => response.json())
            .then((voyageStats) => {
                this.setState({ ...this.state, voyageStats });
                setTimeout(() => {
                    if (window?.location?.search) {
                        let search = new URLSearchParams(window.location.search);
                        let crew = search.get("crew");
                        if (crew) {
                            let crsplit = crew.split(",")
                            this.setState({ ...this.state, crewSymbol: crsplit, rawVoyages: undefined })
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

    private getFilteredCrew() {
        const { voyageStats } = this.state;
        const { crew: allCrew } = this.context.core;

        if (!allCrew || !voyageStats) return [];
        
        let pcn = [ ... new Set(Object.values(voyageStats).map(v => v.map(q => q.crewSymbol)).flat()) ];
        return allCrew
                    .filter(f => pcn.includes(f.symbol))
                    .sort((a, b) => {
                        return pcn.findIndex(f => f === a.symbol) - pcn.findIndex(f => f === b.symbol);
                    });
    }

    render() {
        const { crewSymbol, rawVoyages, rankBy, voyageStats } = this.state;
        const { crew: allCrew } = this.context.core;

        if (!this.state.voyageStats || !allCrew) {
            return (
                <div className="ui medium centered text active inline loader">
                    Loading hall of fame...
                </div>
            );
        }
        allCrew.forEach(c => {
            if (!c.id) c.id = c.archetype_id;
        })
        let rows = [] as { stats: VoyageStatEntry[], key: VoyageHOFPeriod }[][];
        let stats = Object.keys(niceNamesForPeriod)?.filter(p => !!p?.length);
       
        while (stats.length) {
            rows.push(stats.splice(0, 3).map(p => { return { stats: (voyageStats as Object)[p] as VoyageStatEntry[], key: p as VoyageHOFPeriod } } ))
        }

        const filteredCrew = this.getFilteredCrew();
        const selection = filteredCrew?.filter(s => crewSymbol?.includes(s.symbol)).map(m => m?.id ?? 0);
        const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center', justifyContent: 'center'}}>
                <Header as="h1" textAlign="center">
                    Voyage Hall of Fame
                </Header>

                <div style={{
                    width: isMobile ? "100%" : "50%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "0.5em"
                }}>
                    <CrewDropDown 
                        placeholder={"Select crew to see detailed stats..."}
                        plain
                        fluid
                        multiple={true}
                        pool={filteredCrew} 
                        selection={selection} 
                        setSelection={this.setSelection}  
                        />
                </div>
                
                <HofDetails crewClick={this.clickCrew} hofState={this.state} />

                {!!crewSymbol?.length && !!rawVoyages && 
                <Button style={{margin: "0.5em"}} onClick={(e) => this.setGlance()}>{"Clear Details View"}</Button>
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
                                            clickCrew={this.clickCrew}
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
