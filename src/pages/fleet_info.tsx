import React, { Component } from 'react';
import { Container, Header, Label, Message, Image, Table } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';

type FleetInfoPageProps = {};

type FleetInfoPageState = {
	fleet_id?: string;
	fleet_data?: any;
	errorMessage?: string;
};

class FleetInfoPage extends Component<FleetInfoPageProps, FleetInfoPageState> {
	constructor(props: FleetInfoPageProps) {
		super(props);

		this.state = {
			fleet_id: undefined,
			fleet_data: undefined
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('fleetid')) {
			let fleet_id = urlParams.get('fleetid');
			this.setState({ fleet_id });

			fetch('https://datacore.azurewebsites.net/api/fleet_info?fleetid=' + fleet_id)
				.then(response => response.json())
				.then(fleetData => {
					this.setState({ fleet_data: fleetData });
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	render() {
		const { fleet_id, errorMessage, fleet_data } = this.state;

		if (fleet_id === undefined || fleet_data === undefined || errorMessage !== undefined) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Header as="h4">Fleet information</Header>
						{errorMessage && (
							<Message negative>
								<Message.Header>Unable to load fleet profile</Message.Header>
								<pre>{errorMessage.toString()}</pre>
							</Message>
						)}
						<p>
							Are you looking to share your player profile? Go to the <Link to={`/voyage`}>Player Tools page</Link> to
							upload your player.json and access other useful player tools.
						</p>
					</Container>
				</Layout>
			);
		}

		// sinsignia "badge1", nicon_index: 4

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Header as="h3">
						Fleet <i>{fleet_data.name}</i>
					</Header>
					<p>{fleet_data.description}</p>
					<Label size="tiny">Created: {new Date(fleet_data.created).toLocaleDateString()}</Label>
					<Label size="tiny">
						Size: {fleet_data.cursize} / {fleet_data.maxsize}
					</Label>
					<Label size="tiny">Starbase: {fleet_data.nstarbase_level}</Label>
					<Label size="tiny">
						Enrollment: {fleet_data.enrollment} (min level: {fleet_data.nmin_level})
					</Label>
                    <br/><br/>
					<p><b>Admiral's MOTD:</b> {fleet_data.motd}</p>
					<Header as="h4">Members</Header>

					<Table celled selectable striped collapsing unstackable compact="very">
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell width={3}>Name</Table.HeaderCell>
								<Table.HeaderCell width={1}>Rank</Table.HeaderCell>
								<Table.HeaderCell width={1}>Profile</Table.HeaderCell>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{fleet_data.members.map((member, idx) => (
								<Table.Row key={idx}>
									<Table.Cell>
										<div
											style={{
												display: 'grid',
												gridTemplateColumns: '60px auto',
												gridTemplateAreas: `'icon stats' 'icon description'`,
												gridGap: '1px'
											}}
										>
											<div style={{ gridArea: 'icon' }}>
												<img
													width={48}
													src={`/media/assets/${member.crew_avatar || 'crew_portraits_cm_empty_sm.png'}`}
												/>
											</div>
											<div style={{ gridArea: 'stats' }}>
												<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
													{member.last_update ? (
														<Link to={`/profile?dbid=${member.dbid}`}>{member.display_name}</Link>
													) : (
														<span>{member.display_name}</span>
													)}
												</span>
											</div>
											<div style={{ gridArea: 'description' }}>
												{member.last_update && (
													<Label size="tiny">
														Last profile upload: {new Date(Date.parse(member.last_update)).toLocaleDateString()}
													</Label>
												)}
											</div>
										</div>
									</Table.Cell>
									<Table.Cell>{member.rank}</Table.Cell>
									<Table.Cell>
										{member.last_update
											? `Last profile upload: ${new Date(Date.parse(member.last_update)).toLocaleDateString()}`
											: 'Never'}
									</Table.Cell>
								</Table.Row>
							))}
						</Table.Body>
					</Table>
				</Container>
			</Layout>
		);
	}
}

export default FleetInfoPage;
