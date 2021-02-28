import React, { Component } from 'react';
import { Container, Header, Label, Message, Item, Tab, Icon, Dropdown, Menu } from 'semantic-ui-react';
import { Link } from 'gatsby';
import { isMobile } from 'react-device-detect';
import { Workbook } from 'exceljs';

import Layout from '../components/layout';
import ProfileCrew from '../components/profile_crew';
import ProfileCrewMobile from '../components/profile_crew2';
import ProfileShips from '../components/profile_ships';
import ProfileItems from '../components/profile_items';
import ProfileOther from '../components/profile_other';
import ProfileCharts from '../components/profile_charts';

import { downloadData, download, exportCrew, exportCrewFields, prepareProfileData } from '../utils/crewutils';
import { mergeShips, exportShips, exportShipFields } from '../utils/shiputils';
import { mergeItems, exportItems, exportItemFields } from '../utils/itemutils';
import { demandsPerSlot, IDemand } from '../utils/equipment';

import CONFIG from '../components/CONFIG';

type ProfilePageProps = {};

type ProfilePageState = {
	dbid?: string;
	errorMessage?: string;
	playerData?: any;
	mobile: boolean;
};

class ProfilePage extends Component<ProfilePageProps, ProfilePageState> {
	constructor(props: ProfilePageProps) {
		super(props);

		this.state = {
			dbid: undefined,
			errorMessage: undefined,
			playerData: undefined,
			mobile: false
		};
	}

	componentDidMount() {
		let urlParams = new URLSearchParams(window.location.search);
		if (isMobile || (urlParams.has('mobile') && urlParams.get('mobile'))) {
			this.setState({ mobile: true });
		}
		if (urlParams.has('dbid')) {
			this.setState({ dbid: urlParams.get('dbid') });
		} else if (urlParams.has('discord') && window.location.hash !== '') {
			let discordUsername = urlParams.get('discord');
			let discordDiscriminator = window.location.hash.replace('#', '');
			fetch(`${process.env.GATSBY_DATACORE_URL}api/get_dbid_from_discord?username=${discordUsername}&discriminator=${discordDiscriminator}`)
				.then(response => {
					return response.json();
				})
				.then(data => {
					if (data && data.dbid) {
						this.setState({ dbid: data.dbid });
					}
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	componentDidUpdate() {
		const { dbid, playerData, errorMessage } = this.state;
		if (dbid && !playerData && !errorMessage ) {
			let lastModified = undefined;

			fetch(`${process.env.GATSBY_DATACORE_URL}profiles/` + dbid)
				.then(response => {
					lastModified = new Date(Date.parse(response.headers.get('Last-Modified')));

					return response.json();
				})
				.then(playerData => {
					fetch('/structured/crew.json')
						.then(response => response.json())
						.then(allcrew => {
							// Do some computation on the data to avoid doing it on every render
							prepareProfileData(allcrew, playerData, lastModified);

							this.setState({ playerData });
						});
				})
				.catch(err => {
					this.setState({ errorMessage: err });
				});
		}
	}

	renderDesktop() {
		const { playerData } = this.state;

		const panes = [
			{
				menuItem: 'Crew',
				render: () => <ProfileCrew playerData={this.state.playerData} />
			},
			{
				menuItem: 'Crew (mobile)',
				render: () => <ProfileCrewMobile playerData={this.state.playerData} isMobile={false} />
			},
			{
				menuItem: 'Ships',
				render: () => <ProfileShips playerData={this.state.playerData} />
			},
			{
				menuItem: 'Items',
				render: () => <ProfileItems playerData={this.state.playerData} />
			},
			{
				menuItem: 'Other',
				render: () => <ProfileOther playerData={this.state.playerData} />
			},
			{
				menuItem: 'Charts & Stats',
				render: () => <ProfileCharts playerData={this.state.playerData} />
			}
		];

		return (
			<Layout title={playerData.player.character.display_name}>
				<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
					<Item.Group>
						<Item>
							<Item.Image
								size='tiny'
								src={`${process.env.GATSBY_ASSETS_URL}${
									playerData.player.character.crew_avatar
										? playerData.player.character.crew_avatar.portrait
										: 'crew_portraits_cm_empty_sm.png'
								}`}
							/>

							<Item.Content>
								<Item.Header>{playerData.player.character.display_name}</Item.Header>
								<Item.Meta>
									<Label>VIP {playerData.player.vip_level}</Label>
									<Label>Level {playerData.player.character.level}</Label>
									<Label>{playerData.calc.numImmortals} crew</Label>
									<Label>{playerData.player.character.shuttle_bays} shuttles</Label>
								</Item.Meta>
								<Item.Description>
									{playerData.player.fleet && (
										<p>
											Fleet{' '}
											<Link to={`/fleet_info?fleetid=${playerData.player.fleet.id}`}>
												<b>{playerData.player.fleet.slabel}</b>
											</Link>{' '}
											({playerData.player.fleet.rank}) Starbase level {playerData.player.fleet.nstarbase_level}{' '}
										</p>
									)}
								</Item.Description>
							</Item.Content>
						</Item>
					</Item.Group>

					<Menu compact>
						<Menu.Item>
							{playerData.calc.lastModified ? <span>Last updated: {playerData.calc.lastModified.toLocaleString()}</span> : <span />}
						</Menu.Item>
						<Dropdown item text='Download'>
							<Dropdown.Menu>
								<Dropdown.Item onClick={() => this._exportExcel()}>Complete spreadsheet (XLSX)</Dropdown.Item>
								<Dropdown.Item onClick={() => this._exportCrew()}>Crew table (CSV)</Dropdown.Item>
								<Dropdown.Item onClick={() => this._exportShips()}>Ship table (CSV)</Dropdown.Item>
								<Dropdown.Item onClick={() => this._exportItems()}>Item table (CSV)</Dropdown.Item>
							</Dropdown.Menu>
						</Dropdown>
					</Menu>
					<Tab menu={{ secondary: true, pointing: true }} panes={panes} />
				</Container>
			</Layout>
		);
	}

	async _exportExcel() {
		const { playerData } = this.state;

		let response = await fetch('/structured/items.json');
		let items = await response.json();

		response = await fetch('/structured/ship_schematics.json');
		let ship_schematics = await response.json();

		response = await fetch('/structured/crew.json');
		let allcrew = await response.json();

		let itemdata = mergeItems(playerData.player.character.items, items);
		let shipdata = mergeShips(ship_schematics, playerData.player.character.ships);

		let crewFields = exportCrewFields();
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

		for (let crew of playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew)) {
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

		for (let item of itemdata) {
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

		for (let item of shipdata) {
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

		let allRows = [];
		let allDemandItems = new Set<string>();
		for (let crew of playerData.player.character.crew) {
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
			acrew.equipment_slots
				.filter(es => es.level >= startLevel)
				.forEach(es => {
					craftCost += demandsPerSlot(es, items, dupeChecker, demands);
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
			demandcolumns.push({
				header: `${CONFIG.RARITIES[itElem.rarity].name} ${itElem.name}`,
				key: elem
			});
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

	_exportCrew() {
		const { playerData } = this.state;

		let text = exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew));
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	_exportShips() {
		const { playerData } = this.state;

		fetch('/structured/ship_schematics.json')
			.then(response => response.json())
			.then(ship_schematics => {
				let data = mergeShips(ship_schematics, playerData.player.character.ships);
				let text = exportShips(data);
				downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'ships.csv');
			});
	}

	_exportItems() {
		const { playerData } = this.state;

		fetch('/structured/items.json')
			.then(response => response.json())
			.then(items => {
				let data = mergeItems(playerData.player.character.items, items);
				let text = exportItems(data);
				downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'items.csv');
			});
	}

	renderMobile() {
		return <ProfileCrewMobile playerData={this.state.playerData} isMobile={true} />;
	}

	render() {
		const { dbid, errorMessage, playerData, mobile } = this.state;

		if (playerData === undefined || dbid === undefined || errorMessage !== undefined) {
			return (
				<Layout title='Player profile'>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Header as='h4'>Player profile</Header>
						{errorMessage && (
							<Message negative>
								<Message.Header>Unable to load profile</Message.Header>
								<p>
									Failed to find the player profile you were searching. Make sure you have the right URL, or contact the player and ask them
									to reupload their profile.
								</p>
								<pre>{errorMessage.toString()}</pre>
							</Message>
						)}
						<p>
							Are you looking to share your player profile? Go to the <Link to={`/voyage`}>Player Tools page</Link> to upload your
							player.json and access other useful player tools.
						</p>
						{!errorMessage && (
							<div>
								<Icon loading name='spinner' /> Loading...
							</div>
						)}
					</Container>
				</Layout>
			);
		}

		if (mobile) {
			return this.renderMobile();
		} else {
			return this.renderDesktop();
		}
	}
}

export default ProfilePage;
