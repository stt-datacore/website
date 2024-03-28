import React, { Component } from 'react';
import { Header, Label, Message, Icon, Table, Image } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { ResponsiveLine } from '@nivo/line'
import themes from '../components/nivo_themes';
import ErrorBoundary from '../components/errorboundary';

import { CrewBonuses } from '../model/player';
import DataPageLayout from '../components/page/datapagelayout';

type EventInfoPageProps = {};

type EventInfoPageState = {
	event_data?: any;
	event_instance?: string;
	errorMessage?: string;
	event_log?: any[];
};

class EventInfoPage extends Component<EventInfoPageProps, EventInfoPageState> {
	constructor(props: EventInfoPageProps) {
		super(props);

		this.state = {
			event_instance: undefined,
			event_data: undefined,
			event_log: undefined
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('instance_id')) {
			let event_instance = urlParams.get('instance_id');			
			this.setState({ event_instance: event_instance ?? undefined });

			fetch('/structured/event_instances.json')
				.then(response => response.json())
				.then(event_instances => {
					fetch('/structured/event_leaderboards.json')
						.then(response => response.json())
						.then(event_leaderboards => {
							fetch('/structured/event_fleaderboards.json')
								.then(response => response.json())
								.then(event_fleaderboards => {
									let ev_inst = event_instances.find(ev => ev.instance_id === Number.parseInt(event_instance ?? "0"));
									let ev_lead = ev_inst ? event_leaderboards.find(ev => ev.instance_id === ev_inst.instance_id) : undefined;
									let ev_flead = ev_inst ? event_fleaderboards.find(ev => ev.fixed_instance_id === ev_inst.fixed_instance_id) : undefined;

									if (ev_inst === undefined || ev_lead === undefined) {
										this.setState({ errorMessage: 'Invalid event name, or data not yet available for this event.' });
									} else {
										if (ev_inst.event_details) {
											fetch(`/structured/events/${ev_inst.instance_id}.json`)
												.then(response => response.json())
												.then(event_details => {
													this.setState({ event_data: { ev_inst, ev_lead, ev_flead, event_details } });
												});

											fetch(`/eventlogs/${ev_inst.instance_id}.json`)
												.then(response => response.json())
												.then(event_log => {
													this.setState({ event_log });
												}).catch(err => {
													// No log for this event
													this.setState({ event_log: undefined });
												});
										} else {
											this.setState({ event_data: { ev_inst, ev_lead, ev_flead } });
										}
									}
								});
						});
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	renderEventLog() {
		const { event_log } = this.state;

		if (event_log === undefined) {
			return <span />;
		}

		let data_formatted = event_log.slice(-1)[0].leaderboard.slice(0, 10).map(entry => ({
			id: entry.display_name,
			dbid: entry.dbid,
			data: []
		}));

		event_log.forEach(entry => {
			data_formatted.forEach(line => {
				let found = entry.leaderboard.find(l => l.dbid === line.dbid);
				if (found) {
					line.data.push({
						x: new Date(entry.date),
						y: found.score
					});
				}
			})
		});

		return (
			<ErrorBoundary>
				<>
				<h3>Score evolution</h3>
				<div style={{ height: '380px' }}>
					<ResponsiveLine
						data={data_formatted}
						theme={themes.dark}
						enableGridX={false}
						enableCrosshair={false}
						enablePoints={false}
						xScale={{
							type: 'time',
							precision: 'minute'
						}}
						yScale={{ type: 'linear', min: 'auto', max: 'auto', reverse: false }}
						curve="monotoneX"
						margin={{ top: 50, right: 190, bottom: 50, left: 100 }}
						axisBottom={{
							format: '%b %d %H:%M',
							tickValues: 'every hour',
							legend: 'time scale',
							legendOffset: 5,
						}}
						axisLeft={{
							//orient: 'left',
							tickSize: 5,
							tickPadding: 5,
							tickRotation: 0,
							legend: 'score',
							legendOffset: -70,
							legendPosition: 'middle'
						}}
						legends={[
							{
								anchor: 'bottom-right',
								direction: 'column',
								justify: false,
								translateX: 120,
								translateY: 0,
								itemsSpacing: 2,
								itemWidth: 100,
								itemHeight: 20,
								itemDirection: 'left-to-right',
								symbolSize: 20,
								effects: [
									{
										on: 'hover',
										style: {
											itemOpacity: 1,
										},
									},
								],
							},
						]}
						isInteractive={true}
						useMesh={true}
						enableSlices="x"
					/>
				</div>
				</>
			</ErrorBoundary>);
	}

	renderEventDetails() {
		const { event_data } = this.state;

		if (event_data === undefined || event_data.event_details === undefined) {
			return <span />;
		}

		let event = event_data.event_details;

		return (
			<div>
				<Message icon warning>
					<Icon name='exclamation triangle' />
					<Message.Content>
						<Message.Header>Work in progress!</Message.Header>
						This section is under development and not fully functional yet.
					</Message.Content>
				</Message>
				<p>{event.description}</p>
				<p>{event.rules}</p>

				<Label>{event.bonus_text}</Label>

				{event.content.map((cnt, idx) => {
					let crew_bonuses: CrewBonuses = {};
					if (cnt.shuttles) {
						crew_bonuses = cnt.shuttles[0].crew_bonuses;
					} else if (cnt.crew_bonuses) {
						crew_bonuses = cnt.crew_bonuses;
					} else if (cnt.bonus_crew && cnt.bonus_traits) {
						// Skirmishes
						crew_bonuses = {};
						cnt.bonus_crew.forEach(element => {
							crew_bonuses[element] = 10;
						});

						// TODO: crew from traits
					} else if (cnt.special_crew) {
						// Expeditions
						crew_bonuses = {};
						cnt.special_crew.forEach(element => {
							crew_bonuses[element] = 50;
						});
					}
					return (
						<div key={idx}>
							<Header as='h5'>Phase {idx + 1}</Header>
							<Label>Type: {cnt.content_type}</Label>
							<Header as='h6'>Bonus crew</Header>
							{crew_bonuses && (
								<p>
									{Object.entries(crew_bonuses).map(([bonus, val], idx) => (
										<span key={idx}>
											{bonus} ({val}),
										</span>
									))}
								</p>
							)}
						</div>
					);
				})}

				<Header as='h4'>Threshold rewards</Header>
				<Table celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={2}>Points</Table.HeaderCell>
							<Table.HeaderCell width={4}>Reward</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{event.threshold_rewards.filter(reward => reward.rewards && reward.rewards.length > 0).map((reward, idx) => (
							<Table.Row key={idx}>
								<Table.Cell>{reward.points}</Table.Cell>
								<Table.Cell>
									{reward.rewards[0].quantity} {reward.rewards[0].full_name}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>

				<Header as='h4'>Ranked rewards</Header>
				<Table celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={2}>Ranks</Table.HeaderCell>
							<Table.HeaderCell width={4}>Rewards</Table.HeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{event.ranked_brackets.map((bracket, idx) => (
							<Table.Row key={idx}>
								<Table.Cell>
									{bracket.first} - {bracket.last}
								</Table.Cell>
								<Table.Cell>
									{bracket.rewards.map((reward, idx) => (
										<span key={idx}>
											{reward.quantity} {reward.full_name},
										</span>
									))}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>

				<Header as='h4'>Quest</Header>

				{event.quest ? event.quest.map((quest, idx) => (
					<div key={idx}>
						{quest && quest.screens && quest.screens.map((screen, idx) => (
							<p key={idx}>
								<b>{screen.speaker_name}: </b>
								{screen.text}
							</p>
						))}
					</div>
				)) : <span>Mini-events don't include quest information.</span>}

				<Message>
					<Message.Header>TODO: Leaderboard out of date</Message.Header>
					If this event is currently active, the leaderboard below is out of date (updated only a couple of times a week).
				</Message>
			</div>
		);
	}

	render() {
		const { event_instance: event_instace, errorMessage, event_data } = this.state;

		if (event_instace === undefined || event_data === undefined || errorMessage !== undefined) {
			return (
				<DataPageLayout pageTitle='Event information'>
					<React.Fragment>
					{errorMessage && (
						<Message negative>
							<Message.Header>Unable to load event information</Message.Header>
							<pre>{errorMessage.toString()}</pre>
						</Message>
					)}
					{!errorMessage && (
						<div>
							<Icon loading name='spinner' /> Loading...
						</div>
					)}
					</React.Fragment>
				</DataPageLayout>
			);
		}

		return (
			<DataPageLayout pageTitle={event_data.ev_inst.event_name}>
				<React.Fragment>
				<Image size='large' src={`${process.env.GATSBY_ASSETS_URL}${event_data.ev_inst.image}`} />

				{this.renderEventDetails()}

				{this.renderEventLog()}

				<Header as='h4'>Leaderboard</Header>
				<Table celled selectable striped collapsing unstackable compact='very'>
					<Table.Header>
						<Table.Row>
							<Table.HeaderCell width={3}>Name</Table.HeaderCell>
							<Table.HeaderCell width={1}>Rank</Table.HeaderCell>
							<Table.HeaderCell width={1}>Score</Table.HeaderCell>
							<Table.HeaderCell width={2}>Fleet</Table.HeaderCell>
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
										}}>
										<div style={{ gridArea: 'icon' }}>
											<img
												width={48}
												src={`${process.env.GATSBY_ASSETS_URL}${member.avatar ? member.avatar.file.slice(1).replace(/\//g, '_') + '.png' : 'crew_portraits_cm_empty_sm.png'
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
												<Label size='tiny'>Last profile upload: {new Date(Date.parse(member.last_update)).toLocaleDateString()}</Label>
											)}
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>{member.rank}</Table.Cell>
								<Table.Cell>{member.score}</Table.Cell>
								<Table.Cell>
									{member.fleetname ? <Link to={`/fleet_info?fleetid=${member.fleetid}`}>
										<b>{member.fleetname}</b>
									</Link> : <span>-</span>}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table>

				{event_data.ev_flead &&
					<div>
						<Message>
							<Message.Header>TODO: Fleet Leaderboard is experimental</Message.Header>
							This data may be incomplete or out of date!
						</Message>

						<Header as='h4'>Fleet leaderboard</Header>
						<Table celled selectable striped collapsing unstackable compact='very'>
							<Table.Header>
								<Table.Row>
									<Table.HeaderCell width={3}>Name</Table.HeaderCell>
									<Table.HeaderCell width={1}>Rank</Table.HeaderCell>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{event_data.ev_flead.fleet_ranks.map((fleet, idx) => (
									<Table.Row key={idx}>
										<Table.Cell>{fleet.fleet_rank}</Table.Cell>
										<Table.Cell>
											<Link to={`/fleet_info?fleetid=${fleet.id}`}>
												<b>{fleet.name}</b>
											</Link>
										</Table.Cell>
									</Table.Row>
								))}
							</Table.Body>
						</Table>
					</div>}
				</React.Fragment>
			</DataPageLayout>
		);
	}
}

export default EventInfoPage;
