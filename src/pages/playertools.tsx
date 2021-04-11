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
import { useStateWithStorage } from '../utils/storage';

const PlayerToolsPage = () => {
	const [playerData, setPlayerData] = React.useState(undefined);
	const [inputPlayerData, setInputPlayerData] = React.useState(undefined);

	// allCrew will always be set and can be passed as a prop to subcomponents that need it, saving a fetch to crew.json
	// allItems is NOT always set; it can be passed to subcomponents but requires a check to see if defined
	const [allCrew, setAllCrew] = React.useState(undefined);
	const [allItems, setAllItems] = React.useState(undefined);

	const [strippedPlayerData, setStrippedPlayerData] = useStateWithStorage('toolsPlayerData', undefined);
	const [voyageData, setVoyageData] = useStateWithStorage('toolsVoyageData', undefined);
	const [eventData, setEventData] = useStateWithStorage('toolsEventData', undefined);
	const [activeIndex, setActiveIndex] = useStateWithStorage('toolsActiveIndex', 0);
	const [showShare, setShowShare] = useStateWithStorage('toolsShowShare', true, { rememberForever: true });

	const [showForm, setShowForm] = React.useState(false);

	// Profile data ready, show player tool panes
	if (playerData && !showForm) {
		return renderTools();
	}

	// Preparing profile data, show spinner
	if ((inputPlayerData || strippedPlayerData) && !showForm) {
		if (inputPlayerData) {
			if (allCrew && allItems)
				prepareProfileDataFromInput();
			else if (!allItems)
				fetchAllItemsAndCrew();
		}
		else {
			if (allCrew)
				prepareProfileDataFromSession();
			else
				fetchAllCrew();
		}
		return renderSpinner();
	}

	// No data available, show input form
	return (<PlayerToolsForm setValidInput={setValidInput} />);

	function renderTools() {
		const handleTabChange = (e, { activeIndex }) => setActiveIndex(activeIndex);

		const panes = [
			{
				menuItem: 'Voyage Calculator',
				render: () => <VoyageCalculator playerData={playerData} voyageData={voyageData} eventData={eventData} />
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

		const StaleMessage = () => {
			const STALETHRESHOLD = 1;	// in hours
			if (new Date().getTime()-playerData.calc.lastModified.getTime() > STALETHRESHOLD*60*60*1000) {
				return (
					<Message
						warning
						icon='clock'
						header='Update your player data'
						content="It's been a few hours since you last updated your player data. We recommend that you update now to make sure our tools are providing you recent information about your crew."
					/>
				);
			}
			else {
				return (<></>);
			}
		};

		return (
			<Layout title='Player tools'>
				<Header as='h4'>Hello, {playerData.player.character.display_name}</Header>

				<StaleMessage />
				<Menu compact stackable>
					<Menu.Item>
						Last imported: {playerData.calc.lastModified.toLocaleString()}
					</Menu.Item>
					<Dropdown item text='Profile options'>
						<Dropdown.Menu>
							<Dropdown.Item onClick={() => setShowForm(true)}>Update now...</Dropdown.Item>
							{!showShare && (<Dropdown.Item onClick={() => setShowShare(true)}>Share profile...</Dropdown.Item>)}
							<Dropdown.Item onClick={() => clearPlayerData()}>Clear player data</Dropdown.Item>
						</Dropdown.Menu>
					</Dropdown>
					<Button onClick={() => exportCrewTool()} content='Export crew spreadsheet...' />
				</Menu>

				{showShare && (<PlayerToolsShare playerData={playerData} strippedPlayerData={strippedPlayerData} setShowShare={setShowShare} />)}

				<Tab menu={{ secondary: true, pointing: true }} panes={panes} style={{ marginTop: '1em' }}
					activeIndex={activeIndex} onTabChange={handleTabChange} />
			</Layout>
		);
	}

	function renderSpinner() {
		return (
			<Layout title='Player tools'>
				<Icon loading name='spinner' /> Loading...
			</Layout>
		);
	}

	function setValidInput(inputData : any) {
		setPlayerData(undefined);
		setInputPlayerData(inputData);
		setShowForm(false);
	}

	async function fetchAllItemsAndCrew() {
		const [itemsResponse, crewResponse] = await Promise.all([
			fetch('/structured/items.json'),
			fetch('/structured/crew.json')
		]);
		const [allitems, allcrew] = await Promise.all([
			itemsResponse.json(),
			crewResponse.json()
		]);
		setAllItems(allitems);
		setAllCrew(allcrew);
	}

	// Only crew data is needed if loading profile from session
	//	Does this really save any time, or should we just use fetchAllItemsAndCrew every time playertools is loaded?
	async function fetchAllCrew() {
		const crewResponse = await fetch('/structured/crew.json');
		const allcrew = await crewResponse.json();
		setAllCrew(allcrew);
	}

	function prepareProfileDataFromInput() {
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
			voyage_descriptions: [...inputPlayerData.player.character.voyage_descriptions],
			voyage: [...inputPlayerData.player.character.voyage],
			shuttle_crew: shuttleCrew
		}
		setVoyageData(voyageData);
		setEventData([...inputPlayerData.player.character.events]);

		let dtImported = new Date();

		// strippedPlayerData is used for any storage purpose, i.e. sharing profile and keeping in session
		let strippedData = stripPlayerData(allItems, {...inputPlayerData});
		strippedData.calc = { 'lastImported': dtImported };
		setStrippedPlayerData(JSON.parse(JSON.stringify(strippedData)));

		// preparedProfileData is expanded with useful data and helpers for DataCore and hopefully generated once
		//	so other components don't have to keep calculating the same data
		// After this point, playerData should always be preparedProfileData, here and in all components
		let preparedProfileData = {...strippedData};
		prepareProfileData(allCrew, preparedProfileData, dtImported);
		setPlayerData(preparedProfileData);
	}

	function prepareProfileDataFromSession() {
		let preparedProfileData = {...strippedPlayerData};
		prepareProfileData(allCrew, preparedProfileData, new Date(Date.parse(strippedPlayerData.calc.lastImported)));
		setPlayerData(preparedProfileData);
	}

	function clearPlayerData() {
		sessionStorage.clear();	// also clears form data for all subcomponents
		[setPlayerData, setInputPlayerData, setStrippedPlayerData]
			.forEach(setFn => { setFn(undefined); });
	}

	function exportCrewTool() {
		let text = exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew));
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}
}

type PlayerToolsShareProps = {
	playerData: any;
	strippedPlayerData: any;
	setShowShare: fn;
};

const PlayerToolsShare = (props: PlayerToolsShareProps) => {
	const { playerData, strippedPlayerData, setShowShare } = props;

	const [profileUploaded, setProfileUploaded] = React.useState(false);
	const [profileUploading, setProfileUploading] = React.useState(false);

	return (
		<Message icon onDismiss={handleDismiss}>
			<Icon name='bell' />
			<Message.Content>
				<Message.Header>Share your player profile!</Message.Header>
				{!profileUploaded && (
					<p>
						Click here to{' '}
						<Button size='small' color='green' onClick={() => shareProfile()}>
							{profileUploading && <Icon loading name='spinner' />}share your profile
							</Button>{' '}
							and unlock more tools and export options for items and ships. More details:
					</p>
				)}
				{!profileUploaded && (
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
				{profileUploaded && (
					<p>
						Your profile was uploaded. Share the link:{' '}
						<a
							href={`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}
							target='_blank'>{`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}</a>
					</p>
				)}
			</Message.Content>
		</Message>
	);

	function shareProfile() {
		setProfileUploading(true);

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
			setProfileUploading(false);
			setProfileUploaded(true);
		});
	}

	function handleDismiss() {
		setShowShare(false);
	}
};

type PlayerToolsFormProps = {
	setValidInput: fn;
};

const PlayerToolsForm = (props: PlayerToolsFormProps) => {
	const PLAYERLINK = 'https://stt.disruptorbeam.com/player?client_api=17';

	const { setValidInput } = props;

	const [inputPlayerData, setInputPlayerData] = React.useState(undefined);
	const [fullInput, setFullInput] = React.useState('');
	const [displayedInput, setDisplayedInput] = React.useState('');
	const [errorMessage, setErrorMessage] = React.useState(undefined);

	let inputUploadFile = null;

	if (fullInput != "")
		parseInput();

	React.useEffect(() => {
		if (inputPlayerData) {
			setValidInput(inputPlayerData);
			setInputPlayerData(undefined);
		}
	}, [inputPlayerData]);

	return (
		<Layout>
			<Container style={{ paddingBottom: '2em' }}>
				<Header as='h2'>Player tools</Header>
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
						value={displayedInput}
						onChange={(e, { value }) => setDisplayedInput(value)}
						onPaste={(e) => { return onInputPaste(e) }}
					/>
					<input
						type='file'
						onChange={(e) => { handleFileUpload(e) }}
						style={{ display: 'none' }}
						ref={e => inputUploadFile = e}
					/>
				</Form>

				<Button
					onClick={() => parseInput()}
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
				onClick={() => inputUploadFile.click()}
				content='Upload data file'
				icon='file'
				labelPosition='right'
			/>
		</Layout>
	);

	function parseInput() {
		let testInput = fullInput;

		// Use inputted text if no pasted text detected
		if (testInput == '') testInput = displayedInput;

		try {
			let testData = JSON.parse(testInput as string);

			if (testData && testData.player && testData.player.display_name) {
				if (testData.player.character && testData.player.character.crew && (testData.player.character.crew.length > 0)) {
					setInputPlayerData(testData);
					setDisplayedInput('');
					setErrorMessage(undefined);
				} else {
					setErrorMessage('Failed to parse player data from the text you pasted. Make sure you are logged in with the correct account.');
				}
			} else {
				setErrorMessage('Failed to parse player data from the text you pasted. Make sure the page is loaded correctly and you copied the entire contents!');
			}
		} catch (err) {
			if ((/Log in to CS Tools/).test(testInput)) {
				setErrorMessage('You are not logged in! Open the player data link above and log in to the game as instructed. Then return to this DataCore page and repeat all the steps to import your data.');
			}
			else {
				setErrorMessage(`Failed to read the data. Make sure the page is loaded correctly and you copied the entire contents! (${err})`);
			}
		}

		setFullInput('');
	}

	function onInputPaste(event) {
		let paste = event.clipboardData || window.clipboardData;
		if (paste) {
			let fullPaste = paste.getData('text');
			setFullInput(fullPaste);
			setDisplayedInput(fullPaste.substr(0, 500)+' [ ... ]');
			event.preventDefault();
			return false;
		}
		return true;
	}

	function handleFileUpload(event) {
		// use FileReader to read file content in browser
		const fReader = new FileReader();
		fReader.onload = (e) => {
			let data = e.target.result.toString();
			// Handle Apple webarchive wrapping
			if (data.match(/^bplist00/)) {
				// Find where the JSON begins and ends, and extract just that from the larger string.
				data = data.substring(data.indexOf('{'), data.lastIndexOf('}}') + 2);
			}
			setFullInput(data);
		};
		fReader.readAsText(event.target.files[0]);
	}
};

export default PlayerToolsPage;