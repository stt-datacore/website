import React, { PureComponent } from 'react';
import { Container, Dropdown, Image, Menu, Icon, Button, Modal, Form, Grid, Message, Segment } from 'semantic-ui-react';
import { navigate } from 'gatsby';
import { isMobile } from 'react-device-detect';

import OtherPages from './otherpages';

type TopMenuProps = {};

type TopMenuState = {
	loginDialogOpen: boolean;
	loggingIn: boolean;
	user: string;
	password: string;
	errorMessage: string | undefined;
	messageModalOpen: boolean;
};

class TopMenu extends PureComponent<TopMenuProps, TopMenuState> {
	state = { user: '', password: '', errorMessage: '', loginDialogOpen: false, loggingIn: false, messageModalOpen: false };

	render() {
		const { user, password, loginDialogOpen, loggingIn, errorMessage, messageModalOpen } = this.state;
		const windowGlobal = typeof window !== 'undefined' && window;
		let isLoggedIn = windowGlobal && window.localStorage && window.localStorage.getItem('token') && window.localStorage.getItem('username');
		const userName = isLoggedIn ? window.localStorage.getItem('username') : '';

		const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
		const firstDate = new Date(2020, 7, 1);
		const secondDate = new Date();
		const days = Math.round(Math.abs((firstDate - secondDate) / oneDay));

		let buttonLabel = 'Site is shutting down!';
		if (days > 0) {
			buttonLabel = `Site is shutting down in ${days} days!`;
		}

		return (
			<div>
				<Menu fixed='top' inverted>
					<Container>
						<Menu.Item onClick={() => navigate('/')}>Crew stats</Menu.Item>
						<Menu.Item onClick={() => navigate('/about')}>About</Menu.Item>
						<Dropdown item simple text='Big book'>
							<Dropdown.Menu>
								<Dropdown.Item onClick={() => navigate('/bigbook2')}>Image list (fast)</Dropdown.Item>
								<Dropdown.Item onClick={() => navigate('/bigbook')}>Complete (slow)</Dropdown.Item>
								<Dropdown.Item onClick={() => navigate('/bb')}>Text only</Dropdown.Item>
							</Dropdown.Menu>
						</Dropdown>
						{!isMobile && <Menu.Item onClick={() => navigate('/voyage')}>Player tools</Menu.Item>}
						<Menu.Item onClick={() => navigate('/behold')}>Behold</Menu.Item>

						<Dropdown item simple text='Pages'>
							<Dropdown.Menu>
								<Dropdown.Item onClick={() => navigate('/collections')}>Collections</Dropdown.Item>
								<Dropdown.Item onClick={() => navigate('/items')}>Items</Dropdown.Item>
								<Dropdown.Item onClick={() => navigate('/stats')}>Misc stats</Dropdown.Item>
								<Dropdown.Item onClick={() => navigate('/episodes')}>Episodes</Dropdown.Item>
								<Dropdown.Item disabled>Missions</Dropdown.Item>
								<Dropdown.Item disabled>Ships</Dropdown.Item>
								<Dropdown.Divider />
								<Dropdown.Header>All other pages</Dropdown.Header>
								<OtherPages />
							</Dropdown.Menu>
						</Dropdown>
					</Container>

					<Menu.Menu position='right'>
						<Menu.Item>
							<Button size='tiny' color='red' onClick={() => this.setState({messageModalOpen: true})} content={buttonLabel} />
						</Menu.Item>
						<Menu.Item as='a' onClick={() => window.open('https://github.com/TemporalAgent7/datacore', '_blank')}>
							<Icon name='github' />
						</Menu.Item>
						<Menu.Item as='a' onClick={() => (window as any).swapThemeCss()}>
							<Icon name='adjust' />
						</Menu.Item>
					</Menu.Menu>
				</Menu>

				<Modal open={loginDialogOpen} onClose={() => this._closeLoginDialog()} size='tiny'>
					<Modal.Header>Log-in to your account</Modal.Header>
					<Modal.Content>
						<Grid textAlign='center' verticalAlign='middle'>
							<Grid.Column style={{ maxWidth: 450 }}>
								<Form size='large' loading={loggingIn}>
									<Segment>
										<Form.Input
											fluid
											icon='user'
											iconPosition='left'
											placeholder='Username'
											value={user}
											onChange={(e, { value }) => this.setState({ user: value })}
										/>
										<Form.Input
											fluid
											icon='lock'
											iconPosition='left'
											placeholder='Password'
											type='password'
											value={password}
											onChange={(e, { value }) => this.setState({ password: value })}
										/>
									</Segment>
								</Form>
								{errorMessage && <Message error>{errorMessage}</Message>}
								{!errorMessage && (
									<Message>If you are an approved book editor, log in here to submit changes directly from the site.</Message>
								)}
							</Grid.Column>
						</Grid>
					</Modal.Content>
					<Modal.Actions>
						<Button content='Cancel' onClick={() => this._closeLoginDialog()} />
						<Button positive content='Login' onClick={() => this._doLogin()} />
					</Modal.Actions>
				</Modal>

				<Modal open={messageModalOpen} closeOnEscape={false} closeOnDimmerClick={false} onClose={() => this._closeMessageDialog()}>
					<Modal.Header>DataCore website and bot are shutting down!</Modal.Header>
					<Modal.Content>
						<p>Due to unaddressed <a href='https://forum.disruptorbeam.com/stt/discussion/16369/offer-wall-feedback-thread-live-now#latest'>concerns</a> around built-in adware and integration with scummy features like the Offer Wall, I've decided to stop investing my time and money in supporting these community tools.</p>
						<p>Most of my work is open source, so if someone wants to take over maintenance and hosting for the website and bot, here are some links:</p>
						<ul>
							<li><a href='https://github.com/TemporalAgent7/datacore'>The DataCore website (TypeScript)</a></li>
							<li><a href='https://github.com/TemporalAgent7/datacorebot'>The DataCore bot (TypeScript / node.js)</a></li>
							<li><a href='https://github.com/TemporalAgent7/datacore-bot'>The image analysis for beholds and voyages (C# / dotnetcore)</a></li>
						</ul>
						<p>Until the end of August 2020 I'll try to open source more bits and pieces of my work. My hope is that whatever ends up being built with these will benefit the entire community, not just closed / private cliques.</p>
						<p>Live long and prosper!</p>
					</Modal.Content>
					<Modal.Actions>
						<Button icon='checkmark' onClick={() => this._closeMessageDialog()} content='Ok' />
					</Modal.Actions>
				</Modal>
			</div>
		);
	}

	_doLogin() {
		const { user, password } = this.state;
		this.setState({ loggingIn: true });

		fetch('https://datacore.app/api/login', {
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ user, password }),
		})
			.then((response) => response.json())
			.then((res) => {
				if (res.error || !res.token) {
					this.setState({ loggingIn: false, errorMessage: res.error });
				} else {
					// Logged in
					window.localStorage.setItem('token', res.token);
					window.localStorage.setItem('username', user);
					this.setState({ loggingIn: false, loginDialogOpen: false });
				}
			})
			.catch((err) => {
				this.setState({ loggingIn: false, errorMessage: err.toString() });
			});
	}

	_showLoginDialog(isLoggedIn: boolean) {
		if (isLoggedIn) {
			window.localStorage.removeItem('token');
			window.localStorage.removeItem('username');
		} else {
			this.setState({ loginDialogOpen: true });
		}
	}

	_closeLoginDialog() {
		this.setState({ loginDialogOpen: false });
	}

	_closeMessageDialog() {
		this.setState({ messageModalOpen: false });
	}
}

export default TopMenu;
