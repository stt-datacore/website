import React from 'react';
import { Header, Message, Icon, Table, Checkbox } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { GlobalContext } from '../../context/globalcontext';
import { FleetDetails, Member, ProfileData } from '../../model/fleet';
import { EventInstance } from '../../model/events';
import { StaticFaction } from '../../model/shuttle';
import { ColorName } from './colorname';
import { printShortDistance } from '../../utils/misc';
import { exportMembers } from '../../utils/fleet';
import { downloadData } from '../../utils/crewutils';
import { getIconPath } from '../../utils/assets';
import moment from "moment";
import 'moment/locale/fr';
import 'moment/locale/de';
import 'moment/locale/es';
import { ITableConfigRow, SearchableTable } from '../searchabletable';
import { omniSearchFilter } from '../../utils/omnisearch';
import { useStateWithStorage } from '../../utils/storage';
import { OptionsPanelFlexColumn, OptionsPanelFlexRow } from '../stats/utils';

type FleetInfoPageProps = {
	fleet_id: number;
	fleet_data: FleetDetails
};

type FleetInfoPageState = {
	fleet_id?: number;
	fleet_data?: FleetDetails;
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
	const { playerData, guildCache } = globalContext.player;
	const { fleet_data: inputFleetData, fleet_id: fleetId } = props;

	const [processedFleetData, setProcessedFleetData] = React.useState<FleetDetails[] | undefined>(undefined);
	const [errorMessage, setErrorMessage] = React.useState('');
	const [errorTitle, setErrorTitle] = React.useState('');
	// const [factions, setFactions] = React.useState([] as StaticFaction[]);
	// const [events, setEvents] = React.useState([] as EventInstance[]);

	const [onlyOfficers, setOnlyOfficers] = useStateWithStorage<boolean>('fleet/only_officers', false, { rememberForever: true });
	const [onlyEvent, setOnlyEvent] = useStateWithStorage<boolean>('fleet/only_event', false, { rememberForever: true });

	React.useEffect(() => {
		if (inputFleetData) {
			fetchRemoteDetails(inputFleetData);
		}
	}, [inputFleetData]);

	const { fleetData, members, memberIcons } = React.useMemo(() => {
		const icons = {} as {[key:string]: string}
		const members = [] as Member[];

		if (processedFleetData) {
			let fleets = processedFleetData.map(fleetData => {
				fleetData = { ...fleetData, members: [...fleetData.members] };
				fleetData.members = fleetData.members.filter((member) => {
					if (member.crew_avatar?.icon) {
						icons[member.dbid] = getIconPath(member.crew_avatar.icon, true);
					}
					else {
						icons[member.dbid] = "crew_portraits_cm_empty_sm.png";
					}

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
					if (onlyOfficers && member.rank === 'MEMBER') {
						return false;
					}
					if (onlyEvent && !member.event_rank) {
						return false;
					}
					members.push(member);
					return true;
				});
				return fleetData;
			});

			return { fleetData: fleets, members, memberIcons: icons };
		}
		return { fleetData: undefined, members: [], memberIcons: {} }
	}, [processedFleetData, onlyOfficers, onlyEvent]);

	if (!playerData) return <></>;

	if ((!fleetData?.length || !fleetId) || errorMessage) {
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
		{
			width: 3, column: 'display_name', title: t('global.member'),
			pseudocolumns: ['display_name', 'last_update', 'level'],
			translatePseudocolumn: (field) => {
				return t(`fleet.member_columns.${field}`);
			},
			customCompare: (a: Member, b: Member, config) => {
				let r = 0;
				if (config.field === 'last_update' || a.level === b.level) {
					if (typeof a.last_update === 'string') a.last_update = new Date(a.last_update);
					if (typeof b.last_update === 'string') b.last_update = new Date(b.last_update);
					if (a.last_update && b.last_update) {
						r = a.last_update.getTime() - b.last_update.getTime();
					}
					else if (a.last_update) r = 1;
					else if (b.last_update) r = -1;
				}
				else if (config.field === 'level') {
					r = a.level - b.level;
				}
				if (!r) r = a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase());
				return r;
			}
		},
		{ width: 1, column: 'event_rank', title: t('fleet.member_columns.event_rank') },
		{ width: 1, column: 'squadron_event_rank', title: t('fleet.member_columns.squadron_event_rank') },
		{
			width: 1, column: 'fleet', title: t('fleet.member_columns.fleet'),
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
		{
			width: 1, column: 'daily_activity', title: t('fleet.member_columns.dailies'),
			customCompare: (a: Member, b: Member) => {
				let r = a.daily_meta_progress.progress - b.daily_meta_progress.progress;
				if (!r) r = a.daily_activity - b.daily_activity;
				return r;
			}
		},
		{ width: 1, column: 'last_active', title: t('fleet.member_columns.last_active') },
	] as ITableConfigRow[];

	const flexCol = OptionsPanelFlexColumn;

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
				onClick={(e) => { if (members?.length) _exportItems(members, true) }}
				style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
			>
				<span style={{ margin: '0 2em 0 0' }}>{t('share_profile.export.export_clipboard')}</span><i className='clipboard icon' />
			</div>
			<div
				className='ui button'
				onClick={(e) => { if (members?.length) _exportItems(members, false) }}
				style={{ marginRight: "2em", display: 'inline', flexDirection: 'row', justifyContent: 'space-evenly', cursor: 'pointer' }}
			>
				<span style={{ margin: '0 2em 0 0' }}>{t('share_profile.export.export_csv')}</span><i className='download icon' />
			</div>
		</div>

		<div style={{...flexCol, alignItems: 'flex-start', gap: '0.5em'}}>
			<Checkbox label={t('fleet.only_officers')}
				checked={onlyOfficers}
				onChange={(e, { checked }) => setOnlyOfficers(!!checked)}
				/>
			<Checkbox label={t('fleet.only_event')}
				checked={onlyEvent}
				onChange={(e, { checked }) => setOnlyEvent(!!checked)}
				/>
		</div>

		<div style={{margin: '1em 0'}}>
			<SearchableTable
				hideExplanation={true}
				id={'fleet_members'}
				data={members}
				config={tableData}
				renderTableRow={(item, idx) => renderTableRow(item, idx!)}
				filterRow={filterRow}
				/>
		</div>
		</React.Fragment>
	);

	function filterRow(row: Member, filter: any, filterType?: string) {
		return omniSearchFilter(row, filter, filterType, ['display_name', 'squad', 'display_rank']);
	}

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
			<Table.Cell>{member.event_rank || ''}</Table.Cell>
			<Table.Cell>{member.squadron_event_rank}</Table.Cell>
			<Table.Cell><ColorName text={member.fleet} /></Table.Cell>
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

	function prepareFleetData(fleet: FleetDetails) {
		fleet = {...fleet, members: [...fleet.members] };
		fleet.members = fleet.members.filter((member) => {

			if (!!member.crew_avatar?.icon && member.crew_avatar.icon.file.startsWith("crew_portraits") && !member.crew_avatar.icon.file.endsWith("_sm.png")) {
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

			return true;
		});

		return fleet;
	}

	function fetchRemoteDetails(inputFleet: FleetDetails) {
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
				if (inputFleet?.squads?.length) {
					inputFleet.id = inputFleet.squads[0].rootguild;
				}
				else {
					inputFleet.id = fleetId;
				}
				const gc = guildCache.find(f => f.id === inputFleet.id);
				if (gc) inputFleet.slabel = gc.slabel;
				else inputFleet.slabel = playerData.player?.fleet.slabel || "";
				const filtered = processedFleetData?.filter(f => f.id !== inputFleet.id || !f.id) ?? [];
				inputFleet.members.forEach(m => {
					m.fleet_id = inputFleet.id;
					m.fleet = inputFleet.slabel;
				});
				filtered.push(prepareFleetData(inputFleet));
				setProcessedFleetData(filtered);
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
