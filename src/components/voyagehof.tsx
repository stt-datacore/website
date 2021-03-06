import React, { Component } from 'react';
import { Table, Icon, Rating, Pagination, Dropdown, Form, Button, Checkbox, Header, Modal, Grid } from 'semantic-ui-react';
import { navigate } from 'gatsby';
import { getCoolStats } from '../utils/misc';

type VoyageHOFProps = {
};

type VoyageStatEntry = {
  crewSymbol: string;
  crewCount: number;
}

type VoyageHOFState = {
  voyageStats?: {
    allTime: VoyageStatEntry[];
    lastSevenDays: VoyageStatEntry[];
    lastThirtyDays: VoyageStatEntry[];
  };
  allCrew: any;
  errorMessage?: string;
};

const niceNamesForPeriod = {
  allTime: 'All Time',
  lastSevenDays: 'last 7 days',
  lastThirtyDays: 'last 30 days',
};

const VoyageStatsForPeriod = ({ period, stats, allCrew }) => {
  const rankedCrew = stats.map((s) => {
    const crew = allCrew.find((c) => c.symbol === s.crewSymbol);
    if (!crew) {
      return undefined;
    }
    return {
      ...s,
      ...crew
    }
  }).filter((s) => s);
  return (
    <>
    <Header textAlign="center">Voyage stats for {niceNamesForPeriod[period]}</Header>
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Rank</Table.HeaderCell>
          <Table.HeaderCell>Voyages</Table.HeaderCell>
          <Table.HeaderCell textAlign="right">Crew</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rankedCrew.map((crew, index) => (
            <Table.Row>
              <Table.Cell>
                <Header as='h2' textAlign='center'>{index+1}</Header>
              </Table.Cell>
              <Table.Cell>
                <Header as='h3' textAlign='center'>{crew.CrewCount}</Header>
              </Table.Cell>
              <Table.Cell textAlign="right">
                <div
										style={{
											display: 'grid',
											gridTemplateColumns: '40px auto',
											gridTemplateAreas: `'name icon'`,
											gridGap: '1px'
										}}
									>
										<div style={{ gridArea: 'name' }}>
											<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>{crew.name}</span>
										</div>
                    <div style={{ gridArea: 'icon' }}>
											<img width={48} src={`${process.env.GATSBY_ASSETS_URL}${crew.imageUrlPortrait}`} />
										</div>
									</div>
              </Table.Cell>
            </Table.Row>
          ))}
      </Table.Body>
    </Table>
    </>
  )
}

class VoyageHOF extends Component<VoyageHOFProps, VoyageHOFState> {
	constructor(props: VoyageHOFProps) {
		super(props);

		this.state = {
      voyageStats: undefined,
      errorMessage: undefined,
      allCrew: undefined,
    };
	}

	componentDidMount() {
    fetch('/structured/crew.json')
      .then(response => response.json())
      .then(allCrew => this.setState({ allCrew }));
    this.setState({ voyageStats: JSON.parse(`{"allTime":[{"crewSymbol":"0","CrewCount":6},{"crewSymbol":"1","CrewCount":5},{"crewSymbol":"data_cowboy_crew","CrewCount":4},{"crewSymbol":"data_mirror_crew","CrewCount":3}],"lastSevenDays":[{"crewSymbol":"0","CrewCount":6},{"crewSymbol":"1","CrewCount":5},{"crewSymbol":"data_cowboy_crew","CrewCount":4},{"crewSymbol":"data_mirror_crew","CrewCount":3}],"lastThirtyDays":[{"crewSymbol":"0","CrewCount":6},{"crewSymbol":"1","CrewCount":5},{"crewSymbol":"data_cowboy_crew","CrewCount":4},{"crewSymbol":"data_mirror_crew","CrewCount":3}]}`)})
    fetch(`${process.env.GATSBY_DATACORE_URL}api/telemetry?type=voyage`)
      .then(response => response.json())
      .then(voyageStats => {
        this.setState({ voyageStats });
      })
      .catch(err => {
        this.setState({ errorMessage: err });
      });
	}

	render() {
		const { voyageStats, allCrew } = this.state;

    if (!this.state.voyageStats || !this.state.allCrew) {
			return <div className='ui medium centered text active inline loader'>Loading hall of fame...</div>;
    }

		return (
			<>
        <Header as="h1" textAlign="center">Voyage Hall of Fame</Header>
				<Grid columns={3} divided>
          <Grid.Row>
            <Grid.Column>
              <VoyageStatsForPeriod period='allTime' stats={voyageStats.allTime} allCrew={allCrew} />
            </Grid.Column>
            <Grid.Column>
              <VoyageStatsForPeriod period='lastSevenDays' stats={voyageStats.lastSevenDays} allCrew={allCrew} />
            </Grid.Column>
            <Grid.Column>
              <VoyageStatsForPeriod period='lastThirtyDays' stats={voyageStats.lastThirtyDays} allCrew={allCrew} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
			</>
		);
	}
}

export default VoyageHOF;
