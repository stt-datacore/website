import React, { Component } from 'react';
import { Header, Label, Message, Icon, Table, Item, Image, Input, FormInput, Button, Form } from 'semantic-ui-react';
import { Link } from 'gatsby';

import { GlobalContext } from '../../context/globalcontext';
import { Fleet, Member } from '../../model/fleet';
import { EventInstance } from '../../model/events';
import { TinyStore } from '../../utils/tiny';
import { FleetResponse } from '../../model/fleet';
import { StaticFaction } from '../../model/shuttle';
import { ColorName } from './colorname';
import { appelate, printShortDistance } from '../../utils/misc';
import { exportMembers } from '../../utils/fleet';
import { downloadData } from '../../utils/crewutils';

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
	sortField?: string;
	sortDirection?: 'ascending' | 'descending';
};
//
const rankOrder = ['Admiral', 'Squadron Leader', 'Officer', 'Member'];

class FleetInfoPage extends Component<FleetInfoPageProps, FleetInfoPageState> {
	static contextType = GlobalContext;
	declare context: React.ContextType<typeof GlobalContext>;

	private _tiny?: TinyStore;

	protected get tiny(): TinyStore | undefined {
		return this._tiny;
	}

	constructor(props: FleetInfoPageProps) {
		super(props);
		this.state = {
			fleet_id: undefined,
			fleet_data: undefined,
			factions: undefined,
			events: undefined,
			access_token: undefined,
			username: '',
			password: '',
			//errorTitle: "Fleet Info Returning Soon!!",
			//errorMessage: "Fleet info will be returning soon, after some server upgrades. Watch this space!"
		};

	}

	componentDidMount() {
		const { playerData } = this.context.player;
		if (!playerData) return;

		const tiny = this._tiny = TinyStore.getStore(`fleet_info_dbid_${playerData.player.dbid}`);

		this.setState({
			fleet_id: playerData.player.fleet.id,
			fleet_data: undefined,
			factions: this.context.core.factions,
			events: this.context.core.event_instances,
			access_token: tiny.getValue<string | undefined>('access_token', undefined)
		});

		this.refreshData();
	}

	componentDidUpdate(prevProps: Readonly<FleetInfoPageProps>, prevState: Readonly<FleetInfoPageState>, snapshot?: any): void {
		if (prevState.access_token !== this.state.access_token && ((prevState.username && prevState.password) || !prevState.fleet_id)) {
			this.refreshData();
		}
	}

	private processData(fleet?: Fleet) {
		fleet ??= this.state.fleet_data;
		if (!fleet) return;
		fleet.members.forEach((member) => {
			if (member.crew_avatar.startsWith("crew_portraits") && !member.crew_avatar.endsWith("_sm.png")) {
				member.crew_avatar = member.crew_avatar.replace("_icon.png", "_sm.png");
			}
			if (member.rank === "LEADER") {
				member.rank = "ADMIRAL";
			}

			if (member.squad_id) {
				let squad = fleet?.squads.find(s => s.id === member.squad_id)
				if (squad) {
					if (squad.leader === member.dbid) {
						member.rank = "SQUADRON LEADER";
					}

					member.squadron_event_rank = squad.event_rank;
				}
			}
			if (member.daily_meta_progress?.goal === -1) {
				member.daily_meta_progress.goal = 0;
			}

			member.rank = appelate(member.rank);
		});

		const { sortDirection, sortField } = this.state;
		const mult = sortDirection === 'descending' ? -1 : 1;

		if (!sortField || sortField === 'name') {
			fleet.members.sort((a, b) => mult * a.display_name.localeCompare(b.display_name));
		}
		else if (sortField === 'rank') {
			fleet.members.sort((a, b) => {
				let r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
				if (r === 0) {
					r = a.display_name.localeCompare(b.display_name);
				}
				return r * mult;
			});
		}
		else if (sortField === 'squad') {
			fleet.members.sort((a, b) => {
				let r = a.squad.localeCompare(b.squad);
				if (r === 0) {
					r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
					if (r === 0) {
						r = a.display_name.localeCompare(b.display_name);
					}
				}
				return r * mult;
			});
		}
		else {
			fleet.members.sort((a, b) => {
				if (a[sortField] === null && b[sortField] === null) return 0;
				else if (a[sortField] === null) return 1;
				else if (b[sortField] === null) return -1;
				let r = (a[sortField] - b[sortField]);
				if (r === 0) {
					r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
					if (r === 0) {
						r = a.display_name.localeCompare(b.display_name);
					}
				}
				return r * mult;
			});
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
				this.tiny?.setValue('access_token', fleetData.access_token, true);
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
		.then(response => response.status == 200 ? response.json() : response.text())
		.then((fleetData: FleetResponse | string) => {
			if (typeof fleetData !== 'string') {
				this.setState({ fleet_data: fleetData.fleet, access_token: fleetData.access_token, username: '', password: '' });
			}
			else {
				if (fleetData === "Error: Failed to fetch token: [object Object]") {
					this.setState({ errorMessage: "Invalid credentials", username: '', password: '', access_token: undefined });
				}
				else {
					this.setState({ errorMessage: fleetData, username: '', password: '', access_token: undefined });
				}
			}
		})
		.catch(err => {
			this.setState({ errorMessage: err, username: '', password: '', access_token: undefined });
		});
	}

	private clearToken() {
		this.setState({ ... this.state, username: '', password: '', access_token: undefined });
		this.tiny?.removeValue("access_token");
	}

	private sortClick(field: string) {
		let { sortDirection, sortField } = this.state;
		if (sortField === field) {
			if (sortDirection === 'descending') {
				sortDirection = 'ascending';
			}
			else {
				sortDirection = 'descending';
			}
		}
		else {
			sortDirection ??= 'ascending';
		}
		this.setState({ ...this.state, sortField: field, sortDirection });
	}

	render() {
		const { sortDirection, sortField, fleet_id, errorMessage, errorTitle, fleet_data, factions, events, access_token, username, password } = this.state;
		const { playerData } = this.context.player;

		if (!playerData) return <></>;

		if (!access_token) {

			return (<React.Fragment>
				{!!errorMessage && (
					<Message style={{backgroundColor: 'darkorange'}}>
						<Message.Header>{errorTitle}</Message.Header>
						<pre>{errorMessage.toString()}</pre>
					</Message>
				)}
				<Form>
				<div className={'ui segment'}
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
						justifyContent: 'left'
					}}>
					<h3>Sign-in for {playerData.player.character.display_name}</h3>
					<b>
						<p>
							Use your DisruptorBeam sign-in credentials to get a token to retrieve your fleet data.
						</p>
						<p>
							<u>The sign-in credentials must match the DBID of the current player data!</u>
						</p>
						<p>
							This will grant you an access token to view your fleet information that should stay current for quite a while (or until you clear your browser data.)
						</p>
						<p>
							This token does not enable automatically getting player data! That process is too expensive, and the player can't be known beforehand, anyway.
						</p>
					</b>
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
				{!!errorMessage && (
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

		this.processData(fleet_data);

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
			<Item.Group>
				<Item>
					<Item.Image size="tiny" src={`${process.env.GATSBY_ASSETS_URL}${imageUrl}`} />

					<Item.Content>
						<Item.Header><ColorName text={fleet_data.name} /></Item.Header>
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

			{event1 && <div style={{display: 'flex', flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
				<table>
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
				</table>
			</div>}

			<Header as="h3">Members</Header>
			<div style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-start',
				justifyContent: 'center',
				flexWrap: 'wrap',
				gap: "0em"
			}}>
				<div
					className='ui button'
					onClick={(e) => { if (this.state.fleet_data?.members) this._exportItems(this.state.fleet_data.members, true) }}
					style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
				>
					<span style={{ margin: '0 2em 0 0' }}>Copy to Clipboard</span><i className='clipboard icon' />
				</div>
				<div
					className='ui button'
					onClick={(e) => { if (this.state.fleet_data?.members) this._exportItems(this.state.fleet_data.members, false) }}
					style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
				>
					<span style={{ margin: '0 2em 0 0' }}>Download CSV</span><i className='download icon' />
				</div>
			</div>
			<Table celled selectable sortable striped collapsing unstackable compact="very">
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell
							sorted={sortField === 'name' ? sortDirection : undefined}
							width={2}
							onClick={(e) => this.sortClick('name')}
							>
							Name
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortField === 'event_rank' ? sortDirection : undefined}
							width={1}
							onClick={(e) => this.sortClick('event_rank')}
							>
							Event Rank
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortField === 'squadron_event_rank' ? sortDirection : undefined}
							width={1}
							onClick={(e) => this.sortClick('squadron_event_rank')}
							>
							Squad Rank
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortField === 'squad' ? sortDirection : undefined}
							width={2}
							onClick={(e) => this.sortClick('squad')}
							>
							Squadron
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortField === 'rank' ? sortDirection : undefined}
							width={1}
							onClick={(e) => this.sortClick('rank')}
							>
							Rank
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortField === 'daily_activity' ? sortDirection : undefined}
							width={1}
							onClick={(e) => this.sortClick('daily_activity')}
							>
							Dailies
						</Table.HeaderCell>
						<Table.HeaderCell
							sorted={sortField === 'last_active' ? sortDirection : undefined}
							width={1}
							onClick={(e) => this.sortClick('last_active')}
							>
							Last Active
						</Table.HeaderCell>
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
												<Link to={`/profile?dbid=${member.dbid}`}><ColorName text={member.display_name} /></Link>
											) : (
													<ColorName text={member.display_name} />
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
							<Table.Cell>{member.event_rank}</Table.Cell>
							<Table.Cell>{member.squadron_event_rank}</Table.Cell>
							<Table.Cell><ColorName text={member.squad} /></Table.Cell>
							<Table.Cell>{member.rank}</Table.Cell>
							<Table.Cell>
								{member.daily_meta_progress?.progress} / {member.daily_meta_progress?.goal}
								<br/>({member.daily_activity})
							</Table.Cell>
							<Table.Cell>
								{!!member.last_active && printShortDistance(undefined, member.last_active, true)}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
			<Button style={{margin: "0.5em 0"}} onClick={(e) => this.clearToken()}>Clear Access Token</Button>
			</React.Fragment>
		);
	}

	_exportItems(data: Member[], clipboard?: boolean) {
		const { playerData } = this.context.player;

		let text = exportMembers(data, clipboard);
		if (clipboard) {
			navigator.clipboard.writeText(text);
			return;
		}
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'members.csv');
	}
}

export default FleetInfoPage;
