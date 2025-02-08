import React, { Component } from 'react';
import { Header, Label, Message, Icon, Table, Item, Image, Input, FormInput, Button, Form } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { GlobalContext } from '../../context/globalcontext';
import { Fleet, Member, ProfileData } from '../../model/fleet';
import { EventInstance } from '../../model/events';
import { TinyStore } from '../../utils/tiny';
import { FleetResponse } from '../../model/fleet';
import { StaticFaction } from '../../model/shuttle';
import { ColorName } from './colorname';
import { appelate, printShortDistance } from '../../utils/misc';
import { exportMembers } from '../../utils/fleet';
import { downloadData } from '../../utils/crewutils';
import { getIconPath } from '../../utils/assets';
import moment from "moment";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';
import { ITableConfigRow, SearchableTable } from '../searchabletable';

type FleetInfoPageProps = {
	fleet_id: number;
	fleet_data: Fleet
};

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
const rankOrder = ['LEADER', 'OFFICER', 'SQUADRON_LEADER', 'MEMBER'];

export const FleetInfoPage = (props: FleetInfoPageProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { fleet_data: inputFleetData, fleet_id: fleetId } = props;

	const [processedFleetData, setProcessedFleetData] = React.useState<Fleet | undefined>(undefined);
	const [errorMessage, setErrorMessage] = React.useState('');
	const [errorTitle, setErrorTitle] = React.useState('');
	const [factions, setFactions] = React.useState([] as StaticFaction[]);
	const [events, setEvents] = React.useState([] as EventInstance[]);

	React.useEffect(() => {
		if (inputFleetData) {
			fetchRemoteDetails(inputFleetData);
		}
	}, [inputFleetData]);

	const { fleetData, memberIcons } = React.useMemo(() => {
		if (processedFleetData) {
			const fleetData = processedFleetData;
			const icons = {} as {[key:string]: string}
			fleetData?.members.forEach((member) => {
				icons[member.dbid] = getIconPath(member.crew_avatar.icon, true);
				if (!member.squadron_event_rank) {
					let squad = inputFleetData.squads.find(f => f.id == member.squad_id);
					if (squad) {
						member.squadron_event_rank = squad.event_rank;
						member.squad = squad.name;
					}
					else {
						member.squad = '';
					}
				}
			});
			return { fleetData, memberIcons: icons };
		}
		return { fleetData: undefined, memberIcons: {} }
	}, [processedFleetData]);

	if (!playerData) return <></>;

	if ((!fleetData || !fleetId) || errorMessage) {
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
						<Icon loading name="spinner" /> {t('spinners.default')}
					</div>
				)}
			</React.Fragment>
		);
	}

	const tableData = [
		{ width: 3, column: 'name', title: t('fleet.member_columns.name') },
		{ width: 1, column: 'event_rank', title: t('fleet.member_columns.event_rank') },
		{ width: 1, column: 'squadron_event_rank', title: t('fleet.member_columns.squadron_event_rank') },
		{
			width: 1, column: 'squad', title: t('fleet.member_columns.squadron'),
			customCompare: (a: Member, b: Member) => {
				let r = a.squad.localeCompare(b.squad);
				if (r === 0) {
					r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
					if (r === 0) {
						r = a.display_name.localeCompare(b.display_name);
					}
				}
				return r;
			}
		},
		{
			width: 1, column: 'displayRank', title: t('fleet.member_columns.rank'),
			customCompare: (a: Member, b: Member) => {
				let r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
				if (r === 0) {
					if (!a.squad_leader && b.squad_leader) return 1;
					if (!b.squad_leader && a.squad_leader) return -1;
					r = a.display_name.localeCompare(b.display_name);
				}
				return r;
			}
		},
		{ width: 1, column: 'daily_activity', title: t('fleet.member_columns.dailies') },
		{ width: 1, column: 'last_active', title: t('fleet.member_columns.last_active') },
	] as ITableConfigRow[];

	return (
		<React.Fragment>

		<Header as="h3">{t('fleet.members')}</Header>

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
				onClick={(e) => { if (fleetData?.members) _exportItems(fleetData.members, true) }}
				style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
			>
				<span style={{ margin: '0 2em 0 0' }}>{t('share_profile.export.export_clipboard')}</span><i className='clipboard icon' />
			</div>
			<div
				className='ui button'
				onClick={(e) => { if (fleetData?.members) _exportItems(fleetData.members, false) }}
				style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
			>
				<span style={{ margin: '0 2em 0 0' }}>{t('share_profile.export.export_csv')}</span><i className='download icon' />
			</div>
		</div>

		<SearchableTable
			id={'fleet_members'}
			data={fleetData.members}
			config={tableData}
			renderTableRow={(item, idx) => renderTableRow(item, idx!)}
			filterRow={() => true}
			/>
		{/* <Table celled selectable sortable striped collapsing unstackable compact="very">
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell
						sorted={sortField === 'name' ? sortDirection : undefined}
						width={4}
						onClick={(e) => sortClick('name')}
						>
						{t('fleet.member_columns.name')}
					</Table.HeaderCell>
					<Table.HeaderCell
						sorted={sortField === 'event_rank' ? sortDirection : undefined}
						width={1}
						onClick={(e) => sortClick('event_rank')}
						>
						{t('fleet.member_columns.event_rank')}
					</Table.HeaderCell>
					<Table.HeaderCell
						sorted={sortField === 'squadron_event_rank' ? sortDirection : undefined}
						width={1}
						onClick={(e) => sortClick('squadron_event_rank')}
						>
						{t('fleet.member_columns.squadron_event_rank')}
					</Table.HeaderCell>
					<Table.HeaderCell
						sorted={sortField === 'squad' ? sortDirection : undefined}
						width={2}
						onClick={(e) => sortClick('squad')}
						>
						{t('fleet.member_columns.squadron')}
					</Table.HeaderCell>
					<Table.HeaderCell
						sorted={sortField === 'rank' ? sortDirection : undefined}
						width={1}
						onClick={(e) => sortClick('rank')}
						>
						{t('fleet.member_columns.rank')}
					</Table.HeaderCell>
					<Table.HeaderCell
						sorted={sortField === 'daily_activity' ? sortDirection : undefined}
						width={1}
						onClick={(e) => sortClick('daily_activity')}
						>
						{t('fleet.member_columns.dailies')}
					</Table.HeaderCell>
					<Table.HeaderCell
						sorted={sortField === 'last_active' ? sortDirection : undefined}
						width={1}
						onClick={(e) => sortClick('last_active')}
						>
						{t('fleet.member_columns.last_active')}
					</Table.HeaderCell>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{inputFleetData.members.map((member, idx) => (
					<Table.Row key={idx}>
						<Table.Cell width={3}>
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
										src={`${process.env.GATSBY_ASSETS_URL}${memberIcons[member.dbid] || 'crew_portraits_cm_empty_sm.png'}`}
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
									{t('base.level') + " " + member.level.toString()}
									{!!member.last_update && <p>
									{t('global.last_updated_colon')} {_momentDate(member.last_update!)}
									</p>}

								</div>
							</div>
						</Table.Cell>
						<Table.Cell>{member.event_rank}</Table.Cell>
						<Table.Cell>{member.squadron_event_rank}</Table.Cell>
						<Table.Cell><ColorName text={member.squad} /></Table.Cell>
						<Table.Cell>{member.display_rank ?? member.rank}</Table.Cell>
						<Table.Cell>
							{member.daily_meta_progress?.progress} / {member.daily_meta_progress?.goal}
							<br/>({member.daily_activity})
						</Table.Cell>
						<Table.Cell>
							{!!member.last_active && printShortDistance(undefined, member.last_active, true, t)}
						</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table> */}
		</React.Fragment>
	);

	function renderTableRow(member: Member, idx: number) {
		return (<Table.Row key={`${member.display_name}+${idx}`}>
			<Table.Cell width={3}>
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
							src={`${process.env.GATSBY_ASSETS_URL}${memberIcons[member.dbid] || 'crew_portraits_cm_empty_sm.png'}`}
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
						{t('base.level') + " " + member.level.toString()}
						{!!member.last_update && <p>
						{t('global.last_updated_colon')} {_momentDate(member.last_update!)}
						</p>}

					</div>
				</div>
			</Table.Cell>
			<Table.Cell>{member.event_rank}</Table.Cell>
			<Table.Cell>{member.squadron_event_rank}</Table.Cell>
			<Table.Cell><ColorName text={member.squad} /></Table.Cell>
			<Table.Cell>{member.display_rank ?? member.rank}</Table.Cell>
			<Table.Cell>
				{member.daily_meta_progress?.progress} / {member.daily_meta_progress?.goal}
				<br/>({member.daily_activity})
			</Table.Cell>
			<Table.Cell>
				{!!member.last_active && printShortDistance(undefined, member.last_active, true, t)}
			</Table.Cell>
		</Table.Row>)
	}




	function prepareFleetData(fleet: Fleet) {
		fleet.members.forEach((member) => {
			if (member.crew_avatar.icon.file.startsWith("crew_portraits") && !member.crew_avatar.icon.file.endsWith("_sm.png")) {
				member.crew_avatar.icon.file = member.crew_avatar.icon.file.replace("_icon.png", "_sm.png");
			}
			let ranks = [] as string[];

			if (member.rank === "LEADER") {
				ranks.push("admiral");
			}
			else if (member.rank !== 'SQUADRON_LEADER') {
				ranks.push(member.rank?.toLowerCase() ?? 'member');
			}

			if (member.squad_id) {
				let squad = fleet?.squads.find(s => s.id == member.squad_id)
				if (squad) {
					if (member.squad_rank === 'LEADER') {
						member.squad_leader = true;
						ranks.push('squadron_leader');
						ranks = ranks.filter(f => f !== 'member');
						if (member.rank === 'MEMBER') {
							member.rank = 'SQUADRON_LEADER';
						}
					}
					member.squad = squad.name;
					member.squadron_event_rank = squad.event_rank;
				}
			}

			if (member.daily_meta_progress?.goal === -1) {
				member.daily_meta_progress.goal = 0;
			}
			member.display_rank = ranks.map(rank => t(`global.${rank}`)).join(", ") ?? member.rank
		});

		return fleet;
	}

	function fetchRemoteDetails(inputFleet: Fleet) {
		const dbids = inputFleet?.members.map(m => m.dbid);
		if (!inputFleet || !playerData || !dbids?.length) {
			return;
		}
		fetch(`${process.env.GATSBY_DATACORE_URL}api/fleet_info`, {
				method: 'POST',
				body: JSON.stringify({ dbids: dbids }),
				headers: {
					'Content-type': "application/json"
				}
			})
			.then(response => response.json())
			.then((profileData: ProfileData[]) => {
				if (profileData) {
					for (let player of profileData) {
						let pinfo = inputFleet.members.find(m => m.dbid.toString() == player.dbid);
						if (pinfo) {
							pinfo.last_update = new Date(player.lastUpdate);
							pinfo.hash = player.hash;
						}
					}
				}
			})
			.catch(err => {
				//this.setState({ errorMessage: err });
			})
			.finally(() => {
				prepareFleetData(inputFleet);
				setProcessedFleetData(inputFleet);
			});
	}

	function _momentDate(date: Date) {
		return moment(date).utc(false).locale(globalContext.localized.language === 'sp' ? 'es' : globalContext.localized.language).format("MMM D, y")
	}

	function _exportItems(data: Member[], clipboard?: boolean) {
		let text = exportMembers(data, clipboard);
		if (clipboard) {
			navigator.clipboard.writeText(text);
			return;
		}
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'members.csv');
	}
}

// class FleetInfoPage extends Component<FleetInfoPageProps, FleetInfoPageState> {
// 	static contextType = GlobalContext;
// 	declare context: React.ContextType<typeof GlobalContext>;

// 	private _tiny?: TinyStore;

// 	protected get tiny(): TinyStore | undefined {
// 		return this._tiny;
// 	}

// 	constructor(props: FleetInfoPageProps) {
// 		super(props);
// 		this.state = {
// 			fleet_id: undefined,
// 			fleet_data: undefined,
// 			factions: undefined,
// 			events: undefined,
// 			access_token: undefined,
// 			username: '',
// 			password: '',
// 			//errorTitle: "Fleet Info Returning Soon!!",
// 			//errorMessage: "Fleet info will be returning soon, after some server upgrades. Watch this space!"
// 		};

// 	}

// 	componentDidMount() {
// 		const { playerData } = this.context.player;
// 		if (!playerData) return;

// 		const tiny = this._tiny = TinyStore.getStore(`fleet_info_dbid_${playerData.player.dbid}`);

// 		this.setState({
// 			fleet_id: playerData.player.fleet.id,
// 			fleet_data: undefined,
// 			factions: this.context.core.factions,
// 			events: this.context.core.event_instances,
// 			access_token: tiny.getValue<string | undefined>('access_token', undefined)
// 		});

// 		this.refreshData();
// 	}

// 	componentDidUpdate(prevProps: Readonly<FleetInfoPageProps>, prevState: Readonly<FleetInfoPageState>, snapshot?: any): void {
// 		if (prevState.fleet_data !== this.props.fleet_data) {
// 			this.refreshData();
// 		}
// 	}

// 	private prepareFleetData(fleet?: Fleet) {
// 		const { t } = this.context.localized;
// 		fleet ??= this.state.fleet_data;
// 		if (!fleet) return;
// 		fleet.members.forEach((member) => {
// 			if (member.crew_avatar.icon.file.startsWith("crew_portraits") && !member.crew_avatar.icon.file.endsWith("_sm.png")) {
// 				member.crew_avatar.icon.file = member.crew_avatar.icon.file.replace("_icon.png", "_sm.png");
// 			}
// 			let ranks = [] as string[];

// 			if (member.rank === "LEADER") {
// 				ranks.push("admiral");
// 			}
// 			else if (member.rank !== 'SQUADRON_LEADER') {
// 				ranks.push(member.rank?.toLowerCase() ?? 'member');
// 			}

// 			if (member.squad_id) {
// 				let squad = fleet?.squads.find(s => s.id == member.squad_id)
// 				if (squad) {
// 					if (member.squad_rank === 'LEADER') {
// 						member.squad_leader = true;
// 						ranks.push('squadron_leader');
// 						ranks = ranks.filter(f => f !== 'member');
// 						if (member.rank === 'MEMBER') {
// 							member.rank = 'SQUADRON_LEADER';
// 						}
// 					}
// 					member.squad = squad.name;
// 					member.squadron_event_rank = squad.event_rank;
// 				}
// 			}

// 			if (member.daily_meta_progress?.goal === -1) {
// 				member.daily_meta_progress.goal = 0;
// 			}
// 			member.display_rank = ranks.map(rank => t(`global.${rank}`)).join(", ") ?? member.rank
// 		});

// 		const { sortDirection, sortField } = this.state;
// 		const mult = sortDirection === 'descending' ? -1 : 1;

// 		if (!sortField || sortField === 'name') {
// 			fleet.members.sort((a, b) => mult * a.display_name.localeCompare(b.display_name));
// 		}
// 		else if (sortField === 'rank') {
// 			fleet.members.sort((a, b) => {
// 				let r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
// 				if (r === 0) {
// 					if (!a.squad_leader && b.squad_leader) return 1;
// 					if (!b.squad_leader && a.squad_leader) return -1;
// 					r = a.display_name.localeCompare(b.display_name);
// 				}
// 				return r * mult;
// 			});
// 		}
// 		else if (sortField === 'squad') {
// 			fleet.members.sort((a, b) => {
// 				let r = a.squad.localeCompare(b.squad);
// 				if (r === 0) {
// 					r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
// 					if (r === 0) {
// 						r = a.display_name.localeCompare(b.display_name);
// 					}
// 				}
// 				return r * mult;
// 			});
// 		}
// 		else {
// 			fleet.members.sort((a, b) => {
// 				if (a[sortField] === null && b[sortField] === null) return 0;
// 				else if (a[sortField] === null) return 1;
// 				else if (b[sortField] === null) return -1;
// 				let r = (a[sortField] - b[sortField]);
// 				if (r === 0) {
// 					r = (rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
// 					if (r === 0) {
// 						r = a.display_name.localeCompare(b.display_name);
// 					}
// 				}
// 				return r * mult;
// 			});
// 		}
// 	}

// 	private refreshData() {
// 		const { playerData } = this.context.player;
// 		const dbids = this.props.fleet_data.members.map(m => m.dbid);
// 		if (!playerData) {
// 			return;
// 		}

// 		fetch(`${process.env.GATSBY_DATACORE_URL}api/fleet_info`, {
// 				method: 'POST',
// 				body: JSON.stringify({ dbids: dbids }),
// 				headers: {
// 					'Content-type': "application/json"
// 				}
// 			})
// 			.then(response => response.json())
// 			.then((fleetData: ProfileData[]) => {
// 				if (fleetData) {
// 					for (let player of fleetData) {
// 						let pinfo = this.props.fleet_data.members.find(m => m.dbid.toString() == player.dbid);
// 						if (pinfo) {
// 							pinfo.last_update = new Date(player.lastUpdate);
// 							pinfo.hash = player.hash;
// 						}
// 					}
// 				}
// 			})
// 			.catch(err => {
// 				//this.setState({ errorMessage: err });
// 			})
// 			.finally(() => {
// 				this.setState({ ... this.state, fleet_data: this.props.fleet_data , fleet_id: this.props.fleet_id })
// 			});
// 	}

// 	readonly signinClick = () => {
// 		const { fleet_id, username, password } = this.state;

// 		fetch(`${process.env.GATSBY_DATACORE_URL}api/fleet_info?fleetid=` + fleet_id, {
// 			method: 'POST',
// 			body: JSON.stringify({ username, password }),
// 			headers: {
// 				'Content-type': "application/json"
// 			}
// 		})
// 		.then(response => response.status == 200 ? response.json() : response.text())
// 		.then((fleetData: FleetResponse | string) => {
// 			if (typeof fleetData !== 'string') {
// 				this.setState({ fleet_data: fleetData.fleet, access_token: fleetData.access_token, username: '', password: '' });
// 			}
// 			else {
// 				if (fleetData === "Error: Failed to fetch token: [object Object]") {
// 					this.setState({ errorMessage: "Invalid credentials", username: '', password: '', access_token: undefined });
// 				}
// 				else {
// 					this.setState({ errorMessage: fleetData, username: '', password: '', access_token: undefined });
// 				}
// 			}
// 		})
// 		.catch(err => {
// 			this.setState({ errorMessage: err, username: '', password: '', access_token: undefined });
// 		});
// 	}

// 	private clearToken() {
// 		this.setState({ ... this.state, username: '', password: '', access_token: undefined });
// 		this.tiny?.removeValue("access_token");
// 	}

// 	private sortClick(field: string) {
// 		let { sortDirection, sortField } = this.state;
// 		if (sortField === field) {
// 			if (sortDirection === 'descending') {
// 				sortDirection = 'ascending';
// 			}
// 			else {
// 				sortDirection = 'descending';
// 			}
// 		}
// 		else {
// 			sortDirection ??= 'ascending';
// 		}
// 		this.setState({ ...this.state, sortField: field, sortDirection });
// 	}

// 	render() {
// 		const { sortDirection, sortField, errorMessage, errorTitle, factions, events, access_token, username, password } = this.state;
// 		const { fleet_data, fleet_id } = this.state;
// 		const { playerData } = this.context.player;
// 		const { t } = this.context.localized;
// 		if (!playerData) return <></>;

// 		if (fleet_id === undefined || fleet_data === undefined || errorMessage !== undefined) {
// 			return (
// 				<React.Fragment>
// 				{!!errorMessage && (
// 					<Message style={{backgroundColor: 'darkorange'}}>
// 						<Message.Header>{errorTitle}</Message.Header>
// 						<pre>{errorMessage.toString()}</pre>
// 					</Message>
// 				)}
// 				{!errorMessage && (
// 					<div>
// 						<Icon loading name="spinner" /> {t('spinners.default')}
// 					</div>
// 				)}
// 				{/* <p>
// 					Go back to <Link to={`/profile/?dbid=${this.context.player.playerData?.player.dbid}`}>Your Profile</Link>
// 				</p> */}
// 				</React.Fragment>
// 			);
// 		}

// 		this.prepareFleetData(fleet_data);

// 		let imageUrl = 'icons_icon_faction_starfleet.png';
// 		// if (factions && factions[fleet_data.nicon_index]) {
// 		// 	imageUrl = factions[fleet_data.nicon_index].icon;
// 		// }

// 		// let event1: EventInstance | undefined = undefined;
// 		// let event2: EventInstance | undefined = undefined;
// 		// let event3: EventInstance | undefined = undefined;

// 		// if (events) {
// 		// 	if (events[0].event_name === fleet_data.leaderboard[0].event_name) {
// 		// 		event1 = events[0];
// 		// 		event2 = events[1];
// 		// 		event3 = events[2];
// 		// 	} else {
// 		// 		event1 = events.find(ev => ev.event_name === fleet_data.leaderboard[0].event_name);
// 		// 		event2 = events.find(ev => ev.event_name === fleet_data.leaderboard[1].event_name);
// 		// 		event3 = events.find(ev => ev.event_name === fleet_data.leaderboard[2].event_name);
// 		// 	}
// 		// }

// 		const memberIcons = {} as {[key:string]: string}

// 		fleet_data.members.forEach((member) => {
// 			memberIcons[member.dbid] = getIconPath(member.crew_avatar.icon, true);
// 			if (!member.squadron_event_rank) {
// 				let squad = fleet_data.squads.find(f => f.id == member.squad_id);
// 				if (squad) {
// 					member.squadron_event_rank = squad.event_rank;
// 					member.squad = squad.name;
// 				}
// 				else {
// 					member.squad = '';
// 				}
// 			}
// 		})

// 		return (
// 			<React.Fragment>

// 			<Header as="h3">{t('fleet.members')}</Header>
// 			<div style={{
// 				display: 'flex',
// 				flexDirection: 'row',
// 				alignItems: 'flex-start',
// 				justifyContent: 'center',
// 				flexWrap: 'wrap',
// 				gap: "0em"
// 			}}>
// 				<div
// 					className='ui button'
// 					onClick={(e) => { if (this.props.fleet_data?.members) this._exportItems(this.props.fleet_data.members, true) }}
// 					style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
// 				>
// 					<span style={{ margin: '0 2em 0 0' }}>{t('share_profile.export.export_clipboard')}</span><i className='clipboard icon' />
// 				</div>
// 				<div
// 					className='ui button'
// 					onClick={(e) => { if (this.props.fleet_data?.members) this._exportItems(this.props.fleet_data.members, false) }}
// 					style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
// 				>
// 					<span style={{ margin: '0 2em 0 0' }}>{t('share_profile.export.export_csv')}</span><i className='download icon' />
// 				</div>
// 			</div>
// 			<Table celled selectable sortable striped collapsing unstackable compact="very">
// 				<Table.Header>
// 					<Table.Row>
// 						<Table.HeaderCell
// 							sorted={sortField === 'name' ? sortDirection : undefined}
// 							width={4}
// 							onClick={(e) => this.sortClick('name')}
// 							>
// 							{t('fleet.member_columns.name')}
// 						</Table.HeaderCell>
// 						<Table.HeaderCell
// 							sorted={sortField === 'event_rank' ? sortDirection : undefined}
// 							width={1}
// 							onClick={(e) => this.sortClick('event_rank')}
// 							>
// 							{t('fleet.member_columns.event_rank')}
// 						</Table.HeaderCell>
// 						<Table.HeaderCell
// 							sorted={sortField === 'squadron_event_rank' ? sortDirection : undefined}
// 							width={1}
// 							onClick={(e) => this.sortClick('squadron_event_rank')}
// 							>
// 							{t('fleet.member_columns.squadron_event_rank')}
// 						</Table.HeaderCell>
// 						<Table.HeaderCell
// 							sorted={sortField === 'squad' ? sortDirection : undefined}
// 							width={2}
// 							onClick={(e) => this.sortClick('squad')}
// 							>
// 							{t('fleet.member_columns.squadron')}
// 						</Table.HeaderCell>
// 						<Table.HeaderCell
// 							sorted={sortField === 'rank' ? sortDirection : undefined}
// 							width={1}
// 							onClick={(e) => this.sortClick('rank')}
// 							>
// 							{t('fleet.member_columns.rank')}
// 						</Table.HeaderCell>
// 						<Table.HeaderCell
// 							sorted={sortField === 'daily_activity' ? sortDirection : undefined}
// 							width={1}
// 							onClick={(e) => this.sortClick('daily_activity')}
// 							>
// 							{t('fleet.member_columns.dailies')}
// 						</Table.HeaderCell>
// 						<Table.HeaderCell
// 							sorted={sortField === 'last_active' ? sortDirection : undefined}
// 							width={1}
// 							onClick={(e) => this.sortClick('last_active')}
// 							>
// 							{t('fleet.member_columns.last_active')}
// 						</Table.HeaderCell>
// 					</Table.Row>
// 				</Table.Header>
// 				<Table.Body>
// 					{fleet_data.members.map((member, idx) => (
// 						<Table.Row key={idx}>
// 							<Table.Cell width={3}>
// 								<div
// 									style={{
// 										display: 'grid',
// 										gridTemplateColumns: '60px auto',
// 										gridTemplateAreas: `'icon stats' 'icon description'`,
// 										gridGap: '1px'
// 									}}
// 								>
// 									<div style={{ gridArea: 'icon' }}>
// 										<img
// 											width={48}
// 											src={`${process.env.GATSBY_ASSETS_URL}${memberIcons[member.dbid] || 'crew_portraits_cm_empty_sm.png'}`}
// 										/>
// 									</div>
// 									<div style={{ gridArea: 'stats' }}>
// 										<span style={{ fontWeight: 'bolder', fontSize: '1.25em' }}>
// 											{member.last_update ? (
// 												<Link to={`/profile?dbid=${member.dbid}`}><ColorName text={member.display_name} /></Link>
// 											) : (
// 													<ColorName text={member.display_name} />
// 												)}
// 										</span>
// 									</div>
// 									<div style={{ gridArea: 'description' }}>
// 										{t('base.level') + " " + member.level.toString()}
// 										{!!member.last_update && <p>
// 										{t('global.last_updated_colon')} {this._momentDate(member.last_update!)}
// 										</p>}

// 									</div>
// 								</div>
// 							</Table.Cell>
// 							<Table.Cell>{member.event_rank}</Table.Cell>
// 							<Table.Cell>{member.squadron_event_rank}</Table.Cell>
// 							<Table.Cell><ColorName text={member.squad} /></Table.Cell>
// 							<Table.Cell>{member.display_rank ?? member.rank}</Table.Cell>
// 							<Table.Cell>
// 								{member.daily_meta_progress?.progress} / {member.daily_meta_progress?.goal}
// 								<br/>({member.daily_activity})
// 							</Table.Cell>
// 							<Table.Cell>
// 								{!!member.last_active && printShortDistance(undefined, member.last_active, true, t)}
// 							</Table.Cell>
// 						</Table.Row>
// 					))}
// 				</Table.Body>
// 			</Table>
// 			</React.Fragment>
// 		);
// 	}

// 	_exportItems(data: Member[], clipboard?: boolean) {
// 		const { playerData } = this.context.player;

// 		let text = exportMembers(data, clipboard);
// 		if (clipboard) {
// 			navigator.clipboard.writeText(text);
// 			return;
// 		}
// 		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'members.csv');
// 	}

// 	_momentDate(date: Date) {
// 		return moment(date).utc(false).locale(this.context.localized.language === 'sp' ? 'es' : this.context.localized.language).format("MMM D, y")
// 	}
// }

// export default FleetInfoPage;
