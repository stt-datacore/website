import React, { Component } from "react";
import {
    Table,
    Icon,
    Rating,
    Pagination,
    Dropdown,
    Form,
    Button,
    Checkbox,
    Header,
    Modal,
    Grid,
} from "semantic-ui-react";
import { navigate } from "gatsby";
import { RankMode } from "../utils/misc";
import { CrewMember } from "../model/crew";
import { PlayerCrew } from "../model/player";
import { CrewHoverStat, CrewTarget } from "./hovering/crewhoverstat";
import { TinyStore } from "../utils/tiny";

type VoyageHOFProps = {};

type VoyageStatEntry = {
    crewSymbol: string;
    crewCount: number;
    estimatedDuration?: number;
    averageDuration?: number;
};

type VoyageHOFState = {
    voyageStats?: {
        allTime?: VoyageStatEntry[];
        lastSixMonths?: VoyageStatEntry[];
        lastSevenDays: VoyageStatEntry[];
        lastThirtyDays: VoyageStatEntry[];
    };
    allCrew?: (CrewMember | PlayerCrew)[];
    errorMessage?: string;
    rankBy: RankMode;
};

const niceNamesForPeriod = {
    allTime: "All Time",
    lastSevenDays: "Last 7 days",
    lastThirtyDays: "Last 30 days",
    lastSixMonths: "Last 6 Months",
};

export interface VoyageStatsProps {
    period: "allTime" | "lastSevenDays" | "lastThirtyDays" | "lastSixMonths";
    allCrew: (PlayerCrew | CrewMember)[];
    stats: VoyageStatEntry[];
    rankBy: RankMode;
}

const VoyageStatsForPeriod = ({ period, stats, allCrew, rankBy }: VoyageStatsProps) => {
    const rankedCrew = stats
        ?.map((s) => {
            const crew = allCrew.find((c) => c.symbol === s.crewSymbol);
            if (!crew) {
                return undefined;
            }
            return {
                ...s,
                ...crew,
            };
        })
        .filter((s) => s)
        .sort((a, b) => rankBy === 'voyages' ? (b?.crewCount ?? 0) - (a?.crewCount ?? 0) : (b?.averageDuration ?? 0) - (a?.averageDuration ?? 0))
        .slice(0, 100);
    const rowColors = {
        "0": "#AF9500",
        "1": "#B4B4B4",
        "2": "#AD8A56",
    };

    const formatDuration = (duration: number) => {
        let s = "";

        duration = Math.round((duration / (60 * 60)) * 10) / 10;

        return duration.toLocaleString() + " h";
    };

    return (
        <>
            <Header textAlign="center">
                Voyage stats for {niceNamesForPeriod[period]}
            </Header>
            <Table>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>Rank</Table.HeaderCell>
                        <Table.HeaderCell textAlign="right">Crew</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {rankedCrew.map((crew, index) => (
                        <Table.Row>
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
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "80px auto",
                                        gridTemplateAreas: `'icon name'`,
                                        gridGap: "1px",
                                    }}
                                >
                                    <div style={{ gridArea: "icon" }}>
                                        <CrewTarget inputItem={crew} targetGroup="voyagehof">
                                            <img
                                                width={48}
                                                src={`${process.env.GATSBY_ASSETS_URL}/${crew?.imageUrlPortrait}`}
                                            />
                                        </CrewTarget>
                                    </div>
                                    <div style={{ gridArea: "name" }}>
                                        <span style={{ fontWeight: "bolder", fontSize: "1.25em" }}>
                                            {crew?.name}
                                        </span>
                                        <Header as="h4" style={{ marginTop: "10px" }}>
                                            {crew?.crewCount?.toLocaleString()} voyages
                                        </Header>
                                        {crew?.averageDuration && (
                                            <Header as="h4" style={{ marginTop: "10px" }}>
                                                Average Duration:{" "}
                                                {formatDuration(crew?.averageDuration)}
                                            </Header>
                                        )}
                                    </div>
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
        </>
    );
};

class VoyageHOF extends Component<VoyageHOFProps, VoyageHOFState> {

    private readonly tiny = TinyStore.getStore('voyagehof');

    constructor(props: VoyageHOFProps) {
        super(props);

        this.state = {
            voyageStats: undefined,
            errorMessage: undefined,
            allCrew: undefined,
            rankBy: this.tiny.getValue<RankMode>('rankMode', 'voyages') ?? 'voyages',
        };
    }

    componentDidMount() {
        fetch("/structured/crew.json")
            .then((response) => response.json())
            .then((allCrew) => this.setState({ allCrew }));
        fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry?type=voyage`)
            .then((response) => response.json())
            .then((voyageStats) => {
                this.setState({ voyageStats });
            })
            .catch((err) => {
                this.setState({ errorMessage: err });
            });
    }

    private readonly setRankBy = (rank: RankMode) => {
        this.tiny.setValue('rankMode', rank, true);
        this.setState({ ...this.state, rankBy: rank });
    };

    render() {
        const { rankBy, voyageStats, allCrew } = this.state;

        if (!this.state.voyageStats || !this.state.allCrew) {
            return (
                <div className="ui medium centered text active inline loader">
                    Loading hall of fame...
                </div>
            );
        }

        return (
            <>
                <Header as="h1" textAlign="center">
                    Voyage Hall of Fame
                </Header>
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
                    <Grid.Row>
                        {voyageStats?.allTime && (
                            <Grid.Column>
                                <VoyageStatsForPeriod
                                    rankBy={rankBy}
                                    period="allTime"
                                    stats={voyageStats?.allTime ?? []}
                                    allCrew={allCrew ?? []}

                                />
                            </Grid.Column>
                        )}
                        {voyageStats?.lastSixMonths && (
                            <Grid.Column>
                                <VoyageStatsForPeriod
                                    rankBy={rankBy}
                                    period="lastSixMonths"
                                    stats={voyageStats?.lastSixMonths ?? []}
                                    allCrew={allCrew ?? []}
                                />
                            </Grid.Column>
                        )}
                        <Grid.Column>
                            <VoyageStatsForPeriod
                                rankBy={rankBy}
                                period="lastThirtyDays"
                                stats={voyageStats?.lastThirtyDays ?? []}
                                allCrew={allCrew ?? []}
                            />
                        </Grid.Column>
                        <Grid.Column>
                            <VoyageStatsForPeriod
                                rankBy={rankBy}
                                period="lastSevenDays"
                                stats={voyageStats?.lastSevenDays ?? []}
                                allCrew={allCrew ?? []}
                            />
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </>
        );
    }
}

export default VoyageHOF;
