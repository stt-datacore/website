import React, { Component } from 'react';
import { Container, Header, Button, Message } from 'semantic-ui-react';

import Layout from '../components/layout';
import VoyageCalculator from '../components/voyagecalculator';

type VoyagePageProps = {};

type VoyagePageState = {
	playerData?: any;
	errorMessage?: string;
};

class VoyagePage extends Component<VoyagePageProps, VoyagePageState> {
	constructor(props) {
		super(props);

		this.state = {
			playerData: undefined,
			errorMessage: undefined
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
								In the frame below, make sure you are logged in and your player data is loaded; it should look like a bunch of gibberish
								starting with <span style={{ fontFamily: 'monospace' }}>{'{"action":"update","player":'}</span> ...
							</li>
							<li>Select everything in the frame (Ctrl+A) and copy it (Ctrl+C)</li>
							<li>
								After you copied the contents, click the 'Read data' button below, and allow it to read the clipboard content if prompted
							</li>
						</ul>

						<Button
							onClick={() => this.parseFromClipboard()}
							style={{ marginBottom: '1em' }}
							content='Read data'
							icon='paste'
							labelPosition='right'
						/>

						<iframe src='https://stt.disruptorbeam.com/player' style={{ width: '100%', height: '10em', border: '1px solid black' }} />

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

	parseFromClipboard() {
		(navigator as any).clipboard
			.readText()
			.then(text => {
				let playerData = JSON.parse(text);

				if (playerData && playerData.player && playerData.player.display_name) {
					this.setState({ playerData: playerData, errorMessage: undefined });
				} else {
					this.setState({
						errorMessage:
							'Failed to parse player data from the text you pasted. Make sure the frame is loaded correctly and you copied the entire contents!'
					});
				}
			})
			.catch(() => {
				this.setState({
					errorMessage: 'Failed to read from clipboard. Make sure the frame is loaded correctly and you copied the entire contents!'
				});
			});
	}
}

export default VoyagePage;
