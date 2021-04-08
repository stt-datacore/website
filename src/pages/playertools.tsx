import React, { Component } from 'react';
import { Container, Header, Message, Tab, Icon, Dropdown, Menu, Button, Form, TextArea, Modal } from 'semantic-ui-react';

import Layout from '../components/layout';
import ProfileCrew from '../components/profile_crew';
import ProfileCrewMobile from '../components/profile_crew2';
import ProfileShips from '../components/profile_ships';
import ProfileItems from '../components/profile_items';
import ProfileOther from '../components/profile_other';
import ProfileCharts from '../components/profile_charts';

import VoyageCalculator from '../components/voyagecalculator_iap';
import CrewRetrieval from '../components/crewretrieval';
import UnneededItems from '../components/unneededitems';

import { exportCrew, downloadData, prepareProfileData } from '../utils/crewutils';
import { stripPlayerData } from '../utils/playerutils';

type PlayerToolsPageProps = {};

type PlayerToolsPageState = {
	playerData?: any;
	inputPlayerData?: any;
	strippedPlayerData?: any;
	errorMessage?: string;
	fullInput: string | number;
	displayedInput: string | number;
	profileUploading: boolean;
	profileUploaded: boolean;
	voyageData?: any;
	eventData?: any;
};

const PLAYERLINK = 'https://stt.disruptorbeam.com/player?client_api=17';

const asyncSessionStorage = {
	setItem: async function (key, value) {
		await null;
		return sessionStorage.setItem(key, value);
	},
	getItem: async function (key) {
		await null;
		return sessionStorage.getItem(key);
	},
	clear: async function () {
		await null;
		return sessionStorage.clear();
	}
};

class PlayerToolsPage extends Component<PlayerToolsPageProps, PlayerToolsPageState> {
	constructor(props: PlayerToolsPageProps) {
		super(props);

		this.state = {
			playerData: undefined,
			inputPlayerData: undefined,
			strippedPlayerData: undefined,
			errorMessage: undefined,
			fullInput: '',
			displayedInput: '',
			profileUploading: false,
			profileUploaded: false,
			voyageData: undefined,
			eventData: undefined
		};
	}

	async componentDidMount() {
		let strippedPlayerData = await asyncSessionStorage.getItem('playerData');
		if (strippedPlayerData) {
			let voyageData = await asyncSessionStorage.getItem('voyageData');
			let eventData = await asyncSessionStorage.getItem('eventData');
			strippedPlayerData = JSON.parse(strippedPlayerData);
			if (voyageData) voyageData = JSON.parse(voyageData);
			if (eventData) eventData = JSON.parse(eventData);
			this.setState({ strippedPlayerData, voyageData, eventData });
		}
	}

	componentDidUpdate() {
		if (!this.state.playerData && this.state.inputPlayerData)
			this._prepareProfileDataFromInput();
		else if (!this.state.playerData && this.state.strippedPlayerData) {
			this._prepareProfileDataFromSession();
		}
	}

	async _prepareProfileDataFromInput() {
		const { inputPlayerData } = this.state;

		const [crewResponse, itemsResponse] = await Promise.all([
			fetch('/structured/crew.json'),
			fetch('/structured/items.json')
		]);

		const allcrew = await crewResponse.json();
		const allitems = await itemsResponse.json();

		// Crew on shuttles, voyage data, and event data will be stripped from playerData,
		//	so keep a copy for voyage calculator here
		//	Event data is not player-specific, so we should find a way to get that outside of playerData
		let shuttleCrew = [];
		inputPlayerData.player.character.crew.forEach(crew => {
			if (crew.active_id > 0) {
				// Stripped data doesn't include crewId, so create pseudoId based on level and equipment
				let shuttleCrewId = crew.symbol + ',' + crew.level + ',';
				crew.equipment.forEach(equipment => shuttleCrewId += equipment[0]);
				shuttleCrew.push(shuttleCrewId);
			}
		});
		let voyageData = {
			voyage_descriptions: JSON.parse(JSON.stringify(inputPlayerData.player.character.voyage_descriptions)),
			voyage: JSON.parse(JSON.stringify(inputPlayerData.player.character.voyage)),
			shuttle_crew: shuttleCrew
		}
		let eventData = JSON.parse(JSON.stringify(inputPlayerData.player.character.events));

		let dtImported = new Date();

		// strippedPlayerData is used for any storage purpose, i.e. sharing profile and keeping in session
		let strippedPlayerData = stripPlayerData(allitems, JSON.parse(JSON.stringify(inputPlayerData)));
		strippedPlayerData.calc = { 'lastImported': dtImported };

		// preparedProfileData is expanded with useful data and helpers for DataCore and hopefully generated once
		//	so other components don't have to keep calculating the same data
		let preparedProfileData = JSON.parse(JSON.stringify(strippedPlayerData));
		prepareProfileData(allcrew, preparedProfileData, dtImported);

		// Store strippedPlayerData in session, so user doesn't have to re-import after leaving playertools page
		//	Must also store voyage and event data for voyage calculator
		asyncSessionStorage.setItem('playerData', JSON.stringify(strippedPlayerData));
		asyncSessionStorage.setItem('voyageData', JSON.stringify(voyageData));
		asyncSessionStorage.setItem('eventData', JSON.stringify(eventData));

		// After this point, playerData should always be preparedProfileData, here and in all components
		this.setState({ playerData: preparedProfileData, strippedPlayerData, voyageData, eventData });
	}

	async _prepareProfileDataFromSession() {
		const { strippedPlayerData } = this.state;

		const [crewResponse] = await Promise.all([
			fetch('/structured/crew.json'),
		]);

		const allcrew = await crewResponse.json();

		let preparedProfileData = JSON.parse(JSON.stringify(strippedPlayerData));
		prepareProfileData(allcrew, preparedProfileData, new Date(Date.parse(strippedPlayerData.calc.lastImported)));

		this.setState({ playerData: preparedProfileData });
	}

	render() {
		const { playerData, inputPlayerData, strippedPlayerData } = this.state;

		if (!playerData && (inputPlayerData || strippedPlayerData)) {
			return (
				<Layout title='Player tools'>
					<Icon loading name='spinner' /> Loading...
				</Layout>
			);
		}

		if (!playerData)
			return this.renderInputForm();

		const panes = [
			{
				menuItem: 'Voyage Calculator',
				render: () => <VoyageCalculator playerData={playerData} voyageData={this.state.voyageData} eventData={this.state.eventData} />
			},
			{
				menuItem: 'Crew',
				render: () => <ProfileCrew playerData={playerData} isTools={true} />
			},
			{
				menuItem: 'Crew (mobile)',
				render: () => <ProfileCrewMobile playerData={playerData} isMobile={false} />
			},
			{
				menuItem: 'Crew Retrieval',
				render: () => <CrewRetrieval playerData={playerData} />
			},
			{
				menuItem: 'Ships',
				render: () => <ProfileShips playerData={playerData} />
			},
			{
				menuItem: 'Items',
				render: () => <ProfileItems playerData={playerData} />
			},
			{
				menuItem: 'Unneeded Items',
				render: () => <UnneededItems playerData={playerData} />
			},
			{
				menuItem: 'Other',
				render: () => <ProfileOther playerData={playerData} />
			},
			{
				menuItem: 'Charts & Stats',
				render: () => <ProfileCharts playerData={playerData} />
			}
		];

		return (
			<Layout title='Player tools'>
				<Header as='h4'>Hello, {playerData.player.character.display_name}</Header>
				<Message icon>
					<Icon name='bell' />
					<Message.Content>
						<Message.Header>Share your player profile!</Message.Header>
						{!this.state.profileUploaded && (
							<p>
								Click here to{' '}
								<Button size='small' color='green' onClick={() => this._shareProfile()}>
									{this.state.uploading && <Icon loading name='spinner' />}share your profile
									</Button>{' '}
									and unlock more tools and export options for items and ships. More details:
							</p>
						)}
						{!this.state.profileUploaded && (
							<Message.List>
								<Message.Item>
									Once shared, the profile will be publicly accessible by anyone that has the link (or knows your DBID)
									</Message.Item>
								<Message.Item>
									There is no private information included in the player profile; information being shared is limited to:{' '}
									<b>captain name, level, vip level, fleet name and role, achievements, completed missions, your crew, items and ships.</b>
								</Message.Item>
							</Message.List>
						)}
						{this.state.profileUploaded && (
							<p>
								Your profile was uploaded. Share the link:{' '}
								<a
									href={`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}
									target='_blank'>{`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}</a>
							</p>
						)}
					</Message.Content>
				</Message>

				<Menu compact>
					{playerData.calc.lastModified && (
						<Dropdown item text={`Player data imported: ${playerData.calc.lastModified.toLocaleString()}`}>
							<Dropdown.Menu>
								<Dropdown.Item onClick={() => this._forceInputForm()}>Update now...</Dropdown.Item>
								<Dropdown.Item onClick={() => this._clearPlayerData()}>Clear player data</Dropdown.Item>
							</Dropdown.Menu>
						</Dropdown>
					)}
					<Button onClick={() => this._exportCrew()} content='Export crew spreadsheet...' />
				</Menu>

				<Tab menu={{ secondary: true, pointing: true }} panes={panes} style={{ marginTop: '1em' }} />
			</Layout>
		);
	}

	_clearPlayerData() {
		asyncSessionStorage.clear();
		this._forceInputForm();
	}

	_forceInputForm() {
		this.setState({
			playerData: undefined,
			inputPlayerData: undefined,
			strippedPlayerData: undefined,
			fullInput: '',
			displayedInput: ''
		});
	}

	_shareProfile() {
		this.setState({ profileUploading: true });
		const { playerData, strippedPlayerData } = this.state;

		let jsonBody = JSON.stringify({
			dbid: playerData.player.dbid,
			player_data: strippedPlayerData
		});

		fetch(`${process.env.GATSBY_DATACORE_URL}api/post_profile`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: jsonBody
		}).then(() => {
			window.open(`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`, '_blank');
			this.setState({ profileUploading: false, profileUploaded: true });
		});
	}

	_exportCrew() {
		const { playerData } = this.state;

		let text = exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew));
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	renderInputForm() {
		const { errorMessage } = this.state;

		return (
			<Layout>
				<Container style={{ paddingBottom: '2em' }}>
					<Header as='h4'>Player tools</Header>
					<p>You can access some of your player data from the game's website and import it here to calculate optimal voyage lineups, identify unnecessary items, export your crew list as a CSV, or share your profile with other players, among other tools. This website cannot make direct requests to the game's servers due to security configurations and unclear terms of service interpretations, so there are a few manual steps required to import your data.</p>
					<p>If you have multiple accounts, we recommend using your browser in InPrivate mode (Edge) or Incognito mode (Firefox / Chrome) to avoid caching your account credentials, making it easier to change accounts.</p>
					<ul>
						<li>
							Open this page in your browser:{' '}
							<a href={PLAYERLINK} target='_blank'>
								https://stt.disruptorbeam.com/player
								</a>
						</li>
						<li>
							Log in if asked, then wait for the page to finish loading. It should start with:{' '}
							<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
							</li>
						<li>Select everything in the page (Ctrl+A) and copy it (Ctrl+C)</li>
						<li>Paste it (Ctrl+V) in the text box below. Note that only the first few lines may be displayed</li>
						<li>Click the 'Import data' button</li>
					</ul>

					<Form>
						<TextArea
							placeholder='Paste your player data here'
							value={this.state.displayedInput}
							onChange={(e, { value }) => this.setState({ displayedInput: value })}
							onPaste={(e) => { return this._onPaste(e) }}
						/>
						<input
							type='file'
							onChange={(e) => { this._handleFileUpload(e) }}
							style={{ display: 'none' }}
							ref={e => this.inputUploadFile = e}
						/>
					</Form>

					<Button
						onClick={() => this._parseInput()}
						style={{ marginTop: '1em' }}
						content='Import data'
						icon='paste'
						labelPosition='right'
					/>

					{errorMessage && (
						<Message negative>
							<Message.Header>Error</Message.Header>
							<p>{errorMessage}</p>
						</Message>
					)}
				</Container>

				<p>To circumvent the long text copy limitations on mobile devices, download{' '}
					<a href={PLAYERLINK} target='_blank'>
						your player data
							</a>
					{' '}to your device, then click the 'Upload data file' button.
						</p>
				<p>
					<Modal
						trigger={<a href="#">Click here for detailed instructions for Apple iOS devices.</a>}
						header='Player data upload on iOS'
						content={<ul>
							<li>Go to your player data using the link provided, logging in if asked.</li>
							<li>Wait for the page to finish loading. It should start with:{' '}
								<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
									</li>
							<li>Press the share icon while viewing the page.</li>
							<li>Tap 'options' and choose 'Web Archive', tap 'save to files', choose a location and save.</li>
							<li>Come back to this page (DataCore.app player tools).</li>
							<li>Tap the 'Upload data file' button.</li>
							<li>Choose the file starting with 'player?client_api...' from where you saved it.</li>
						</ul>}
					/>
				</p>

				<Button
					onClick={() => this.inputUploadFile.click()}
					content='Upload data file'
					icon='file'
					labelPosition='right'
				/>
			</Layout>
		);
	}

	_onPaste(event) {
		let paste = event.clipboardData || window.clipboardData;
		if (paste) {
			let fullInput = paste.getData('text');
			let displayedInput = fullInput.substr(0, 500) + ' [ ... ]';
			this.setState({ fullInput, displayedInput });
			event.preventDefault();
			return false;
		}
		return true;
	}

	_handleFileUpload(event) {
		// use FileReader to read file content in browser
		const fReader = new FileReader();
		fReader.onload = (e) => {
			let data = e.target.result.toString();
			// Handle Apple webarchive wrapping
			if (data.match(/^bplist00/)) {
				// Find where the JSON begins and ends, and extract just that from the larger string.
				data = data.substring(data.indexOf('{'), data.lastIndexOf('}}') + 2);
			}
			this.setState({ fullInput: data });
			this._parseInput();
		};
		fReader.readAsText(event.target.files[0]);
	}

	_parseInput() {
		// Use inputted text if no pasted text detected
		if (this.state.fullInput == '')
			this.setState({ fullInput: this.state.displayedInput });

		try {
			let playerData = JSON.parse(this.state.fullInput as string);

			if (playerData && playerData.player && playerData.player.display_name) {
				if (playerData.player.character && playerData.player.character.crew && (playerData.player.character.crew.length > 0)) {
					this.setState({ inputPlayerData: playerData, errorMessage: undefined });
				} else {
					this.setState({ errorMessage: 'Failed to parse player data from the text you pasted. Make sure you are logged in with the correct account.' });
				}
			} else {
				this.setState({
					errorMessage:
						'Failed to parse player data from the text you pasted. Make sure the page is loaded correctly and you copied the entire contents!'
				});
			}
		} catch (err) {
			this.setState({
				errorMessage: `Failed to read the data. Make sure the page is loaded correctly and you copied the entire contents! (${err})`
			});
		}
	}
}

export default PlayerToolsPage;