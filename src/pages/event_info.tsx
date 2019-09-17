import React, { Component } from 'react';
import { Container, Header, Label, Message, Icon, Table, Image } from 'semantic-ui-react';
import { Link } from 'gatsby';

import Layout from '../components/layout';

type EventInfoPageProps = {};

type EventInfoPageState = {
	event_data?: any;
	event_name?: string;
	errorMessage?: string;
};

class EventInfoPage extends Component<EventInfoPageProps, EventInfoPageState> {
	constructor(props: EventInfoPageProps) {
		super(props);

		this.state = {
			event_name: undefined,
			event_data: undefined
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('eventname')) {
			let event_name = urlParams.get('eventname');
			this.setState({ event_name });

			fetch('/structured/event_instances.json')
				.then(response => response.json())
				.then(event_instances => {
					fetch('/structured/event_leaderboards.json')
						.then(response => response.json())
						.then(event_leaderboards => {
							let ev_inst = event_instances.find(ev => ev.event_name === event_name);
							let ev_lead = ev_inst ? event_leaderboards.find(ev => ev.instance_id === ev_inst.instance_id) : undefined;

							if (ev_inst === undefined || ev_lead === undefined) {
								this.setState({ errorMessage: 'Invalid event name, or data not yet available for this event.' });
							} else {
								this.setState({ event_data: { ev_inst, ev_lead } });
							}
						});
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	render() {
		const { event_name, errorMessage, event_data } = this.state;

		if (event_name === undefined || event_data === undefined || errorMessage !== undefined) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Header as="h4">Event information</Header>
						{errorMessage && (
							<Message negative>
								<Message.Header>Unable to load event information</Message.Header>
								<pre>{errorMessage.toString()}</pre>
							</Message>
						)}
						{!errorMessage && (
							<div>
								<Icon loading name="spinner" /> Loading...
							</div>
						)}
					</Container>
				</Layout>
			);
		}

		console.log(event_data);

		return (
			<Layout>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Header as="h3">{event_data.ev_inst.event_name}</Header>
					<Image size="large" src={`/media/assets/${event_data.ev_inst.image}`} />

                    <Header as="h4">Leaderboard</Header>
					<Table celled selectable striped collapsing unstackable compact="very">
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell width={3}>Name</Table.HeaderCell>
								<Table.HeaderCell width={1}>Rank</Table.HeaderCell>
								<Table.HeaderCell width={1}>Score</Table.HeaderCell>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{event_data.ev_lead.leaderboard.map((member, idx) => (
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
													src={`/media/assets/${
														member.avatar
															? member.avatar.file.substr(1).replace(/\//g, '_') + '.png'
															: 'crew_portraits_cm_empty_sm.png'
													}`}
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
												Level {member.level}
												{member.last_update && (
													<Label size="tiny">
														Last profile upload: {new Date(Date.parse(member.last_update)).toLocaleDateString()}
													</Label>
												)}
											</div>
										</div>
									</Table.Cell>
									<Table.Cell>{member.rank}</Table.Cell>
									<Table.Cell>{member.score}</Table.Cell>
								</Table.Row>
							))}
						</Table.Body>
					</Table>
				</Container>
			</Layout>
		);
	}
}

export default EventInfoPage;
