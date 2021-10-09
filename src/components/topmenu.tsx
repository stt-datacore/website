import React, { PureComponent, useState } from 'react';
import { Container, Dropdown, Popup, Menu, Icon, Button, Modal, Form, Grid, Message, Segment, Sidebar } from 'semantic-ui-react';
import { navigate } from 'gatsby';

import { createMedia } from '@artsy/fresnel';

import { useOtherPages } from './otherpages';
<<<<<<< HEAD
import { useStateWithStorage} from '../utils/storage';
import { playerTools } from '../pages/playertools';
=======
>>>>>>> 254417b2b0463aaa4868c0aa959b105e7cf88163

const { MediaContextProvider, Media } = createMedia({
	breakpoints: {
		mobile: 0,
		computer: 1024
	}
});

const MainContent = ({ children, narrowLayout }) =>
	narrowLayout ? (
		<Container text style={{ marginTop: '4em', paddingBottom: '2em', marginBottom: '2em' }}>{children}</Container>
	) : (
		<Container style={{ marginTop: '4em', marginBottom: '2em' }}>{children}</Container>
	);

const NavBarMobile = ({ children, leftItems, rightItems }) => {
	const [visible, setVisible] = useState(false);

	return (
		<Sidebar.Pushable>
			<Sidebar as={Menu} animation='overlay' inverted vertical onHide={() => setVisible(false)} visible={visible}>
				{leftItems}
			</Sidebar>
			<Sidebar.Pusher dimmed={visible} style={{ minHeight: '100vh', overflowX: 'scroll' }}>
				<Menu fixed='top' inverted>
					<Menu.Item onClick={() => setVisible(!visible)}>
						<Icon name='sidebar' />
					</Menu.Item>
					<Menu.Menu position='right'>{rightItems}</Menu.Menu>
				</Menu>
				<MainContent narrowLayout={false}>{children}</MainContent>
			</Sidebar.Pusher>
		</Sidebar.Pushable>
	);
};

const NavBarDesktop = ({ children, leftItems, narrowLayout, rightItems }) => (
	<React.Fragment>
		<Menu fixed='top' inverted>
			{leftItems}
			<Menu.Menu position='right'>{rightItems}</Menu.Menu>
		</Menu>
		<MainContent narrowLayout={narrowLayout}>{children}</MainContent>
	</React.Fragment>
);

// const playerToolsMenu = {
// 	title: 'Player tools',
// 	items: playerTools.map([key, value]) => ({onClick: text: value})
// }

// TODO: we do all this weird functional dance because we want Gatsby to SSR the "other pages" via GraphQL
// If we switch to a hard-coded list of "other pages", this can be simplified significantly
const useMainMenuItems = (verticalLayout: boolean) => {
	const otherPages = useOtherPages();
	const createSubMenu = (title, children) => {
		if (verticalLayout) {
			return (
				<Menu.Item>
					<Menu.Header key={index++}>{title}</Menu.Header>
					<Menu.Menu>
						{children.map(item => (
							<Menu.Item key={index++} onClick={() => navigate(item.link)}>
								{item.title}
							</Menu.Item>
						))}
					</Menu.Menu>
				</Menu.Item>
			);
		} else {
			return (
				<Dropdown key={index++} item simple text={title}>
					<Dropdown.Menu>
						{children.map(item => (
							<Dropdown.Item onClick={() => navigate(item.link)}>
								{item.title}
							</Dropdown.Item>
						))}
					</Dropdown.Menu>
				</Dropdown>
			);
		}
	};

	let index = 0;
	let items = [
		<Menu.Item key={index++} onClick={() => navigate('/')}>
			Crew stats
		</Menu.Item>,
		<Menu.Item key={index++} onClick={() => navigate('/about')}>
			About
		</Menu.Item>
	];

	items.push(createSubMenu('Big book (legacy)', [
			{title: 'Image list (fast)', link: '/bigbook2'},
			{title: 'Complete (slow)', link: '/bigbook'},
			{title: 'Text only', link: '/bb'}
		])
	);

	items.push(createSubMenu('Player tools', Object.entries(playerTools).map(([key, value]) => ({
			title: value.title,
			link: `/playertools?tool=${key}`
		})))
  );

	items.push(
		<Menu.Item key={index++} onClick={() => navigate('/behold')}>
			Behold
		</Menu.Item>
	);

	if (verticalLayout) {
		items.push(
			<Menu.Item>
				<Menu.Header key={index++}>Pages</Menu.Header>
				<Menu.Menu>
					<Menu.Item key={index++} onClick={() => navigate('/collections')}>
						Collections
					</Menu.Item>
					<Menu.Item key={index++} onClick={() => navigate('/items')}>
						Items
					</Menu.Item>
					<Menu.Item key={index++} onClick={() => navigate('/stats')}>
						Misc stats
					</Menu.Item>
					<Menu.Item key={index++} onClick={() => navigate('/episodes')}>
						Episodes
					</Menu.Item>
					<Menu.Item key={index++} onClick={() => navigate('/hall_of_fame')}>
						Hall of Fame
					</Menu.Item>
				</Menu.Menu>
			</Menu.Item>,
			<Menu.Item>
				<Menu.Header key={index++}>All other pages</Menu.Header>
				<Menu.Menu>
					{otherPages.map((page) => (
						<Menu.Item as='a' key={page.slug} onClick={() => navigate(page.slug)}>
							{page.title}
						</Menu.Item>
					))}
				</Menu.Menu>
			</Menu.Item>
		);
	} else {
		items.push(
			<Dropdown key={index++} item simple text='Pages'>
				<Dropdown.Menu>
					<Dropdown.Item onClick={() => navigate('/collections')}>Collections</Dropdown.Item>
					<Dropdown.Item onClick={() => navigate('/items')}>Items</Dropdown.Item>
					<Dropdown.Item onClick={() => navigate('/stats')}>Misc stats</Dropdown.Item>
					<Dropdown.Item onClick={() => navigate('/episodes')}>Episodes</Dropdown.Item>
					<Dropdown.Item onClick={() => navigate('/hall_of_fame')}>Hall of Fame</Dropdown.Item>
					<Dropdown.Divider />
					<Dropdown.Header>All other pages</Dropdown.Header>
					{otherPages.map((page) => (
						<Dropdown.Item as='a' key={page.slug} onClick={() => navigate(page.slug)}>
							{page.title}
						</Dropdown.Item>
					))}
				</Dropdown.Menu>
			</Dropdown>
		);
	}

	if (verticalLayout) {
		return items;
	} else {
		return <Container>{items}</Container>;
	}
};

const useRightItems = ({ onMessageClicked }) => {
	const [strippedPlayerData] = useStateWithStorage('tools/playerData', undefined);
	const [profileShared] = useStateWithStorage('tools/profileShared', false);

	const profileIcon = <Image src='/media/badge.png' />;
	const shareUrl = strippedPlayerData ? `/${process.env.GATSBY_DATACORE_URL}profile/?dbid=${strippedPlayerData.player.dbid}` : '';

	return (<>
		<Menu.Item onClick={() => (window as any).swapThemeCss()}>
			<Icon name='adjust' />
		</Menu.Item>
		<Menu.Item>
			<Popup position='bottom center' flowing hoverable trigger={<Icon name='dollar' />}>
				<p>We have enough reserve funds for now!</p>
				<p>
					Monthly cost <b>$15</b>, reserve fund <b>$205</b>
				</p>
				<p>
					You can join our <a href='https://www.patreon.com/Datacore'>Patreon</a> for future funding rounds.
				</p>
			</Popup>
		</Menu.Item>
		<Menu.Item>
			<Button size='tiny' color='green' onClick={onMessageClicked} content={'Developers needed!'} />
		</Menu.Item>
		<Menu.Item onClick={() => window.open('https://github.com/stt-datacore/website', '_blank')}>
			<Icon name='github' />
		</Menu.Item>
	</>);
};

type NavBarProps = {
	children: React.ReactNode;
	narrowLayout?: boolean;
	onMessageClicked: () => void;
};

const NavBar = ({ children, narrowLayout, onMessageClicked }: NavBarProps) => {
	const rightItems = useRightItems({ onMessageClicked });

	return (
		<MediaContextProvider>
			<Media at='mobile'>
				<NavBarMobile leftItems={useMainMenuItems(true)} rightItems={rightItems}>
					{children}
				</NavBarMobile>
			</Media>
			<Media greaterThanOrEqual='computer'>
				<NavBarDesktop narrowLayout={narrowLayout} leftItems={useMainMenuItems(false)} rightItems={rightItems}>
					{children}
				</NavBarDesktop>
			</Media>
		</MediaContextProvider>
	);
};

type TopMenuProps = {
	narrowLayout?: boolean;
};

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
		const { narrowLayout, children } = this.props;
		const windowGlobal = typeof window !== 'undefined' && window;
		let isLoggedIn = windowGlobal && window.localStorage && window.localStorage.getItem('token') && window.localStorage.getItem('username');
		const userName = isLoggedIn ? window.localStorage.getItem('username') : '';

		return (
			<React.Fragment>
				<NavBar narrowLayout={narrowLayout} onMessageClicked={() => this.setState({ messageModalOpen: true })}>
					{children}
				</NavBar>

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
					<Modal.Header>The DataCore website and bot are in need of software engineers!</Modal.Header>
					<Modal.Content>
						<p>
							We need your help! The project is <a href='https://github.com/stt-datacore'>open source</a> so we're open for contributions
							from software engineers, designers, devops, testers and so on. Reach out on our{' '}
							<a href='https://discord.gg/2SY8W7Aeme'>development Discord</a> if you're not sure where to start.
						</p>
						<p>
							If you've always wanted a feature on DataCore, here's your chance to hack on the project and implement it yourself! Most of
							the project is written in TypeScript, with node.js on the backend and React with Gatsby on the frontend.
						</p>
					</Modal.Content>
					<Modal.Actions>
						<Button icon='checkmark' onClick={() => this._closeMessageDialog()} content='Ok' />
					</Modal.Actions>
				</Modal>
			</React.Fragment>
		);
	}

	_doLogin() {
		const { user, password } = this.state;
		this.setState({ loggingIn: true });

		fetch(`${process.env.GATSBY_DATACORE_URL}api/login`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ user, password })
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
