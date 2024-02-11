import React, { Component } from 'react';
import { Header, Label, Message, Icon, Table, Item, Image, Input, FormInput, Button, Form } from 'semantic-ui-react';
import { Link } from 'gatsby';
import DataPageLayout from '../page/datapagelayout';
import { GlobalContext } from '../../context/globalcontext';
import { Fleet } from '../../model/fleet';
import { EventInstance } from '../../model/events';
import { TinyStore } from '../../utils/tiny';
import { FleetResponse } from '../../model/fleet';
import { Faction } from '../../model/player';
import { StaticFaction } from '../../model/shuttle';

type FleetInfoPageProps = {};

type FleetInfoPageState = {
	fleet_id?: number;
	fleet_data?: Fleet;
	errorMessage?: string;
	errorTitle?: string;
	factions?: StaticFaction[];
	events?: EventInstance[];
	access_token?: string;
	username?: string;
	password?: string;
};
//
class FleetInfoPage extends Component<FleetInfoPageProps, FleetInfoPageState> {
	static contextType = GlobalContext;
	context!: React.ContextType<typeof GlobalContext>;

	private _tiny: TinyStore;
	
	protected get tiny(): TinyStore {
		return this._tiny;
	}

	constructor(props: FleetInfoPageProps) {
		super(props);
		this.state = {
			fleet_id: undefined,
			fleet_data: undefined,
			factions: undefined,
			events: undefined,
			access_token: undefined
			//errorTitle: "Fleet Info Returning Soon!!",
			//errorMessage: "Fleet info will be returning soon, after some server upgrades. Watch this space!"
		};

	}

	componentDidMount() {

		const { playerData } = this.context.player;
		
		if (!playerData) return;
	
		this._tiny = TinyStore.getStore(`fleet_info_dbid_${playerData.player.dbid}`);
	
		this.setState({
			fleet_id: playerData.player.fleet.id,
			fleet_data: undefined,
			factions: this.context.core.factions,
			events: this.context.core.event_instances,
			access_token: this.tiny.getValue<string | undefined>('access_token', undefined)
			//errorTitle: "Fleet Info Returning Soon!!",
			//errorMessage: "Fleet info will be returning soon, after some server upgrades. Watch this space!"
		});

		this.refreshData();
	}

	componentDidUpdate(prevProps: Readonly<FleetInfoPageProps>, prevState: Readonly<FleetInfoPageState>, snapshot?: any): void {
		if (prevState.access_token !== this.state.access_token) {
			this.refreshData();
		}
	}

	private refreshData() {
		const { access_token } = this.state;
		const { playerData } = this.context.player;

		if (!access_token || !playerData) {
			return;
		}
	
		let fleet_id = playerData.player.fleet.id;
		this.setState({ ... this.state, fleet_id });

		fetch(`${process.env.GATSBY_DATACORE_URL}api/fleet_info?fleetid=` + fleet_id, {
				method: 'POST',
				body: JSON.stringify({ access_token }),
				headers: {
					'Content-type': "application/json"
				}
			})
			.then(response => response.json())
			.then((fleetData: FleetResponse) => {
				this.tiny.setValue('access_token', fleetData.access_token, true);
				this.setState({ fleet_data: fleetData.fleet, access_token: fleetData.access_token });
			})
			.catch(err => {
				this.setState({ errorMessage: err });
			});

	}

	readonly signinClick = () => {
		const { fleet_id, username, password } = this.state;

		fetch(`${process.env.GATSBY_DATACORE_URL}api/fleet_info?fleetid=` + fleet_id, {
			method: 'POST',
			body: JSON.stringify({ username, password }),
			headers: {
				'Content-type': "application/json"
			}
		})
		.then(response => response.json())
		.then((fleetData: FleetResponse) => {
			this.setState({ fleet_data: fleetData.fleet, access_token: fleetData.access_token, username: undefined, password: undefined });
		})
		.catch(err => {
			this.setState({ errorMessage: err, username: undefined, password: undefined, access_token: undefined });
		});
	}

	render() {
		const { fleet_id, errorMessage, errorTitle, fleet_data, factions, events, access_token, username, password } = this.state;
		const { playerData } = this.context.player;
		
		if (!playerData) return <></>;

		if (!access_token) {

			return (<React.Fragment>

				<Form>
				<div className={'ui segment'}
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
						justifyContent: 'left'
					}}>
					<h3>{playerData.player.character.display_name} Sign In:</h3>
					<i>
						<p>
							The sign-in must match the DBID of the current player data. 
						</p>
						<p>
							This will grant you an access token to view your fleet information that should stay current for quite a while (or until you clear your browser data.)
						</p>
						<p>						
							<b>This token does not enable automatically getting player data! That process is too expensive, and the player can't be known before-hand, anyway.</b>
						</p>						 
					</i>
					<h4>Username:</h4>
					<Input
						size='large' 						
						id={`u${playerData.player.dbid}_username`}
						value={username}
						onChange={(e, { value }) => this.setState({ ... this.state, username: value })} 
						/>
					<h4>Password:</h4>
					<Input						
						size='large' 						
						id={`u${playerData.player.dbid}_password`}
						type='password'
						value={password}
						onChange={(e, { value }) => this.setState({ ... this.state, password: value })} 
						/>
					<br />
					<Button onClick={(e) => this.signinClick()}>Sign In</Button>
				</div>
				</Form>
			</React.Fragment>)
		}

		if (fleet_id === undefined || fleet_data === undefined || errorMessage !== undefined) {
			return (
				<React.Fragment>
				{errorMessage && (
					<Message style={{backgroundColor: 'darkorange'}}>
						<Message.Header>{errorTitle}</Message.Header>
						<pre>{errorMessage.toString()}</pre>
					</Message>
				)}
				{!errorMessage && (
					<div>
						<Icon loading name="spinner" /> Loading...
					</div>
				)}
				{/* <p>
					Go back to <Link to={`/profile/?dbid=${this.context.player.playerData?.player.dbid}`}>Your Profile</Link>
				</p> */}
				</React.Fragment>
			);
		}

		let imageUrl = 'icons_icon_faction_starfleet.png';
		if (factions && factions[fleet_data.nicon_index]) {
			imageUrl = factions[fleet_data.nicon_index].icon;
		}

		let event1: EventInstance | undefined = undefined;
		let event2: EventInstance | undefined = undefined;
		let event3: EventInstance | undefined = undefined;

		if (events) {
			if (events[0].event_name === fleet_data.leaderboard[0].event_name) {
				event1 = events[0];
				event2 = events[1];
				event3 = events[2];
			} else {
				event1 = events.find(ev => ev.event_name === fleet_data.leaderboard[0].event_name);
				event2 = events.find(ev => ev.event_name === fleet_data.leaderboard[1].event_name);
				event3 = events.find(ev => ev.event_name === fleet_data.leaderboard[2].event_name);
			}
		}

		return (
			<React.Fragment>
				<Button onClick={(e) => this.setState({ ...this.state, access_token: undefined })}>Clear Token</Button>
			<Item.Group>
				<Item>
					<Item.Image size="tiny" src={`${process.env.GATSBY_ASSETS_URL}${imageUrl}`} />

					<Item.Content>
						<Item.Header>{fleet_data.name}</Item.Header>
						<Item.Meta>
							<Label>Starbase level: {fleet_data.nstarbase_level}</Label>
							<Label>
								Size: {fleet_data.cursize} / {fleet_data.maxsize}
							</Label>
							<Label>Created: {new Date(fleet_data.created).toLocaleDateString()}</Label>
							<Label>
								Enrollment {fleet_data.enrollment} (min level: {fleet_data.nmin_level})
								</Label>
						</Item.Meta>
					</Item.Content>
				</Item>
			</Item.Group>

			{event1 && <table>
				<tbody>
					<tr>
						<th>
							{' '}
							<Link to={`/event_info?instance_id=${event1?.instance_id}`}>
								{fleet_data.leaderboard[0].event_name}
							</Link>
						</th>
						<th>
							{' '}
							<Link to={`/event_info?instance_id=${event2?.instance_id}`}>
								{fleet_data.leaderboard[1].event_name}
							</Link>
						</th>
						<th>
							{' '}
							<Link to={`/event_info?instance_id=${event3?.instance_id}`}>
								{fleet_data.leaderboard[2].event_name}
							</Link>
						</th>
					</tr>
					<tr>
						<td><Image size="medium" src={`${process.env.GATSBY_ASSETS_URL}${event1?.image}`} /></td>
						<td><Image size="medium" src={`${process.env.GATSBY_ASSETS_URL}${event2?.image}`} /></td>
						<td><Image size="medium" src={`${process.env.GATSBY_ASSETS_URL}${event3?.image}`} /></td>
					</tr>
					<tr>
						<td align="center">Fleet rank: {fleet_data.leaderboard[0].fleet_rank}</td>
						<td align="center">Fleet rank: {fleet_data.leaderboard[1].fleet_rank}</td>
						<td align="center">Fleet rank: {fleet_data.leaderboard[2].fleet_rank}</td>
					</tr>
				</tbody>
			</table>}

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
											src={`${process.env.GATSBY_ASSETS_URL}${member.crew_avatar || 'crew_portraits_cm_empty_sm.png'}`}
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
			</React.Fragment>
		);
	}
}

export default FleetInfoPage;
