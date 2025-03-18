

/**  CODE IS MOVED TO src/components/base/jsoninputform.tsx **/


// import React from 'react';
// import { Card, Grid, Divider, Header, Button, Form, TextArea, Message, Accordion, Label, Icon, Dimmer, Loader, SemanticICONS } from 'semantic-ui-react';

// import { PlayerData } from '../../model/player';
// import { iOS, mobileCheck } from '../../utils/misc';

// export const PLAYERLINK = 'https://app.startrektimelines.com/player?client_api=26&only_read_state=true';

// type PlayerInputFormProps = {
// 	setValidInput: (playerData: PlayerData | undefined) => void;
// 	requestDismiss?: () => void;
// };

// export const PlayerInputForm = (props: PlayerInputFormProps) => {
// 	const { setValidInput, requestDismiss } = props;

// 	const [inputPlayerData, setInputPlayerData] = React.useState<PlayerData | undefined>(undefined);
// 	const [fullInput, setFullInput] = React.useState('');
// 	const [displayedInput, setDisplayedInput] = React.useState('');
// 	const [details, setDetails] = React.useState<string | undefined>(undefined);
// 	const [loadState, setLoadState] = React.useState(0);
// 	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

// 	React.useEffect(() => {
// 		if (inputPlayerData) {
// 			setValidInput(inputPlayerData);
// 			setInputPlayerData(undefined);
// 		}
// 	}, [inputPlayerData]);

// 	React.useEffect(() => {
// 		if (fullInput !== '') parseInput();
// 	}, [fullInput]);

// 	let inputUploadFile: HTMLInputElement | null = null;
// 	const isMobile = mobileCheck();

// 	return (
// 		<Card fluid>
// 			<Card.Content>
// 				<Dimmer active={loadState > 0}>
// 					<Loader content='Loading...' />
// 				</Dimmer>
// 				{requestDismiss &&
// 					<Label as='a' corner='right' onClick={requestDismiss}>
// 						<Icon name='delete' style={{ cursor: 'pointer' }}/>
// 					</Label>
// 				}
// 				{!isMobile &&
// 					<Grid columns={3} stackable textAlign='center'>
// 						<Grid.Row>
// 							<Grid.Column width={7}>
// 								{renderCopyPaste()}
// 							</Grid.Column>
// 							<Grid.Column width={1} stretched style={{ position: 'relative' }}>
// 								<Divider vertical>Or</Divider>
// 							</Grid.Column>
// 							<Grid.Column width={7}>
// 								{renderUpload()}
// 							</Grid.Column>
// 						</Grid.Row>
// 					</Grid>
// 				}
// 				{isMobile &&
// 					<div style={{ textAlign: 'center' }}>
// 						{renderUpload()}
// 					</div>
// 				}
// 				{errorMessage && (
// 					<Message negative style={{ marginTop: '2em' }}>
// 						<Message.Header>Error</Message.Header>
// 						<p>{errorMessage}</p>
// 					</Message>
// 				)}
// 			</Card.Content>
// 		</Card>
// 	);

// 	function renderCopyPaste(): JSX.Element {
// 		return (
// 			<React.Fragment>
// 				<Header icon>
// 					<Icon name='paste' />
// 					Copy and Paste
// 				</Header>
// 				<p>
// 					Copy the contents of
// 					{` `}<a href={PLAYERLINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
// 						your player data
// 					</a>,
// 					<br />then paste everything into the text box below.
// 				</p>
// 				<Form>
// 					<TextArea
// 						placeholder='Paste your player data here'
// 						value={displayedInput}
// 						onChange={(e, { value }) => setDisplayedInput(value as string)}
// 						onPaste={(e) => { return onInputPaste(e) }}
// 					/>

// 				</Form>
// 				<Accordion style={{ marginTop: '1em' }}>
// 					<Accordion.Title
// 						active={details === 'copypaste'}
// 						onClick={() => setDetails(details !== 'copypaste' ? 'copypaste' : undefined)}
// 					>
// 						<Icon name={details === 'copypaste' ? 'caret down' : 'caret right' as SemanticICONS} />
// 						Detailed instructions...
// 					</Accordion.Title>
// 					<Accordion.Content active={details === 'copypaste'} style={{ textAlign: 'left' }}>
// 						<p>
// 							DataCore cannot make direct requests to the game's servers, so you must follow these steps to import your player data:
// 						</p>
// 						<ol>
// 							<li>
// 								Open this page in your browser:{' '}
// 								<a href={PLAYERLINK} target='_blank'>
// 									{PLAYERLINK}
// 								</a>.
// 							</li>
// 							<li>
// 								Sign in if asked, then wait for the page to finish loading. It should start with:{' '}
// 								<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
// 							</li>
// 							<li>Select everything in the page (Ctrl+A) and copy to clipboard (Ctrl+C).</li>
// 							<li>Paste (Ctrl+V) in the text box above. Note that DataCore will intentionally display less data here to speed up the process.</li>
// 						</ol>
// 						<p>If you have multiple accounts, we recommend using your browser in incognito mode (Chrome) or in private mode (Edge / Firefox) to avoid caching your account credentials, making it easier to switch accounts.</p>
// 					</Accordion.Content>
// 				</Accordion>
// 			</React.Fragment>
// 		);
// 	}

// 	function renderUpload(): JSX.Element {
// 		return (
// 			<React.Fragment>
// 				<Header icon>
// 					<Icon name='upload' />
// 					Upload File
// 				</Header>
// 				<p>
// 					Save
// 					{` `}<a href={PLAYERLINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
// 						your player data
// 					</a>
// 					{` `}to your device,
// 					<br />then upload the file. Recommended for mobile users.
// 				</p>
// 				<Button
// 					onClick={() => inputUploadFile?.click()}
// 					content='Browse for player data file to upload...'
// 					icon='file text'
// 					size='large'
// 					color='blue'
// 				/>
// 				<input
// 					accept={iOS() ? undefined : '.json,application/json,text/json'}
// 					type='file'
// 					onChange={(e) => handleFileUpload(e)}
// 					style={{ display: 'none' }}
// 					ref={e => inputUploadFile = e}
// 				/>
// 				<Accordion style={{ marginTop: '1em' }}>
// 					<Accordion.Title
// 						active={details === 'ios' || details === 'android'}
// 						onClick={() => setDetails((details !== 'ios' && details !== 'android') ? 'ios' : undefined)}
// 					>
// 						<Icon name={(details === 'ios' || details === 'android') ? 'caret down' : 'caret right' as SemanticICONS} />
// 						Detailed instructions...
// 					</Accordion.Title>
// 					<Accordion.Content active={details === 'ios' || details === 'android'} style={{ textAlign: 'left' }}>
// 						<p>
// 							DataCore cannot make direct requests to the game's servers, so you must follow these steps to import your player data:
// 						</p>
// 						<div style={{ margin: '1em 0' }}>
// 							<Button.Group fluid compact>
// 								<Button icon='apple' content='Apple iOS'
// 									active={details === 'ios' ? true : false}
// 									onClick={() => setDetails('ios')}
// 								/>
// 								<Button icon='android' content='Android'
// 									active={details === 'android' ? true : false}
// 									onClick={() => setDetails('android')}
// 								/>
// 							</Button.Group>
// 						</div>
// 						<ol>
// 							<li>
// 								Open this page on your device:{' '}
// 								<a href={PLAYERLINK} target='_blank'>
// 									{PLAYERLINK}
// 								</a>.
// 							</li>
// 							<li>
// 								Sign in if asked, then wait for the page to finish loading. It should start with:{' '}
// 								<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
// 							</li>
// 							{details === 'ios' &&
// 								<React.Fragment>
// 									<li>Tap the share icon while viewing the page.</li>
// 									<li>Tap "options" and choose "Web Archive", tap "save to files", choose a location, and save.</li>
// 								</React.Fragment>
// 							}
// 							{details === 'android' &&
// 								<React.Fragment>
// 									<li>Tap the menu (three dots) icon while viewing the page.</li>
// 									<li>Tap the download button, choose a location, and save.</li>
// 								</React.Fragment>
// 							}
// 							<li>Come back to this DataCore page.</li>
// 							<li>Tap the "Browse for player data file to upload..." button.</li>
// 							<li>Choose the file starting with "{details === 'ios' ? 'player?client_api' : 'player.json'}..." from where you saved it.</li>
// 						</ol>
// 					</Accordion.Content>
// 				</Accordion>
// 			</React.Fragment>
// 		);
// 	}

// 	function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): void {
// 		// use FileReader to read file content in browser
// 		const fReader = new FileReader();
// 		fReader.onload = (e) => {
// 			let data = e.target?.result?.toString() ?? "";
// 			// Handle Apple webarchive wrapping
// 			if (data.match(/^bplist00/)) {
// 				// Find where the JSON begins and ends, and extract just that from the larger string.
// 				data = data.substring(data.indexOf('>{') + 1, data.lastIndexOf('}}') + 2);
// 			}
// 			setFullInput(data);
// 		};
// 		if (event.target.files) {
// 			fReader.readAsText(event.target.files[0]);
// 			if (inputUploadFile) inputUploadFile.files = null;
// 		}
// 	}

// 	function parseInput(): void {
// 		let testInput = fullInput;

// 		// Use inputted text if no pasted text detected
// 		if (testInput === '') testInput = displayedInput;

// 		try {
// 			let testData = JSON.parse(testInput);
// 			if (testData) {
// 				// Test for playerData array glitch
// 				if (Array.isArray(testData)) {
// 					testData = {...testData[0]};
// 				}
// 				if (testData.player && testData.player.display_name) {
// 					if (testData.player.character && testData.player.character.crew && (testData.player.character.crew.length > 0)) {
// 						setInputPlayerData(testData);
// 						setErrorMessage(undefined);
// 						setLoadState(1);
// 					} else {
// 						setErrorMessage('Failed to parse player data from the text you pasted. Make sure you are logged in with the correct account.');
// 					}
// 				}
// 				else {
// 					setErrorMessage('Failed to parse player data from the text you pasted. Make sure the page is loaded correctly and you copied the entire contents!');
// 				}
// 			} else {
// 				setErrorMessage('Failed to parse player data from the text you pasted. Make sure the page is loaded correctly and you copied the entire contents!');
// 			}
// 		} catch (error: any) {
// 			if ((/Log in to CS Tools/).test(testInput)) {
// 				setErrorMessage('You are not logged in! Open the player data link above and log in to the game as instructed. Then return to this DataCore page and repeat all the steps to import your data.');
// 			}
// 			else {
// 				setErrorMessage(`Failed to read the data. Make sure the page is loaded correctly and you copied the entire contents! (${error})`);
// 			}
// 		}

// 		setFullInput('');
// 	}

// 	function onInputPaste(event: ClipboardEvent): boolean {
// 		const paste = event.clipboardData as DataTransfer;
// 		if (paste) {
// 			const fullPaste = paste.getData('text');
// 			setFullInput(fullPaste);
// 			setDisplayedInput(`${fullPaste.slice(0, 300)} [ ... ] ${fullPaste.slice(-100)}\n/* Note that DataCore is intentionally displaying less data here to speed up the process */`);
// 			event.preventDefault();
// 			return false;
// 		}
// 		return true;
// 	}
// };
