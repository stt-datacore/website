import React, { Component } from "react";
import {
    Table, Dropdown, Header, Grid, Button, DropdownItemProps,
    Step
} from "semantic-ui-react";
import { RankMode } from "../../utils/misc";
import { CrewMember } from "../../model/crew";
import { PlayerCrew } from "../../model/player";
import { TinyStore } from "../../utils/tiny";
import { GlobalContext } from "../../context/globalcontext";
import { OwnedLabel } from "../crewtables/commonoptions";
import { IRosterCrew } from "../crewtables/model";
import ItemDisplay from "../itemdisplay";
import { RawVoyageRecord } from "../../utils/voyageutils";
import { navigate } from "gatsby";
import { VoyageHOFPeriod, VoyageStatEntry, niceNamesForPeriod, VoyageHOFProps, VoyageHOFState, HOFViewModes } from "../../model/hof";
import { HofDetails, formatNumber } from "./hofdetails";
import { CrewDropDown } from "../base/crewdropdown";
import { DEFAULT_MOBILE_WIDTH } from "../hovering/hoverstat";
import { VoyageStatsForPeriod } from "./periodstats";


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
            glanceDays: this.tiny.getValue<number>('glanceDays', 28) ?? 28,
            viewMode: 'rankings',
            rows: []
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

        if (!crew?.length) {
            this.setState({ ...this.state, crewSymbol: crew, rawVoyages: undefined, viewMode: 'rankings' });
        }
        else {
            this.setState({ ...this.state, crewSymbol: crew, rawVoyages: undefined });
        }
    }

    readonly setGlanceDays = (glanceDays: number) => {
        this.tiny.setValue('glanceDays', glanceDays, true);
        this.setState({ ...this.state, glanceDays, rawVoyages: undefined });
    }

    readonly setSelection = (crew?: number[]) => {
        const { crew: allCrew } = this.context.core;
        const maps = allCrew?.filter(f => crew?.includes((f as PlayerCrew).id)).map(m => (m as PlayerCrew).symbol);
        this.setGlance(maps);
    }

    private readonly setRankBy = (rankBy: RankMode) => {
        this.tiny.setValue('rankMode', rankBy, true);
        this.setState({ ...this.state, rankBy });
    };

    private readonly setViewMode = (viewMode: HOFViewModes) => {
        this.setState({ ...this.state, viewMode })
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
            this.setState({ ... this.state, crewSymbol: undefined, viewMode: 'rankings' })
        }
        else {
            navigate(`/hall_of_fame?crew=${current?.join(",")}`);
            this.setState({ ... this.state, crewSymbol: current, viewMode: 'details' })
        }

    }

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

    readonly loadCrew = (crew: string[]) => {

        if (!crew?.length) {
            this.setState({ ... this.state, rawVoyages: undefined, viewMode: 'rankings' });
            return;
        }

        fetch(`${process.env.GATSBY_DATACORE_URL}api/voyagesByCrew?opand=1&crew=${crew.join(",")}&days=${this.state.glanceDays}`)
            .then((response) => response.json())
            .then((rawVoyages: RawVoyageRecord[]) => {
                let codict = {} as { [key: string]: RawVoyageRecord }
                rawVoyages.forEach((voy) => {
                    if (typeof voy.voyageDate === 'string') {
                        voy.voyageDate = new Date(voy.voyageDate);
                    }
                    codict[voy.voyageDate.getTime().toString()] = voy;
                })
                rawVoyages = Object.values(codict);
                this.setState({ ... this.state, rawVoyages, viewMode: 'details' });
            });

    }

    componentDidUpdate(prevProps: Readonly<VoyageHOFProps>, prevState: Readonly<VoyageHOFState>, snapshot?: any): void {
        if (prevState.crewSymbol !== this.state.crewSymbol || prevState.glanceDays !== this.state.glanceDays) {
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
                const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;
                let rows = [] as { stats: VoyageStatEntry[], key: VoyageHOFPeriod }[][];
                let stats = Object.keys(niceNamesForPeriod)?.filter(p => !!p?.length);

                while (stats.length) {
                    rows.push(stats.splice(0, isMobile ? 1 : 2).map(p => { return { stats: (voyageStats as Object)[p] as VoyageStatEntry[], key: p as VoyageHOFPeriod } } ))
                }

                this.setState({ ...this.state, voyageStats, rows });

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

    render() {
        const { crewSymbol, rawVoyages, rankBy, voyageStats, glanceDays, viewMode, rows } = this.state;
        const { crew: allCrew } = this.context.core;
        const { t } = this.context.localized;

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

        const filteredCrew = this.getFilteredCrew();
        const selection = filteredCrew?.filter(s => crewSymbol?.includes(s.symbol)).map(m => m?.id ?? 0);
        const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

        const glanceDaysChoices = [
            {
                key: 'day1',
                value: 1,
                text: "1 Day"
            },
            {
                key: 'day2',
                value: 2,
                text: "2 Days"
            },
            {
                key: 'week1',
                value: 7,
                text: "1 Week"
            },
            {
                key: 'week2',
                value: 14,
                text: "2 Weeks"
            },
            {
                key: 'week3',
                value: 21,
                text: "3 Weeks"
            },
            {
                key: 'week4',
                value: 28,
                text: "4 Weeks"
            },
            // {
            //     key: 'days30',
            //     value: 30,
            //     text: "30 Days"
            // },
            // {
            //     key: 'days45',
            //     value: 45,
            //     text: "45 Days"
            // },
            // {
            //     key: 'days60',
            //     value: 60,
            //     text: "60 Days"
            // }
        ] as DropdownItemProps[];

        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center', justifyContent: 'center'}}>
                <Header as="h1" textAlign="center">
                    Voyage Hall of Fame
                </Header>


                <Step.Group fluid>
                    <Step active={viewMode === 'rankings'} onClick={() => this.setViewMode('rankings')}>
                        <Step.Content>
                            <Step.Title>Hall Of Fame Rankings</Step.Title>
                            <Step.Description>Show rankings for various time-periods</Step.Description>
                        </Step.Content>
                    </Step>

                    <Step active={viewMode === 'details'} onClick={() => this.setViewMode('details')}>
                        <Step.Content>
                            <Step.Title>Voyage Crew Details</Step.Title>
                            <Step.Description>View statistics for selected crew</Step.Description>
                        </Step.Content>
                    </Step>
    			</Step.Group>
                {<div style={{display: viewMode === 'details' ? 'flex' : 'none', width: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
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
                        <div style={{margin: "0.5em"}}>
                            <h4>Details Time Frame:</h4>
                            <Dropdown
                                placeholder={"Select a timeframe to view..."}
                                fluid
                                options={glanceDaysChoices}
                                value={glanceDays}
                                onChange={(e, { value }) => this.setGlanceDays(value as number)}
                            />

                        </div>

                    </div>

                    <HofDetails crewClick={this.clickCrew} hofState={this.state} />

                    {!!crewSymbol?.length && !!rawVoyages &&
                    <Button style={{margin: "0.5em"}} onClick={(e) => this.setGlance()}>{"Clear Details View"}</Button>
                    }

                </div>}

                {<div style={{display: viewMode === 'rankings' ? undefined : 'none'}}>
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
                    <span>{t('hof.rank_by.rank_by_colon')}&nbsp;</span>
                    <Dropdown
                        options={[
                            {
                                key: "voyages",
                                value: "voyages",
                                text: t('hof.rank_by.voyages'),
                            },
                            {
                                key: "duration",
                                value: "duration",
                                text: t('hof.rank_by.duration'),
                            },
                            {
                                key: "maxdur",
                                value: "maxdur",
                                text: t('hof.rank_by.maxdur'),
                            },
                            {
                                key: "voydur",
                                value: "voydur",
                                text: t('hof.rank_by.voydur'),
                            },
                            {
                                key: "voymaxdur",
                                value: "voymaxdur",
                                text: t('hof.rank_by.voymaxdur'),
                            },
                        ]}
                        value={rankBy}
                        onChange={(e, { value }) => this.setRankBy(value as RankMode)}
                    />
                </div>
                <Grid columns={2} divided>
                    {rows.map((row, rowidx) => {

                        return (
                            <Grid.Row key={`stats_row_${rowidx}`}>

                                {row.map((stats, colidx) => {

                                    if (!niceNamesForPeriod[stats.key]) return <React.Fragment key={`stats_col_${rowidx}_${colidx}`}></React.Fragment>
                                    return (
                                        <Grid.Column key={`stats_col_${rowidx}_${colidx}`}>
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

                </div>}
            </div>
        );
    }
}

export default VoyageHOF;
