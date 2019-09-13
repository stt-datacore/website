import React, { Component } from 'react';
import { Container, Header, Button, Message, Form, TextArea } from 'semantic-ui-react';

import Layout from '../components/layout';
import VoyageCalculator from '../components/voyagecalculator';

type VoyagePageProps = {};

type VoyagePageState = {
	playerData?: any;
	errorMessage?: string;
	pastedContent: string | number;
};

class VoyagePage extends Component<VoyagePageProps, VoyagePageState> {
	constructor(props) {
		super(props);

		this.state = {
			playerData: undefined,
			errorMessage: undefined,
			pastedContent: ''
		};
	}

	render() {
		const { playerData, errorMessage } = this.state;

		if (!playerData) {
			return (
				<Layout>
					<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
						<Header as='h4'>Instructions</Header>
						<p>
							This website cannot make requests directly to DB's servers (due to security configurations as well as unclear communication
							from them about ToS interpretation), so there are a few manual steps required to import your data:
						</p>
						<ul>
							<li>
								Open this page in your browser:{' '}
								<a href='https://stt.disruptorbeam.com/player' target='_blank'>
									https://stt.disruptorbeam.com/player
								</a>
								, make sure you are logged in and your player data is loaded; it should look like a bunch of gibberish starting with{' '}
								<span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
							</li>
							<li>Select everything in the page (Ctrl+A) and copy it (Ctrl+C)</li>
							<li>Paste the contents in the text box below, then click the 'Read data' button below</li>
						</ul>

						<Form>
							<TextArea
								placeholder='Paste the content here'
								value={this.state.pastedContent}
								onChange={(e, { value }) => this.setState({ pastedContent: value })}
							/>
						</Form>

						<Button
							onClick={() => this._parseFromTextbox()}
							style={{ marginBottom: '1em', marginTop: '1em' }}
							content='Read data'
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

	_parseFromTextbox() {
		try {
			let playerData = JSON.parse(this.state.pastedContent as string);

			if (playerData && playerData.player && playerData.player.display_name) {
				this.setState({ playerData: playerData, errorMessage: undefined });
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
