import React from 'react';
import { Card, Grid, Divider, Header, Button, Form, TextArea, Message, Accordion, Label, Icon } from 'semantic-ui-react';

import { PlayerData } from '../../model/player';

export const PLAYERLINK = 'https://app.startrektimelines.com/player?client_api=20&only_read_state=true';

type PlayerInputFormProps = {
	setValidInput: (playerData: PlayerData | undefined) => void;
	requestDismiss?: () => void;
};

export const PlayerInputForm = (props: PlayerInputFormProps) => {
	const { setValidInput, requestDismiss } = props;

	const [inputPlayerData, setInputPlayerData] = React.useState<PlayerData | undefined>(undefined);
	const [fullInput, setFullInput] = React.useState('');
	const [displayedInput, setDisplayedInput] = React.useState('');
	const [details, setDetails] = React.useState<string | undefined>(undefined);
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);

	let inputUploadFile: HTMLInputElement | null = null;

	if (fullInput !== '')
		parseInput();

	React.useEffect(() => {
		if (inputPlayerData) {
			setValidInput(inputPlayerData);
			setInputPlayerData(undefined);
		}
	}, [inputPlayerData]);

	return (
		<Card fluid>
			<Card.Content>
				{requestDismiss &&
					<Label as='a' corner='right' onClick={requestDismiss}>
						<Icon name='delete' />
					</Label>
				}
				<div style={{ position: 'relative' }}>
					<Grid columns={2} relaxed stackable textAlign='center'>
						<Grid.Row>
							<Grid.Column>
								<Header icon>
									<Icon name='paste' />
									Copy and Paste
								</Header>
								<p>
									Copy the contents of
									{` `}<a href={PLAYERLINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
										your player data
									</a>,
									<br />then paste everything into the text box below.
								</p>
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
								<Accordion style={{ marginTop: '1em' }}>
									<Accordion.Title
										active={details === 'copypaste'}
										onClick={() => setDetails(details !== 'copypaste' ? 'copypaste' : undefined)}
									>
										Detailed instructions...
									</Accordion.Title>
									<Accordion.Content active={details === 'copypaste'} style={{ marginTop: '-1em', textAlign: 'left' }}>
										<ol>
											<li>
												Open this page in your browser:{' '}
												<a href={PLAYERLINK} target='_blank'>
													{PLAYERLINK}
												</a>.
											</li>
											<li>
												Log in if asked, then wait for the page to finish loading. It should start with:{' '}
												<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
											</li>
											<li>Select everything in the page (Ctrl+A) and copy it (Ctrl+C).</li>
											<li>Paste it (Ctrl+V) in the text box above. Note that DataCore will intentionally display less data here to speed up the process.</li>
										</ol>
									</Accordion.Content>
								</Accordion>
							</Grid.Column>
							<Grid.Column>
								<Header icon>
									<Icon name='upload' />
									Upload
								</Header>
								<p>
									Download
									{` `}<a href={PLAYERLINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
										your player data
									</a>
									{` `}to your device,
									<br />then upload the file. Recommended for mobile users.
								</p>
								<Button
									onClick={() => inputUploadFile?.click()}
									content='Browse for player data file to upload...'
									icon='file text'
									size='large'
									color='blue'
								/>
								<Accordion style={{ marginTop: '1em' }}>
									<Accordion.Title
										active={details === 'ios'}
										onClick={() => setDetails(details !== 'ios' ? 'ios' : undefined)}
									>
										Detailed <Icon name='apple' /> Apple iOS instructions...
									</Accordion.Title>
									<Accordion.Content active={details === 'ios'} style={{ marginTop: '-1em', textAlign: 'left' }}>
										<ol>
											<li>
												Open this page on your device:{' '}
												<a href={PLAYERLINK} target='_blank'>
													{PLAYERLINK}
												</a>.
											</li>
											<li>
												Log in if asked, then wait for the page to finish loading. It should start with:{' '}
												<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
											</li>
											<li>Tap the share icon while viewing the page.</li>
											<li>Tap "options" and choose "Web Archive", tap "save to files", choose a location, and save.</li>
											<li>Come back to this DataCore page.</li>
											<li>Tap the "Browse for player data file to upload..." button.</li>
											<li>Choose the file starting with "player?client_api..." from where you saved it.</li>
										</ol>
									</Accordion.Content>
									<Accordion.Title
										active={details === 'android'}
										onClick={() => setDetails(details !== 'android' ? 'android' : undefined)}
									>
										Detailed <Icon name='android' /> Android instructions...
									</Accordion.Title>
									<Accordion.Content active={details === 'android'} style={{ marginTop: '-1em', textAlign: 'left' }}>
										<ol>
											<li>
												Open this page on your device:{' '}
												<a href={PLAYERLINK} target='_blank'>
													{PLAYERLINK}
												</a>.
											</li>
											<li>
												Log in if asked, then wait for the page to finish loading. It should start with:{' '}
												<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
											</li>
											<li>Tap the menu (three dots) icon while viewing the page.</li>
											<li>Tap the download button, choose a location, and save.</li>
											<li>Come back to this DataCore page.</li>
											<li>Tap the "Browse for player data file to upload..." button.</li>
											<li>Choose the file "player.json" from where you saved it.</li>
										</ol>
									</Accordion.Content>
								</Accordion>
							</Grid.Column>
						</Grid.Row>
					</Grid>
					<Divider vertical>Or</Divider>
				</div>
				{errorMessage && (
					<Message negative style={{ marginTop: '2em' }}>
						<Message.Header>Error</Message.Header>
						<p>{errorMessage}</p>
					</Message>
				)}
			</Card.Content>
		</Card>
	);

	function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): void {
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

	function parseInput(): void {
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
		} catch (error: any) {
			if ((/Log in to CS Tools/).test(testInput)) {
				setErrorMessage('You are not logged in! Open the player data link above and log in to the game as instructed. Then return to this DataCore page and repeat all the steps to import your data.');
			}
			else {
				setErrorMessage(`Failed to read the data. Make sure the page is loaded correctly and you copied the entire contents! (${error})`);
			}
		}

		setFullInput('');
	}

	function onInputPaste(event: any): boolean {
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
