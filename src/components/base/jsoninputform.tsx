import React from 'react';
import { Card, Grid, Divider, Header, Button, Form, TextArea, Message, Accordion, Label, Icon, Dimmer, Loader, SemanticICONS } from 'semantic-ui-react';
import { iOS, mobileCheck } from '../../utils/misc';

export interface JsonImportConfig {    
    dataUrl: string;
    dataName: string;
    jsonHint: string;
    androidFileHint: string;
    iOSFileHint: string;
	pasteInMobile?: boolean;
}

export interface JsonInputFormProps<T> {
    title?: string;
	setValidInput: (data: T | undefined) => void;
    validateInput: (value: T) => string | true;
	requestDismiss?: () => void;
    config: JsonImportConfig;
};

export const JsonInputForm = <T extends Object>(props: JsonInputFormProps<T>) => {
	const { setValidInput, requestDismiss } = props;
    
    const { pasteInMobile, dataUrl: DATALINK, dataName: caption, jsonHint, androidFileHint: androidHint, iOSFileHint: iosHint } = props.config;

	const [inputData, setInputData] = React.useState<T | undefined>(undefined);
	const [fullInput, setFullInput] = React.useState('');
	const [displayedInput, setDisplayedInput] = React.useState('');
	const [details, setDetails] = React.useState<string | undefined>(undefined);
	const [loadState, setLoadState] = React.useState(0);
	const [errorMessage, setErrorMessage] = React.useState<string | undefined>(undefined);
	
	React.useEffect(() => {
		if (inputData) {
			setValidInput(inputData);
			setInputData(undefined);
		}
	}, [inputData]);

	React.useEffect(() => {
		if (fullInput !== '') parseInput();
	}, [fullInput]);

	let inputUploadFile: HTMLInputElement | null = null;
	const isMobile = mobileCheck();

	return (
		<Card fluid>
			<Card.Content>
				<Dimmer active={loadState > 0}>
					<Loader content='Loading...' />
				</Dimmer>
				{requestDismiss &&
					<Label title={`Close ${caption} data upload panel`} as='a' corner='right' onClick={requestDismiss}>
						<Icon name='delete' style={{ cursor: 'pointer' }}/>
					</Label>
				}
				{!isMobile &&
                    <React.Fragment>
                        {!!props.title && <h1 style={{textAlign:'center'}}>{props.title}</h1>}
                        <Grid columns={3} stackable textAlign='center'>
                            <Grid.Row>
                                <Grid.Column width={7}>
                                    {renderCopyPaste()}
                                </Grid.Column>
                                <Grid.Column width={1} stretched style={{ position: 'relative' }}>
                                    <Divider vertical>Or</Divider>
                                </Grid.Column>
                                <Grid.Column width={7}>
                                    {renderUpload()}
                                </Grid.Column>
                            </Grid.Row>
                        </Grid>
                    </React.Fragment>
				}
				{isMobile && !pasteInMobile &&
					<div style={{ textAlign: 'center' }}>
                        {!!props.title && <h1 style={{textAlign:'center'}}>{props.title}</h1>}
						{renderUpload()}
					</div>
				}
				{isMobile && !!pasteInMobile &&
					<React.Fragment>
						{!!props.title && <h1 style={{textAlign:'center'}}>{props.title}</h1>}
						<Grid columns={1} stackable textAlign='center'>
						<Grid.Row>
							<Grid.Column>
								{renderCopyPaste()}
							</Grid.Column>
						</Grid.Row>
						<Grid.Row>
							<Grid.Column width={1} stretched style={{ position: 'relative' }}>
								<Divider horizontal>Or</Divider>
							</Grid.Column>
						</Grid.Row>
						<Grid.Row>
							<Grid.Column width={1}>
								{renderUpload()}
							</Grid.Column>
						</Grid.Row>
						</Grid>
					</React.Fragment>
				}
				{errorMessage && (
					<Message negative style={{ marginTop: '2em' }}>
						<Message.Header>Error</Message.Header>
						<p>{errorMessage}</p>
					</Message>
				)}
			</Card.Content>
		</Card>
	);

	function renderCopyPaste(): JSX.Element {
		return (
			<React.Fragment>
				<Header icon>
					<Icon name='paste' />
					Copy and Paste
				</Header>
				<p>
					Copy the contents of
					{` `}<a href={DATALINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
						your {caption} data
					</a>,
					<br />then paste everything into the text box below.
				</p>
				<Form>
					<TextArea
						placeholder={`Paste your ${caption} data here`}
						value={displayedInput}
						onChange={(e, { value }) => setDisplayedInput(value as string)}
						onPaste={(e) => { return onInputPaste(e) }}
					/>

				</Form>
				<Accordion style={{ marginTop: '1em' }}>
					<Accordion.Title
						active={details === 'copypaste'}
						onClick={() => setDetails(details !== 'copypaste' ? 'copypaste' : undefined)}
					>
						<Icon name={details === 'copypaste' ? 'caret down' : 'caret right' as SemanticICONS} />
						Detailed instructions...
					</Accordion.Title>
					<Accordion.Content active={details === 'copypaste'} style={{ textAlign: 'left' }}>
						<p>
							DataCore cannot make direct requests to the game's servers, so you must follow these steps to import your {caption} data:
						</p>
						<ol>
							<li>
								Open this page in your browser:{' '}
								<a href={DATALINK} target='_blank'>
									{DATALINK}
								</a>.
							</li>
							<li>
								Sign in if asked, then wait for the page to finish loading. It should start with:{' '}
								<span style={{ fontFamily: 'monospace' }}>{jsonHint}</span> ...
							</li>
							<li>Select everything in the page (Ctrl+A) and copy to clipboard (Ctrl+C).</li>
							<li>Paste (Ctrl+V) in the text box above. Note that DataCore will intentionally display less data here to speed up the process.</li>
						</ol>
						<p>If you have multiple accounts, we recommend using your browser in incognito mode (Chrome) or in private mode (Edge / Firefox) to avoid caching your account credentials, making it easier to switch accounts.</p>
					</Accordion.Content>
				</Accordion>
			</React.Fragment>
		);
	}

	function renderUpload(): JSX.Element {
		return (
			<React.Fragment>
				<Header icon>
					<Icon name='upload' />
					Upload File
				</Header>
				<p>
					Save
					{` `}<a href={DATALINK} target='_blank' style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
						your {caption} data
					</a>
					{` `}to your device,
					<br />then upload the file. Recommended for mobile users.
				</p>
				<Button
					onClick={() => inputUploadFile?.click()}
					content={`Browse for ${caption} data file to upload...`}
					icon='file text'
					size='large'
					color='blue'
				/>
				<input
					accept={iOS() ? undefined : '.json,application/json,text/json'}
					type='file'
					onChange={(e) => handleFileUpload(e)}
					style={{ display: 'none' }}
					ref={e => inputUploadFile = e}
				/>
				<Accordion style={{ marginTop: '1em' }}>
					<Accordion.Title
						active={details === 'ios' || details === 'android'}
						onClick={() => setDetails((details !== 'ios' && details !== 'android') ? 'ios' : undefined)}
					>
						<Icon name={(details === 'ios' || details === 'android') ? 'caret down' : 'caret right' as SemanticICONS} />
						Detailed instructions...
					</Accordion.Title>
					<Accordion.Content active={details === 'ios' || details === 'android'} style={{ textAlign: 'left' }}>
						<p>
							DataCore cannot make direct requests to the game's servers, so you must follow these steps to import your {caption} data:
						</p>
						<div style={{ margin: '1em 0' }}>
							<Button.Group fluid compact>
								<Button icon='apple' content='Apple iOS'
									active={details === 'ios' ? true : false}
									onClick={() => setDetails('ios')}
								/>
								<Button icon='android' content='Android'
									active={details === 'android' ? true : false}
									onClick={() => setDetails('android')}
								/>
							</Button.Group>
						</div>
						<ol>
							<li>
								Open this page on your device:{' '}
								<a href={DATALINK} target='_blank'>
									{DATALINK}
								</a>.
							</li>
							<li>
								Sign in if asked, then wait for the page to finish loading. It should start with:{' '}
								<span style={{ fontFamily: 'monospace' }}>{jsonHint}</span> ...
							</li>
							{details === 'ios' &&
								<React.Fragment>
									<li>Tap the share icon while viewing the page.</li>
									<li>Tap "options" and choose "Web Archive", tap "save to files", choose a location, and save.</li>
								</React.Fragment>
							}
							{details === 'android' &&
								<React.Fragment>
									<li>Tap the menu (three dots) icon while viewing the page.</li>
									<li>Tap the download button, choose a location, and save.</li>
								</React.Fragment>
							}
							<li>Come back to this DataCore page.</li>
							<li>Tap the "Browse for player data file to upload..." button.</li>
							<li>Choose the file starting with "{details === 'ios' ? iosHint : androidHint}..." from where you saved it.</li>
						</ol>
					</Accordion.Content>
				</Accordion>
			</React.Fragment>
		);
	}

	function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): void {
		// use FileReader to read file content in browser
		const fReader = new FileReader();
		fReader.onload = (e) => {
			let data = e.target?.result?.toString() ?? "";
			// Handle Apple webarchive wrapping
			if (data.match(/^bplist00/)) {
				// Find where the JSON begins and ends, and extract just that from the larger string.
				if (data.includes("</pre>")) {
					data = data.substring(data.indexOf('>{') + 1, data.lastIndexOf('</pre>'));
				}
				else {
					data = data.substring(data.indexOf('>{') + 1, data.lastIndexOf('}') + 1);
				}
			}
			setFullInput(data);
		};
		if (event.target.files) {
			fReader.readAsText(event.target.files[0]);
			if (inputUploadFile) inputUploadFile.files = null;
		}
	}

    function validateInput(input: T) {
        return props.validateInput(input);
    }

	function parseInput(): void {
		let testInput = fullInput;

		// Use inputted text if no pasted text detected
		if (testInput === '') testInput = displayedInput;

		try {
			let testData = JSON.parse(testInput);
			if (testData) {
				// Test for playerData array glitch
				if (Array.isArray(testData)) {
					testData = {...testData[0]};
				}
                let val = validateInput(testData);
                if (val === true) {
                    setInputData(testData);
                    setErrorMessage(undefined);
                    setLoadState(1);
                }
                else {
                    setErrorMessage(val);
                }
			} else {
				setErrorMessage(`Failed to parse ${caption} data from the text you pasted. Make sure the page is loaded correctly and you copied the entire contents!`);
			}
		} catch (error: any) {
			if ((/Log in to CS Tools/).test(testInput)) {
				setErrorMessage(`You are not logged in! Open the ${caption} data link above and log in to the game as instructed. Then return to this DataCore page and repeat all the steps to import your data.`);
			}
			else {
				setErrorMessage(`Failed to read the data. Make sure the page is loaded correctly and you copied the entire contents! (${error})`);
			}
		}

		setFullInput('');
	}

	function onInputPaste(event: ClipboardEvent): boolean {
		const paste = event.clipboardData as DataTransfer;
		if (paste) {
			const fullPaste = paste.getData('text');
			setFullInput(fullPaste);
			setDisplayedInput(`${fullPaste.slice(0, 300)} [ ... ] ${fullPaste.slice(-100)}\n/* Note that DataCore is intentionally displaying less data here to speed up the process */`);
			event.preventDefault();
			return false;
		}
		return true;
	}
};
