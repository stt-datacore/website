import React from 'react';
import { Header, Message, Tab, Icon, Dropdown, Menu, Button, Form, TextArea, Checkbox, Modal, Progress, Popup } from 'semantic-ui-react';

import Layout from '../components/layout';
import ProfileCrew from '../components/profile_crew';
import ProfileCrewMobile from '../components/profile_crew2';
import ProfileShips from '../components/profile_ships';
import ProfileItems from '../components/profile_items';
import ProfileOther from '../components/profile_other';
import ProfileCharts from '../components/profile_charts';

import CiteOptimizer from '../components/citeoptimizer';
import CollectionsTool from '../components/collectionstool';
import EventPlanner from '../components/eventplanner';
import VoyageCalculator from '../components/voyagecalculator';
import CrewRetrieval from '../components/crewretrieval';
import FactionInfo from '../components/factions';
import UnneededItems from '../components/unneededitems';
import FleetBossBattles from '../components/fleetbossbattles';

import { exportCrew, downloadData } from '../utils/crewutils';
import { useStateWithStorage } from '../utils/storage';
import { PlayerCrew, PlayerData } from '../model/player';
import { BossBattlesRoot } from '../model/boss';
import ShipProfile from '../components/ship_profile';
import { Ship } from '../model/ship';
import { MergedContext } from '../context/mergedcontext';
import { BuffStatTable } from '../utils/voyageutils';
import { EquipmentItem } from '../model/equipment';
import { DataWrapper } from '../context/datawrapper';
import { EphemeralData } from '../context/playercontext';

export interface PlayerTool {
	title: string;
	render: (props: { crew?: PlayerCrew, ship?: string, location?: any }) => JSX.Element;
	noMenu?: boolean;
}

export interface PlayerTools {
	[key: string]: PlayerTool;
}

export const playerTools: PlayerTools = {
	'voyage': {
		title: 'Voyage Calculator',
		render: () => <VoyageCalculator />
	},
	'event-planner': {
		title: 'Event Planner',
		render: () => <EventPlanner />
	},
	'crew': {
		title: 'Crew',
		render: ({ location }) => <ProfileCrew isTools={true} location={location} />
	},
	'crew-mobile': {
		title: 'Crew (mobile)',
		render: () => <ProfileCrewMobile isMobile={false} />
	},
	'crew-retrieval': {
		title: 'Crew Retrieval',
		render: () => <CrewRetrieval />
	},
	'cite-optimizer': {
		title: 'Citation Optimizer',
		render: () => <CiteOptimizer />
	},
	'collections': {
		title: 'Collections',
		render: () => <CollectionsTool />
	},
	'fleetbossbattles': {
		title: 'Fleet Boss Battles',
		render: () => <FleetBossBattles />
	},
	'ships': {
		title: 'Ships',
		render: () => <ProfileShips />
	},
	'ship': {
		title: 'Ship Details',
		render: () => <ShipProfile />,
		noMenu: true
	},
	'factions': {
		title: 'Factions',
		render: () => <FactionInfo />
	},
	'items': {
		title: 'Items',
		render: () => <ProfileItems />
	},
	'unneeded': {
		title: 'Unneeded Items',
		render: () => <UnneededItems />
	},
	'other': {
		title: 'Other',
		render: () => <ProfileOther />
	},
	'charts': {
		title: 'Charts & Stats',
		render: () => <ProfileCharts />
	}
};


const PlayerToolsPage = (props: any) => {



	return (
		<DataWrapper header='Player Tools' demands={['ship_schematics', 'crew', 'items', 'skill_bufs']}>
				<PlayerToolsComponent location={props.location} />
		</DataWrapper>
	);
};

export interface PlayerToolsProps {
	location: any;
}

const PlayerToolsComponent = (props: PlayerToolsProps) => {

	const mergedContext = React.useContext(MergedContext);

	// The context above	
	
	const { playerShips, playerData, buffConfig, maxBuffs } = mergedContext;

	// All things playerData

	const [inputPlayerData, setInputPlayerData] = React.useState<PlayerData | undefined>(undefined);
	// [playerShips, setPlayerShips] = React.useState<Ship[]>([]);

	// These are all the static assets loaded from DataContext
	const { dataSource, ephemeral, crew: allCrew, items: allItems, ships: allShips, ship_schematics: schematics, items } = mergedContext;
	const [showForm, setShowForm] = React.useState(false);

	const clearPlayerData = () => {
		if (mergedContext.clearPlayerData) mergedContext.clearPlayerData();
	}
	// Profile data ready, show player tool panes
	if (playerData && dataSource && dataSource && ephemeral && playerShips) {
		return (<PlayerToolsPanes
			maxBuffs={maxBuffs}
			items={items}
			playerData={playerData}
			buffConfig={buffConfig}
			dataSource={dataSource}
			allCrew={allCrew}
			allShips={allShips ?? []}
			ephemeral={ephemeral}
			playerShips={playerShips}
			requestShowForm={setShowForm}
			requestClearData={clearPlayerData}
			location={props.location}
			data={schematics}
		/>);
	}
	else {
		return <></>
	}
}

type PlayerToolsPanesProps = {
	playerData: PlayerData;
	strippedPlayerData?: PlayerData;
	dataSource: string;
	allCrew: PlayerCrew[];
	allShips: Ship[];
	playerShips: Ship[];
	ephemeral: EphemeralData;
	buffConfig?: BuffStatTable;
	maxBuffs?: BuffStatTable;
	items?: EquipmentItem[];

	requestShowForm: (showForm: boolean) => void;
	requestClearData: () => void;

	location: any;
	data: any;
};

const PlayerToolsPanes = (props: PlayerToolsPanesProps) => {
	const { playerData,
		buffConfig,
		maxBuffs,
		strippedPlayerData,
		dataSource,
		allCrew,
		allShips,
		playerShips,
		ephemeral,
		items,
		requestShowForm,
		requestClearData,
		data
	} = props;

	const [showIfStale, setShowIfStale] = useStateWithStorage('tools/showStale', true);

	const [showShare, setShowShare] = useStateWithStorage(playerData.player.dbid + '/tools/showShare', true, { rememberForever: true, onInitialize: variableReady });
	const [profileAutoUpdate, setProfileAutoUpdate] = useStateWithStorage(playerData.player.dbid + '/tools/profileAutoUpdate', false, { rememberForever: true });
	const [profileUploaded, setProfileUploaded] = React.useState(false);
	const [profileUploading, setProfileUploading] = React.useState(false);
	const [profileShared, setProfileShared] = useStateWithStorage('tools/profileShared', false);

	const [varsReady, setVarsReady] = React.useState(false);
	const [activeTool, setActiveTool] = React.useState('voyage');
	const [selectedShip, setSelectedShip] = useStateWithStorage<string | undefined>('tools/selectedShip', undefined);

	React.useEffect(() => {
		if (dataSource == 'input' && profileAutoUpdate && !profileUploaded) {
			// console.log('Uploading profile');
			shareProfile();
		}
	}, [profileAutoUpdate, strippedPlayerData]);

	const tools = playerTools;
	React.useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.has('tool') && tools[urlParams.get('tool') as string])
			setActiveTool(urlParams.get('tool') as string);

		if (urlParams.has('ship')) {
			setSelectedShip(urlParams.get('ship') ?? undefined);
		}
		else {
			setSelectedShip(undefined);
		}
	}, [window.location.search]);

	const StaleMessage = () => {
		const STALETHRESHOLD = 3;	// in hours
		if (showIfStale && new Date().getTime() - (playerData.calc?.lastModified?.getTime() ?? 0) > STALETHRESHOLD * 60 * 60 * 1000) {
			return (
				<Message
					warning
					icon='clock'
					header='Update your player data'
					content="It's been a few hours since you last updated your player data. We recommend that you update now to make sure our tools are providing you recent information about your crew."
					onDismiss={() => setShowIfStale(false)}
				/>
			);
		}
		else {
			return (<></>);
		}
	};

	const ShareMessage = () => {
		if (!showShare) return (<></>);

		// The option to auto-share profile only appears after a profile is uploaded or if previously set to auto-update
		const bShowUploaded = profileUploaded || profileAutoUpdate;

		return (
			<Message icon onDismiss={() => setShowShare(false)}>
				<Icon name='share alternate' />
				<Message.Content>
					<Message.Header>Share your player profile!</Message.Header>
					{!bShowUploaded && (
						<div>
							<p>
								Click here to{' '}
								<Button size='small' color='green' onClick={() => shareProfile()}>
									{profileUploading && <Icon loading name='spinner' />}share your profile
								</Button>{' '}
								and unlock more tools and export options for items and ships. More details:
							</p>
							<Message.List>
								<Message.Item>
									Once shared, the profile will be publicly accessible, will be accessible by your DBID link, and linked on related pages (such as fleet pages & event pages)
								</Message.Item>
								<Message.Item>
									There is no private information included in the player profile; information being shared is limited to:{' '}
									<b>captain name, level, vip level, fleet name and role, achievements, completed missions, your crew, items and ships.</b>
								</Message.Item>
							</Message.List>
						</div>
					)}
					{bShowUploaded && (
						<Form.Group>
							<p>
								Your profile was uploaded. Share the link:{' '}
								<a
									href={`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}
									target='_blank'>{`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`}</a>
							</p>
							<Form.Field
								control={Checkbox}
								label='Automatically share profile after every import'
								checked={profileAutoUpdate}
								onChange={(e, { checked }) => setProfileAutoUpdate(checked)}
							/>
						</Form.Group>
					)}
				</Message.Content>
			</Message>
		);
	};

	// if (!varsReady)
	// 	return (<PlayerToolsLoading />);

	const PlayerLevelProgress = () => {
		const endingValue = playerData.player.character.xp_for_next_level - playerData.player.character.xp_for_current_level;
		const currentValue = playerData.player.character.xp - playerData.player.character.xp_for_current_level;
		const percent = (currentValue / endingValue) * 100;
		return (
			<Progress
				percent={percent.toPrecision(3)}
				label={`Level ${playerData.player.character.level}: ${playerData.player.character.xp} / ${playerData.player.character.xp_for_next_level}`}
				progress
			/>
		);
	};

	let tt: string | undefined = undefined;

	if (tools[activeTool].title === 'Ship Page' && selectedShip) {
		let s = playerShips?.find((sp) => sp.symbol === selectedShip);
		if (s) {
			tt = s.name;
		}
	}

	return (
		<>
			<Header as='h4'>Hello, {playerData.player.character.display_name}</Header>
			<PlayerLevelProgress />
			<StaleMessage />
			<Menu compact stackable>
				<Menu.Item>
					Last imported: {playerData.calc?.lastModified?.toLocaleString()}
				</Menu.Item>
				<Dropdown item text='Profile options'>
					<Dropdown.Menu>
						<Dropdown.Item onClick={() => requestShowForm(true)}>Update now...</Dropdown.Item>
						{!showShare && (<Dropdown.Item onClick={() => setShowShare(true)}>Share profile...</Dropdown.Item>)}
						<Dropdown.Item onClick={() => requestClearData()}>Clear player data</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown>
				<Dropdown item text='Export'>
					<Dropdown.Menu>
						<Popup basic content='Download crew data as traditional comma delimited CSV file' trigger={
							<Dropdown.Item onClick={() => exportCrewTool()} content='Download CSV...' />
						} />
						<Popup basic content='Copy crew data to clipboard in Google Sheets format' trigger={
							<Dropdown.Item onClick={() => exportCrewToClipboard()} content='Copy to clipboard' />
						} />
					</Dropdown.Menu>
				</Dropdown>
			</Menu>

			<React.Fragment>
				<ShareMessage />
				<Header as='h3'>{tt ? tt : tools[activeTool].title}</Header>
				<MergedContext.Provider value={{
					crew: allCrew,
					ships: allShips,
					playerData: playerData,
					playerShips: playerShips,
					ephemeral: ephemeral,
					buffConfig: buffConfig,
					maxBuffs: maxBuffs,
					items: items,
					data
				}}>
					{tools[activeTool].render(props)}
				</MergedContext.Provider>
			</React.Fragment>
		</>
	);

	function variableReady(keyName: string) {
		setVarsReady(true);
	}

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
			if (!profileAutoUpdate) window.open(`${process.env.GATSBY_DATACORE_URL}profile/?dbid=${playerData.player.dbid}`, '_blank');
			setProfileUploading(false);
			setProfileUploaded(true);
			setProfileShared(true);
		});
	}

	function exportCrewTool() {
		let text = playerData.player.character.unOwnedCrew ? exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew)) : "";
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	function exportCrewToClipboard() {
		let text = playerData.player.character.unOwnedCrew ? exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew), '\t') : "";
		navigator.clipboard.writeText(text);
	}
}

type PlayerToolsFormProps = {
	setValidInput: (playerData: any) => void;
};

const PlayerToolsForm = (props: PlayerToolsFormProps) => {
	const PLAYERLINK = 'https://app.startrektimelines.com/player?client_api=20&only_read_state=true';

	const { setValidInput } = props;

	const [inputPlayerData, setInputPlayerData] = React.useState(undefined);
	const [fullInput, setFullInput] = React.useState('');
	const [displayedInput, setDisplayedInput] = React.useState('');
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

	let inputUploadFile: HTMLInputElement | null = null;

	if (fullInput != "")
		parseInput();

	React.useEffect(() => {
		if (inputPlayerData) {
			setValidInput(inputPlayerData);
			setInputPlayerData(undefined);
		}
	}, [inputPlayerData]);

	return (
		<Layout title='Player tools'>
			<Header as='h2'>Player tools</Header>
			<p>You can access some of your player data from the game's website and import it here to calculate optimal voyage lineups, identify unnecessary items, export your crew list as a CSV, or share your profile with other players, among other tools. This website cannot make direct requests to the game's servers due to security configurations and unclear terms of service interpretations, so there are a few manual steps required to import your data.</p>
			<p>If you have multiple accounts, we recommend using your browser in InPrivate mode (Edge) or Incognito mode (Firefox / Chrome) to avoid caching your account credentials, making it easier to change accounts.</p>
			<ul>
				<li>
					Open this page in your browser:{' '}
					<a href={PLAYERLINK} target='_blank'>
						{PLAYERLINK}
					</a>
				</li>
				<li>
					Log in if asked, then wait for the page to finish loading. It should start with:{' '}
					<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
				</li>
				<li>Select everything in the page (Ctrl+A) and copy it (Ctrl+C)</li>
				<li>Paste it (Ctrl+V) in the text box below. Note that DataCore will intentionally display less data here to speed up the process</li>
				<li>Click the 'Import data' button</li>
			</ul>

			<Form>
				<TextArea
					placeholder='Paste your player data here'
					value={displayedInput}
					onChange={(e, { value }) => setDisplayedInput(value as string)}
					onPaste={(e: ClipboardEvent) => { return onInputPaste(e) }}
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

			<p style={{ marginTop: '2em' }}>To circumvent the long text copy limitations on mobile devices, download{' '}
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
				onClick={() => inputUploadFile?.click()}
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

			if (testData) {
				// Test for playerData array glitch
				if (Array.isArray(testData)) {
					testData = { ...testData[0] };
				}
				if (testData.player && testData.player.display_name) {
					if (testData.player.character && testData.player.character.crew && (testData.player.character.crew.length > 0)) {
						setInputPlayerData(testData);
						setDisplayedInput('');
						setErrorMessage(undefined);
					} else {
						setErrorMessage('Failed to parse player data from the text you pasted. Make sure you are logged in with the correct account.');
					}
				}
				else {
					setErrorMessage('Failed to parse player data from the text you pasted. Make sure the page is loaded correctly and you copied the entire contents!');
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

	function onInputPaste(event: ClipboardEvent) {
		let paste = event.clipboardData;
		if (paste) {
			let fullPaste = paste.getData('text');
			setFullInput(fullPaste);
			setDisplayedInput(`${fullPaste.substr(0, 300)} [ ... ] ${fullPaste.substr(-100)}\n/* Note that DataCore is intentionally displaying less data here to speed up the process */`);
			event.preventDefault();
			return false;
		}
		return true;
	}

	function handleFileUpload(event) {
		// use FileReader to read file content in browser
		const fReader = new FileReader();
		fReader.onload = (e) => {
			let data = e.target?.result?.toString() ?? "";
			// Handle Apple webarchive wrapping
			if (data.match(/^bplist00/)) {
				// Find where the JSON begins and ends, and extract just that from the larger string.
				data = data.substring(data.indexOf('>{') + 1, data.lastIndexOf('}}') + 2);
			}
			setFullInput(data);
		};
		fReader.readAsText(event.target.files[0]);
	}
};


const PlayerToolsLoading = () => {
	return (
		<Layout title='Player tools'>
			<Icon loading name='spinner' /> Loading...
		</Layout>
	);
};

export default PlayerToolsPage;
