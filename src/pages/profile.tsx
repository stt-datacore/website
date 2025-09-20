import { Workbook } from 'exceljs';
import 'moment/locale/de';
import 'moment/locale/es';
import 'moment/locale/fr';
import React from 'react';
import { Dropdown, Icon, Menu, Message, Tab } from 'semantic-ui-react';

import ProfileCharts from '../components/profile_charts';
import ProfileCrew from '../components/profile_crew';
import ProfileOther from '../components/profile_other';
import { ShipTable } from '../components/ship/shiptable';

import { IDemand } from '../model/equipment';
import { download, downloadData, exportCrew, exportCrewFields, prepareProfileData } from '../utils/crewutils';
import { demandsPerSlot } from '../utils/equipment';
import { exportItemFields, exportItems, mergeItems } from '../utils/itemutils';
import { exportShipFields, exportShips, mergeRefShips } from '../utils/shiputils';

import moment from 'moment';
import { v4 } from 'uuid';
import CONFIG from '../components/CONFIG';
import RosterSummary from '../components/crewtables/rostersummary';
import { DemandsTable } from '../components/items/demandstable';
import { ItemsFilterProvider } from '../components/items/filters';
import { GlobalFarm } from '../components/items/globalfarm';
import DataPageLayout from '../components/page/datapagelayout';
import { PlayerBadge } from '../components/page/playerbadge';
import { GlobalContext } from '../context/globalcontext';
import { WorkerProvider } from '../context/workercontext';
import { EquipmentItem } from '../model/equipment';
import { PlayerCrew, PlayerData } from '../model/player';
import { useStateWithStorage } from '../utils/storage';
import { calculateBuffConfig } from '../utils/voyageutils';

export const ProfilePage = () => {
	return (
		<DataPageLayout demands={['cadet', 'episodes', 'items', 'all_buffs']}>
			<ProfilePageLoader />
		</DataPageLayout>
	);
}

const ProfilePageLoader = () => {
	const globalContext = React.useContext(GlobalContext);

	const { core: globalCore } = globalContext;
	const { crew: coreCrew, all_ships: coreShips } = globalCore;
	const { t } = globalContext.localized;

	const [lastModified, setLastModified] = React.useState<Date | undefined>(undefined);
	const [strippedPlayerData, setStrippedPlayerData] = React.useState<PlayerData | undefined>(undefined);
	const [newCrew, setNewCrew] = React.useState<PlayerCrew[] | undefined>(undefined);
	const [errorMessage, setErrorMessage] = React.useState('');
	const buffConfig = strippedPlayerData ? calculateBuffConfig(strippedPlayerData.player) : undefined;
	const [calculatedDemands, setCalculatedDemands] = React.useState<EquipmentItem[] | undefined>(undefined);

	React.useEffect(() => {
		if (coreCrew?.length) {
			configureProfile();
		}
	}, [coreCrew]);

	const profData: PlayerData | undefined = React.useMemo(() => {
		if (!strippedPlayerData) return;
		let profData = structuredClone(strippedPlayerData) as PlayerData;
		prepareProfileData('PROFILE_PROVIDER', coreCrew, profData, lastModified ?? new Date());
		return profData;
	}, [strippedPlayerData]);

	const playerShips = React.useMemo(() => {
		if (!profData) return [];
		return mergeRefShips(globalContext.core.all_ships,profData.player.character.ships, globalContext.localized.SHIP_TRAIT_NAMES);
	}, [profData, coreShips]);

	if (errorMessage) {
		return (
			<React.Fragment>
				<Message negative>
					<Message.Header>{t('global.error')}</Message.Header>
					<Message.Content>{errorMessage}</Message.Content>
				</Message>
			</React.Fragment>
		)
	}
	else return (
		<React.Fragment>
			{!profData && <div className='ui medium centered text active inline loader'>{t('spinners.default')}</div>}
			{!!profData && <React.Fragment>
				<GlobalContext.Provider value={{
					...globalContext,
					player: {
						...globalContext.player,
						loaded: true,
						playerData: profData,
						buffConfig: buffConfig,
						maxBuffs: globalContext.core.all_buffs,
						playerShips,
						showPlayerGlance: false,
						setShowPlayerGlance: (value) => false,
						newCrew,
						setNewCrew,
						calculatedDemands,
						setCalculatedDemands,
					}
				}}>
					<ProfilePageComponent refresh={refresh} />
				</GlobalContext.Provider>
			</React.Fragment>}
		</React.Fragment>
	);

	function configureProfile() {
		let urlParams = new URLSearchParams(window.location.search);
		// if (isMobile || (urlParams.has('mobile') && urlParams.get('mobile'))) {
		// 	setIsMobile(true);
		// }
		setCalculatedDemands(undefined);

		let dbid = '';
		let dbidHash = '';
		if (urlParams.has('dbid')) {
			dbid = urlParams.get('dbid')!;
		}
		else if (urlParams.has('hash')) {
			dbidHash = urlParams.get('hash')!;
		}
		else if (urlParams.has('discord') && window.location.hash !== '') {
			let discordUsername = urlParams.get('discord');
			let discordDiscriminator = window.location.hash.replace('#', '');
			fetch(`${process.env.GATSBY_DATACORE_URL}api/get_dbid_from_discord?username=${discordUsername}&discriminator=${discordDiscriminator}`)
				.then(response => {
					return response.json();
				})
				.then(data => {
					if (data && data.dbid) {
						fetchProfile(data.dbid);
					}
				})
				.catch(err => {
					setErrorMessage(err?.toString() || 'Error');
				});
			return;
		}

		fetchProfile(dbid, dbidHash);
	}

	function refresh() {
		setStrippedPlayerData(undefined);
		setTimeout(() => {
			configureProfile();
		});
	}

	function fetchProfile(dbid?: string, dbidHash?: string) {
		if (!dbid && !dbidHash) return;
		let lastModified: Date | undefined = undefined;
		let hash = v4();
		let url: string;
		if (dbidHash) {
			url = `${process.env.GATSBY_DATACORE_URL}api/getProfile?dbidhash=${dbidHash}&h=${hash}`
		}
		else {
			url = `${process.env.GATSBY_DATACORE_URL}api/getProfile?dbid=${dbid}&h=${hash}`;
		}
		const fetchUrl = url;
		fetch(fetchUrl)
			.then(response => response.json())
			.then(serverResponse => {
				let lmstr = serverResponse.timeStamp as string;
				if (lmstr) lastModified = new Date(Date.parse(lmstr));
				let playerData: PlayerData = serverResponse.playerData;

				setTimeout(() => {
					setStrippedPlayerData(playerData);
					setLastModified(lastModified);
				});
			})
			.catch(err => {
				setErrorMessage(err?.toString() || '')
			});
	}
}

const ProfilePageComponent = (props: { refresh?: () => void }) => {
	const globalContext = React.useContext(GlobalContext);

	const { t } = globalContext.localized;
	const { playerData, buffConfig } = globalContext.player ?? { playerData: undefined };
	const { items, crew: allCrew } = globalContext.core;

	const [selPane, setSelPane] = useStateWithStorage<number>('profile/sel_pane', 0);

	const profileItems = React.useMemo(() => {
		return globalContext.core.items.filter(f => playerData?.player.character.items.some(it => it.symbol === f.symbol));
	}, [items, playerData]);

	const panes = [
		{
			key: 'view_profile_crew',
			menuItem: t('profile.crew'),
			render: () => playerData &&
				<React.Fragment>
					<ProfileCrew pageId={"profile_crewTool_" + playerData.player.dbid} />
					{!!buffConfig && <RosterSummary
						allCrew={allCrew}
						myCrew={playerData.player.character.crew}
						buffConfig={buffConfig}
						/>}
				</React.Fragment>
				|| <></>
		},
		{
			key: 'view_profile_all',
			menuItem: t('gauntlet.owned_status.any'),
			render: () => playerData && <ProfileCrew allCrew={true} pageId={"profile_crewTool_all_" + playerData.player.dbid} /> || <></>
		},
		{
			key: 'view_profile_ships',
			menuItem: t('profile.ships'),
			render: () => playerData && <ShipTable mode='owned' pageId='profile' /> || <></>
		},
		{
			key: 'view_profile_items',
			menuItem: t('profile.items'),
			render: () =>
				<WorkerProvider>
					<ItemsFilterProvider
						pageId='profile'
						pool={profileItems}
						ownedItems={false}
						>
					<DemandsTable
						 pageId='profile'
						items={profileItems} />
					</ItemsFilterProvider>
				</WorkerProvider>
		},
		{
			key: 'view_profile_farm',
			menuItem: t('item_picker.farm_table.title'),
			render: () =>
				<WorkerProvider>
					<ItemsFilterProvider
						pageId='profile'
						pool={profileItems}
						ownedItems={false}
						>
					<GlobalFarm
						pageId='profile'
						items={profileItems} />
					</ItemsFilterProvider>
				</WorkerProvider>
		},
		{
			key: 'view_profile_other',
			menuItem: t('profile.other'),
			render: () => <ProfileOther />
		},
		{
			key: 'view_profile_charts',
			menuItem: t('profile.charts_and_stats'),
			render: () => <ProfileCharts items={items} allCrew={allCrew} />
		}
	];

	// console.log("Avatar Debug");
	// console.log(playerData?.player?.character?.crew_avatar);

	return (
		playerData?.player &&
		(<>
			<PlayerBadge t={t} playerData={playerData} />
			<Menu compact>
				<Menu.Item>
					{playerData.calc?.lastModified ? <span>{t('global.last_updated_colon')}&nbsp;{moment(playerData.calc.lastModified).locale(globalContext.localized.language).format("llll")}</span> : <span />}
				</Menu.Item>
				<Dropdown item text={t('global.download')}>
					<Dropdown.Menu>
						<Dropdown.Item onClick={() => _exportExcel()}>{t('profile.download.complete_spreadsheet')} (XLSX)</Dropdown.Item>
						<Dropdown.Item onClick={() => _exportCrew()}>{t('profile.download.crew_table')} (CSV)</Dropdown.Item>
						<Dropdown.Item onClick={() => _exportShips()}>{t('profile.download.ship_table')} (CSV)</Dropdown.Item>
						<Dropdown.Item onClick={() => _exportItems()}>{t('profile.download.item_table')} (CSV)</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown>
				{!!props.refresh && <Menu.Item>
					<Icon name='refresh' style={{margin:0}} onClick={() => props.refresh!()} />
				</Menu.Item>}
			</Menu>
			<br/>
			<div style={{margin: '0.5em 1em', fontStyle: 'italic'}}>({t('profile.switch_to_english')})</div>
			<Tab
				activeIndex={selPane}
				onTabChange={(e, data) => setSelPane(data.activeIndex as number ?? 0)}
				menu={{ secondary: true, pointing: true }} panes={panes} />
		</>
	)) || <></>;


	async function _exportExcel() {
		const { playerData } = globalContext.player;
		const { t, SHIP_TRAIT_NAMES } = globalContext.localized;
		const { all_ships, crew: allcrew, items } = globalContext.core;

		let itemdata = playerData?.player?.character?.items ? mergeItems(playerData.player.character.items.map(item => item as EquipmentItem), items) : undefined;
		let shipdata = playerData ? mergeRefShips(all_ships, playerData.player.character.ships, SHIP_TRAIT_NAMES) : undefined;

		let crewFields = exportCrewFields(t);
		let shipFields = exportShipFields();
		let itemFields = exportItemFields();

		let workbook = new Workbook();
		workbook.creator = 'DataCore';
		workbook.lastModifiedBy = 'DataCore';
		workbook.created = new Date(2020, 1, 1);
		workbook.modified = new Date(2020, 1, 1);
		workbook.lastPrinted = new Date(2020, 1, 1);

		// ----------- Crew
		let crewsheet = workbook.addWorksheet('Crew', {
			properties: { tabColor: { argb: 'FFC0000' } },
			views: [{ state: 'frozen', ySplit: 1 }]
		});

		crewsheet.columns = crewFields.map(field => ({
			header: field.label,
			key: field.label
		}));

		for (let crew of playerData?.player.character.crew.concat(playerData.player.character?.unOwnedCrew ?? []) ?? []) {
			let row = {};
			for (let field of crewFields) {
				row[field.label] = field.value(crew);
			}

			crewsheet.addRow(row);
		}

		// ----------- Items
		let itemsheet = workbook.addWorksheet('Items', {
			//properties: { tabColor: { argb: 'FFC0000' } },
			views: [{ state: 'frozen', ySplit: 1 }]
		});

		itemsheet.columns = itemFields.map(field => ({
			header: field.label,
			key: field.label
		}));

		for (let item of itemdata ?? []) {
			let row = {};
			for (let field of itemFields) {
				row[field.label] = field.value(item);
			}

			itemsheet.addRow(row);
		}

		// ----------- Ships
		let shipsheet = workbook.addWorksheet('Ships', {
			//properties: { tabColor: { argb: 'FFC0000' } },
			views: [{ state: 'frozen', ySplit: 1 }]
		});

		shipsheet.columns = shipFields.map(field => ({
			header: field.label,
			key: field.label
		}));

		for (let item of shipdata ?? []) {
			let row = {};
			for (let field of shipFields) {
				row[field.label] = field.value(item);
			}

			shipsheet.addRow(row);
		}

		// ----------- Demands
		let demandsheet = workbook.addWorksheet('Equipment', {
			//properties: { tabColor: { argb: 'FFC0000' } },
			views: [{ state: 'frozen', ySplit: 1 }]
		});

		let allRows = [] as { startLevel: number, craftCost: number, crew: string }[];
		let allDemandItems = new Set<string>();
		for (let crew of playerData?.player.character.crew ?? []) {
			let acrew = allcrew.find(c => c.symbol === crew.symbol);

			let startLevel = crew.level - (crew.level % 10);
			if (crew.equipment.length < 4) {
				// If it's not fully equipped for this level band, we include the previous band as well
				startLevel = Math.max(1, startLevel - 10);
			} else if (crew.level === 100) {
				// maxed crew, don't care
				continue;
			}

			let craftCost = 0;
			let demands: IDemand[] = [];
			let dupeChecker = new Set<string>();
			// all levels past crew.level
			acrew?.equipment_slots
				.filter(es => es.level >= startLevel)
				.forEach(es => {
					craftCost += demandsPerSlot(es, items, dupeChecker, demands, crew.symbol);
				});

			for (let elem of dupeChecker) {
				allDemandItems.add(elem);
			}

			let row = { startLevel, craftCost, crew: crew.name };
			for (let demand of demands) {
				row[demand.symbol] = demand.count;
			}
			allRows.push(row);
		}

		let demandcolumns = [
			{
				header: 'Crew',
				key: 'crew'
			},
			{
				header: 'Level',
				key: 'startLevel'
			},
			{
				header: 'Craft cost',
				key: 'craftCost'
			}
		];

		for (let elem of allDemandItems) {
			let itElem = items.find(it => it.symbol === elem);
			if (itElem) {
				demandcolumns.push({
					header: `${CONFIG.RARITIES[itElem.rarity].name} ${itElem.name}`,
					key: elem
				});
			}
		}

		demandsheet.columns = demandcolumns;

		for (let row of allRows) {
			for (let elem of allDemandItems) {
				if (!row[elem]) {
					row[elem] = 0;
				}
			}
			demandsheet.addRow(row);
		}

		let buf = await workbook.xlsx.writeBuffer();
		let blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		download('datacore.xlsx', blob);
	}

	function _exportCrew() {
		const { playerData } = globalContext.player;
		const { t } = globalContext.localized;

		let text = playerData ? exportCrew(t, playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew ?? [])) : "";
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	function _exportShips() {
		const { playerData } = globalContext.player;
		const { all_ships } = globalContext.core;
		const { SHIP_TRAIT_NAMES } = globalContext.localized;

		let data = playerData ? mergeRefShips(all_ships, playerData.player.character.ships, SHIP_TRAIT_NAMES) : [];
		let text = exportShips(data);
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'ships.csv');
	}

	function _exportItems() {
		const { playerData } = globalContext.player;
		const { items } = globalContext.core;
		let data = playerData ? mergeItems(playerData?.player?.character?.items?.map(item => item as EquipmentItem), items) : [] as EquipmentItem[];
		let text = exportItems(data);
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'items.csv');
	}



}

// type ProfilePageState = {
// 	dbid?: string;
// 	dbidHash?: string;
// 	errorMessage?: string;
// 	lastModified?: Date;
// 	mobile: boolean;
// };

// interface ProfilePageComponentProps {
// 	props: ProfilePageProps;
// }

// class ProfilePageComponentOld extends Component<ProfilePageComponentProps, ProfilePageState> {
// 	static contextType? = GlobalContext;
// 	declare context: React.ContextType<typeof GlobalContext>;

// 	constructor(props: ProfilePageComponentProps) {
// 		super(props);

// 		this.state = {
// 			dbid: undefined,
// 			errorMessage: undefined,
// 			lastModified: undefined,
// 			mobile: false
// 		};
// 	}

// 	componentDidMount() {
// 		let urlParams = new URLSearchParams(window.location.search);
// 		if (isMobile || (urlParams.has('mobile') && urlParams.get('mobile'))) {
// 			this.setState({ mobile: true });
// 		}
// 		if (urlParams.has('dbid')) {
// 			this.setState({ dbid: urlParams.get('dbid') as string });
// 		}
// 		else if (urlParams.has('hash')) {
// 			this.setState({ dbidHash: urlParams.get('hash') as string });
// 		}
// 		else if (urlParams.has('discord') && window.location.hash !== '') {
// 			let discordUsername = urlParams.get('discord');
// 			let discordDiscriminator = window.location.hash.replace('#', '');
// 			fetch(`${process.env.GATSBY_DATACORE_URL}api/get_dbid_from_discord?username=${discordUsername}&discriminator=${discordDiscriminator}`)
// 				.then(response => {
// 					return response.json();
// 				})
// 				.then(data => {
// 					if (data && data.dbid) {
// 						this.setState({ dbid: data.dbid });
// 					}
// 				})
// 				.catch(err => {
// 					this.setState({ errorMessage: err });
// 				});
// 		}
// 	}


// 	private initing = false;

// 	componentDidUpdate() {
// 		const { dbidHash, dbid, errorMessage } = this.state;
// 		const { playerData } = this.context.player;

// 		const me = this;
// 		if (me.initing) return;

// 		me.initing = true;

// 		if ((dbid || dbidHash) && !playerData?.player && !errorMessage) {
// 			let lastModified: Date | undefined = undefined;
// 			let hash = v4();
// 			let url: string;

// 			if (dbidHash) {
// 				url = `${process.env.GATSBY_DATACORE_URL}api/getProfile?dbidhash=${dbidHash}&h=${hash}`
// 			}
// 			else {
// 				url = `${process.env.GATSBY_DATACORE_URL}api/getProfile?dbid=${dbid}&h=${hash}`;
// 			}

// 			const fetchUrl = url;

// 			fetch(fetchUrl)
// 				.then(response => response.json())
// 				.then(serverResponse => {
// 					let lmstr = serverResponse.timeStamp as string;
// 					if (lmstr) lastModified = new Date(Date.parse(lmstr));
// 					let playerData: PlayerData = serverResponse.playerData;

// 					if (isWindow) window.setTimeout(() => {
// 						if (me.props.props.setPlayerData) {
// 							me.props.props.setPlayerData(playerData);
// 							me.setState({... this.state, lastModified : lastModified, dbid: serverResponse.dbid.toString() });
// 							if (me.props.props.setLastModified) {
// 								me.props.props.setLastModified(lastModified);
// 							}
// 						}
// 					});
// 				})
// 				.catch(err => {
// 					me.setState({ errorMessage: err });
// 				})
// 				.finally(() => {
// 					me.initing = false;
// 				});
// 		}
// 	}

// 	renderDesktop() {
// 		const { t } = this.context.localized;
// 		const { playerData } = this.context.player ?? { playerData: undefined };
// 		const { items, crew: allCrew } = this.context.core;
// 		const profileItems = this.context.core.items.filter(f => playerData?.player.character.items.some(it => it.symbol === f.symbol));

// 		const panes = [
// 			{
// 				menuItem: t('profile.crew'),
// 				render: () => playerData && <ProfileCrew pageId={"profile_crewTool_" + this.state.dbid} /> || <></>
// 			},
// 			{
// 				menuItem: t('profile.crew_mobile'),
// 				render: () => <ProfileCrewMobile isMobile={false} />
// 			},
// 			{
// 				menuItem: t('profile.ships'),
// 				render: () => playerData && <ShipTable pageId='profile' /> || <></>
// 			},
// 			{
// 				menuItem: t('profile.items'),
// 				render: () =>
// 					<WorkerProvider>
// 						<ItemsFilterProvider
// 							pageId='profile'
// 							pool={profileItems}
// 							ownedItems={false}
// 							>
// 						<DemandsTable
// 						 	pageId='profile'
// 							items={profileItems} />
// 						</ItemsFilterProvider>
// 					</WorkerProvider>
// 			},
// 			{
// 				menuItem: t('profile.other'),
// 				render: () => <ProfileOther />
// 			},
// 			{
// 				menuItem: t('profile.charts_and_stats'),
// 				render: () => <ProfileCharts items={items} allCrew={allCrew} />
// 			}
// 		];

// 		// console.log("Avatar Debug");
// 		// console.log(playerData?.player?.character?.crew_avatar);

// 		return (
// 			playerData?.player &&
// 			(<>
// 				<PlayerBadge t={t} playerData={playerData} />
// 				<Menu compact>
// 					<Menu.Item>
// 						{playerData.calc?.lastModified ? <span>{t('global.last_updated_colon')}&nbsp;{moment(playerData.calc.lastModified).locale(this.context.localized.language).format("llll")}</span> : <span />}
// 					</Menu.Item>
// 					<Dropdown item text={t('global.download')}>
// 						<Dropdown.Menu>
// 							<Dropdown.Item onClick={() => this._exportExcel()}>{t('profile.download.complete_spreadsheet')} (XLSX)</Dropdown.Item>
// 							<Dropdown.Item onClick={() => this._exportCrew()}>{t('profile.download.crew_table')} (CSV)</Dropdown.Item>
// 							<Dropdown.Item onClick={() => this._exportShips()}>{t('profile.download.ship_table')} (CSV)</Dropdown.Item>
// 							<Dropdown.Item onClick={() => this._exportItems()}>{t('profile.download.item_table')} (CSV)</Dropdown.Item>
// 						</Dropdown.Menu>
// 					</Dropdown>
// 				</Menu>
// 				<br/>
// 				<div style={{margin: '0.5em 1em', fontStyle: 'italic'}}>({t('profile.switch_to_english')})</div>
// 				<Tab menu={{ secondary: true, pointing: true }} panes={panes} />
// 			</>
// 		)) || <></>;
// 	}

// 	async _exportExcel() {
// 		const { playerData } = this.context.player;
// 		const { t, SHIP_TRAIT_NAMES } = this.context.localized;
// 		const { all_ships, crew: allcrew, items } = this.context.core;

// 		let itemdata = playerData?.player?.character?.items ? mergeItems(playerData.player.character.items.map(item => item as EquipmentItem), items) : undefined;
// 		let shipdata = playerData ? mergeRefShips(all_ships, playerData.player.character.ships, SHIP_TRAIT_NAMES) : undefined;

// 		let crewFields = exportCrewFields(t);
// 		let shipFields = exportShipFields();
// 		let itemFields = exportItemFields();

// 		let workbook = new Workbook();
// 		workbook.creator = 'DataCore';
// 		workbook.lastModifiedBy = 'DataCore';
// 		workbook.created = new Date(2020, 1, 1);
// 		workbook.modified = new Date(2020, 1, 1);
// 		workbook.lastPrinted = new Date(2020, 1, 1);

// 		// ----------- Crew
// 		let crewsheet = workbook.addWorksheet('Crew', {
// 			properties: { tabColor: { argb: 'FFC0000' } },
// 			views: [{ state: 'frozen', ySplit: 1 }]
// 		});

// 		crewsheet.columns = crewFields.map(field => ({
// 			header: field.label,
// 			key: field.label
// 		}));

// 		for (let crew of playerData?.player.character.crew.concat(playerData.player.character?.unOwnedCrew ?? []) ?? []) {
// 			let row = {};
// 			for (let field of crewFields) {
// 				row[field.label] = field.value(crew);
// 			}

// 			crewsheet.addRow(row);
// 		}

// 		// ----------- Items
// 		let itemsheet = workbook.addWorksheet('Items', {
// 			//properties: { tabColor: { argb: 'FFC0000' } },
// 			views: [{ state: 'frozen', ySplit: 1 }]
// 		});

// 		itemsheet.columns = itemFields.map(field => ({
// 			header: field.label,
// 			key: field.label
// 		}));

// 		for (let item of itemdata ?? []) {
// 			let row = {};
// 			for (let field of itemFields) {
// 				row[field.label] = field.value(item);
// 			}

// 			itemsheet.addRow(row);
// 		}

// 		// ----------- Ships
// 		let shipsheet = workbook.addWorksheet('Ships', {
// 			//properties: { tabColor: { argb: 'FFC0000' } },
// 			views: [{ state: 'frozen', ySplit: 1 }]
// 		});

// 		shipsheet.columns = shipFields.map(field => ({
// 			header: field.label,
// 			key: field.label
// 		}));

// 		for (let item of shipdata ?? []) {
// 			let row = {};
// 			for (let field of shipFields) {
// 				row[field.label] = field.value(item);
// 			}

// 			shipsheet.addRow(row);
// 		}

// 		// ----------- Demands
// 		let demandsheet = workbook.addWorksheet('Equipment', {
// 			//properties: { tabColor: { argb: 'FFC0000' } },
// 			views: [{ state: 'frozen', ySplit: 1 }]
// 		});

// 		let allRows = [] as { startLevel: number, craftCost: number, crew: string }[];
// 		let allDemandItems = new Set<string>();
// 		for (let crew of playerData?.player.character.crew ?? []) {
// 			let acrew = allcrew.find(c => c.symbol === crew.symbol);

// 			let startLevel = crew.level - (crew.level % 10);
// 			if (crew.equipment.length < 4) {
// 				// If it's not fully equipped for this level band, we include the previous band as well
// 				startLevel = Math.max(1, startLevel - 10);
// 			} else if (crew.level === 100) {
// 				// maxed crew, don't care
// 				continue;
// 			}

// 			let craftCost = 0;
// 			let demands: IDemand[] = [];
// 			let dupeChecker = new Set<string>();
// 			// all levels past crew.level
// 			acrew?.equipment_slots
// 				.filter(es => es.level >= startLevel)
// 				.forEach(es => {
// 					craftCost += demandsPerSlot(es, items, dupeChecker, demands, crew.symbol);
// 				});

// 			for (let elem of dupeChecker) {
// 				allDemandItems.add(elem);
// 			}

// 			let row = { startLevel, craftCost, crew: crew.name };
// 			for (let demand of demands) {
// 				row[demand.symbol] = demand.count;
// 			}
// 			allRows.push(row);
// 		}

// 		let demandcolumns = [
// 			{
// 				header: 'Crew',
// 				key: 'crew'
// 			},
// 			{
// 				header: 'Level',
// 				key: 'startLevel'
// 			},
// 			{
// 				header: 'Craft cost',
// 				key: 'craftCost'
// 			}
// 		];

// 		for (let elem of allDemandItems) {
// 			let itElem = items.find(it => it.symbol === elem);
// 			if (itElem) {
// 				demandcolumns.push({
// 					header: `${CONFIG.RARITIES[itElem.rarity].name} ${itElem.name}`,
// 					key: elem
// 				});
// 			}
// 		}

// 		demandsheet.columns = demandcolumns;

// 		for (let row of allRows) {
// 			for (let elem of allDemandItems) {
// 				if (!row[elem]) {
// 					row[elem] = 0;
// 				}
// 			}
// 			demandsheet.addRow(row);
// 		}

// 		let buf = await workbook.xlsx.writeBuffer();
// 		let blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
// 		download('datacore.xlsx', blob);
// 	}

// 	_exportCrew() {
// 		const { playerData } = this.context.player;
// 		const { t } = this.context.localized;

// 		let text = playerData ? exportCrew(t, playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew ?? [])) : "";
// 		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
// 	}

// 	_exportShips() {
// 		const { playerData } = this.context.player;
// 		const { all_ships } = this.context.core;
// 		const { SHIP_TRAIT_NAMES } = this.context.localized;

// 		let data = playerData ? mergeRefShips(all_ships, playerData.player.character.ships, SHIP_TRAIT_NAMES) : [];
// 		let text = exportShips(data);
// 		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'ships.csv');
// 	}

// 	_exportItems() {
// 		const { playerData } = this.context.player;
// 		const { items } = this.context.core;
// 		let data = playerData ? mergeItems(playerData?.player?.character?.items?.map(item => item as EquipmentItem), items) : [] as EquipmentItem[];
// 		let text = exportItems(data);
// 		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'items.csv');
// 	}

// 	renderMobile() {
// 		return <ProfileCrewMobile isMobile={true} />;
// 	}

// 	render() {
// 		const { dbid, errorMessage, mobile } = this.state;
// 		const { playerData } = this.context.player;

// 		if (playerData === undefined || dbid === undefined || errorMessage !== undefined) {
// 			return (
// 				<>
// 					<Header as='h4'>Player profile</Header>
// 					{errorMessage && (
// 						<Message negative>
// 							<Message.Header>Unable to load profile</Message.Header>
// 							<p>
// 								Failed to find the player profile you were searching. Make sure you have the right URL, or contact the player and ask them
// 								to reupload their profile.
// 								</p>
// 							<pre>{errorMessage.toString()}</pre>
// 						</Message>
// 					)}
// 					<p>
// 						Are you looking to share your player profile? Go to the <Link to={`/playertools`}>Player Tools page</Link> to upload your
// 							player.json and access other useful player tools.
// 						</p>
// 					{!errorMessage && (
// 						<div>
// 							<Icon loading name='spinner' /> Loading...
// 						</div>
// 					)}
// 				</>
// 			);
// 		}

// 		if (mobile) {
// 			return this.renderMobile();
// 		} else {
// 			return this.renderDesktop();
// 		}
// 	}
// }

export default ProfilePage;
