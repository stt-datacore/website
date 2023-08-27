import React from 'react';
import { Button, Form, TextArea, Message } from 'semantic-ui-react';

import { GlobalContext } from '../context/globalcontext';
import { PlayerData } from '../model/player';

export const PLAYERLINK = 'https://app.startrektimelines.com/player?client_api=20&only_read_state=true';

const PlayerMenu = () => {
	const global = React.useContext(GlobalContext);
	const { player } = global;

	// If crew not loaded, assume core is not ready and player menu shouldn't be shown
	if (global.core.crew.length === 0) return (<></>);

	return (
		<div style={{ margin: '2em 0 0.5em 0' }}>
			{!player.loaded && <PlayerInputForm setValidInput={player.setInput} />
			||
			<div>
				Global player data: {player.loaded ? player.playerData?.player.character.display_name : 'Not loaded'}
				{player.loaded && (
					<span style={{ marginLeft: '1em' }}>
						<Button compact onClick={() => player.reset()}>Clear</Button>
					</span>
				)}
			</div>
			}
		</div>
	);
};

type PlayerInputFormProps = {
	setValidInput?: (playerData: PlayerData | undefined) => void;
};

const PlayerInputForm = (props: PlayerInputFormProps) => {
	const { setValidInput } = props;

	const [inputPlayerData, setInputPlayerData] = React.useState<PlayerData | undefined>(undefined);
	const [fullInput, setFullInput] = React.useState('');
	const [displayedInput, setDisplayedInput] = React.useState('');
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

	let inputUploadFile: HTMLInputElement | null = null;

	if (fullInput != "")
		parseInput();

	React.useEffect(() => {
		if (inputPlayerData && setValidInput) {
			setValidInput(inputPlayerData);
			setInputPlayerData(undefined);
		}
	}, [inputPlayerData]);

	return (
		<div>
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
			</ul>

			<Form>
				<TextArea
					placeholder='Paste your player data here'
					value={displayedInput}
					onChange={(e, { value }) => setDisplayedInput(value as string)}
					onPaste={(e) => { return onInputPaste(e) }}
				/>
				<input
					type='file'
					onChange={(e) => { handleFileUpload(e) }}
					style={{ display: 'none' }}
					ref={e => inputUploadFile = e}
				/>
			</Form>

			{errorMessage && (
				<Message negative>
					<Message.Header>Error</Message.Header>
					<p>{errorMessage}</p>
				</Message>
			)}
		</div>
	);

	function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
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
		if (event.target.files) {
			fReader.readAsText(event.target.files[0]);
			if (inputUploadFile) inputUploadFile.files = null;
		}
	}

	function parseInput() {
		let testInput = fullInput;

		// Use inputted text if no pasted text detected
		if (testInput == '') testInput = displayedInput;

		try {
			let testData = JSON.parse(testInput as string);

			if (testData) {
				// Test for playerData array glitch
				if (Array.isArray(testData)) {
					testData = {...testData[0]};
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

	function onInputPaste(event) {
		let paste = event.clipboardData // deprecated: || window.clipboardData
		if (paste) {
			let fullPaste = paste.getData('text');
			setFullInput(fullPaste);
			setDisplayedInput(`${fullPaste.substr(0, 300)} [ ... ] ${fullPaste.substr(-100)}\n/* Note that DataCore is intentionally displaying less data here to speed up the process */`);
			event.preventDefault();
			return false;
		}
		return true;
	}
};

export default PlayerMenu;