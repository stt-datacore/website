import React, { Component } from 'react';
import { Container, Header, Button, Message, Form, TextArea, Modal } from 'semantic-ui-react';

import Layout from '../components/layout';
import VoyageCalculator from '../components/voyagecalculator_legacy';

type VoyagePageProps = {};

type VoyagePageState = {
	playerData?: any;
	errorMessage?: string;
	pastedContent: string | number;
	clippedContent: string | number;
};

class VoyagePage extends Component<VoyagePageProps, VoyagePageState> {
	constructor(props) {
		super(props);

		this.state = {
			playerData: undefined,
			errorMessage: undefined,
			pastedContent: '',
			clippedContent: '',
		};
	}

	render() {
		const { playerData, errorMessage } = this.state;

		if (!playerData) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Header as='h4'>Player tools</Header>
						<p>You can access some of your player data from the game's website and import it here to calculate optimal voyage lineups, identify unnecessary items, export your crew list as a CSV, or share your profile with other players, among other tools. This website cannot make direct requests to the game's servers due to security configurations and unclear terms of service interpretations, so there are a few manual steps required to import your data.</p>
						<p>If you have multiple accounts, we recommend using your browser in InPrivate mode (Edge) or Incognito mode (Firefox / Chrome) to avoid caching your account credentials, making it easier to change accounts.</p>
						<ul>
							<li>
								Open this page in your browser:{' '}
								<a href='https://stt.disruptorbeam.com/player?client_api=17' target='_blank'>
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
								value={this.state.clippedContent}
								onChange={(e, { value }) => this.setState({ clippedContent: value })}
								onPaste={(e) => { return this._onPaste(e) }}
							/>
							<input
								type='file'
								onChange={(e) => { this._handleFileUpload(e) }}
								style={{display:'none'}}
								ref={e => this.inputUploadFile = e}
							/>
						</Form>

						<Button
							onClick={() => this._parseFromTextbox()}
							style={{ marginBottom: '1em', marginTop: '1em' }}
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

					<Container style={{ paddingBottom: '2em' }}>
						<p>To circumvent the long text copy limitations on mobile devices, download{' '}
							<a href='https://stt.disruptorbeam.com/player?client_api=17' target='_blank'>
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
							style={{ marginBottom: '1em', marginTop: '1em', marginRight: '1em' }}
							content='Upload data file'
							icon='file'
							labelPosition='right'
						/>
					</Container>
				</Layout>
			);
		} else {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<VoyageCalculator playerData={playerData} />
					</Container>
				</Layout>
			);
		}
	}

	_onPaste(event) {
		let self = this;
		let paste = event.clipboardData || window.clipboardData;
		if (paste) {
			let pastedContent = paste.getData('text');
			let clippedContent = pastedContent.substr(0, 500)+' [ ... ]';
			self.setState({ pastedContent, clippedContent });
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
				data = data.substring(data.indexOf('{'), data.lastIndexOf('}}')+2);
			}
			this.setState({ pastedContent: data });
			this._parseFromTextbox();
		};
		fReader.readAsText(event.target.files[0]);
	}

	_parseFromTextbox() {
		// Use inputted text if no pasted text detected
		if (this.state.pastedContent == '')
			this.setState({ pastedContent: this.state.clippedContent });

		try {
			let playerData = JSON.parse(this.state.pastedContent as string);

			if (playerData && playerData.player && playerData.player.display_name) {
				if (playerData.player.character && playerData.player.character.crew && (playerData.player.character.crew.length > 0)) {
					this.setState({ playerData: playerData, errorMessage: undefined });
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

export default VoyagePage;
