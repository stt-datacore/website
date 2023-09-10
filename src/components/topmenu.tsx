import React, { PureComponent, useState } from 'react';
import { Container, Dropdown, Popup, Menu, Icon, Button, Modal, Form, Grid, Message, Segment, Sidebar } from 'semantic-ui-react';
import { navigate } from 'gatsby';

// import { createMedia } from '@artsy/fresnel';

import { useOtherPages } from './otherpages';
import { useStateWithStorage} from '../utils/storage';
import { playerTools } from '../pages/playertools';
import { DEFAULT_MOBILE_WIDTH } from './hovering/hoverstat';

// const { MediaContextProvider, Media } = createMedia({
// 	breakpoints: {
// 		mobile: 0,
// 		computer: 1024
// 	}
// });

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

const useMainMenuItems = (verticalLayout: boolean) => {
	const createSubMenu = (title, children) => {
		const menuKey = title.toLowerCase().replace(/[^a-z0-9_]/g, '');
		if (verticalLayout) {
			return (
				<Menu.Item key={`/${menuKey}`}>
					<Menu.Header>{title}</Menu.Header>
					<Menu.Menu>
						{children.map(item => (
							<Menu.Item key={`${menuKey}${item.link}`} onClick={() => navigate(item.link)}>
								{item.title}
							</Menu.Item>
						))}
					</Menu.Menu>
				</Menu.Item>
			);
		} else {
			return (
				<Dropdown key={`/${menuKey}`} item simple text={title}>
					<Dropdown.Menu>
						{children.map(item => (
							<Dropdown.Item key={`${menuKey}${item.link}`} onClick={() => navigate(item.link)}>
								{item.title}
							</Dropdown.Item>
						))}
					</Dropdown.Menu>
				</Dropdown>
			);
		}
	};

	let items = [
		<Menu.Item key='/' onClick={() => navigate('/')}>
			Crew stats
		</Menu.Item>,
		<Menu.Item key='/behold' onClick={() => navigate('/behold')}>
			Behold
		</Menu.Item>
	];

	items.push(createSubMenu('Player tools', Object.entries(playerTools).filter(([key, value]) => !value.noMenu).map(([key, value]) => ({
			title: value.title,
			link: `/playertools?tool=${key}`
		})))
	);

	const pages = [
		{ title: 'Events', link: '/events' },
		{ title: 'Collections', link: '/collections' },
		{ title: 'Items', link: '/items' },
		{ title: 'Gauntlets', link: '/gauntlets' },
		{ title: 'Misc stats', link: '/stats' },
		{ title: 'Episodes', link: '/episodes' },
		{ title: 'Hall of Fame', link: '/hall_of_fame' },
		{ title: 'Worfle', link: '/crewchallenge' }
	];
	items.push(createSubMenu('Pages', pages));

	items.push(<Menu.Item key='bigbook' onClick={() => navigate('https://bigbook.app')}>Big book</Menu.Item>);

	const about = [
		{ title: 'About DataCore', link: '/about' },
		{ title: 'Announcements', link: '/announcements' }
	];
	// Show other markdowns as discovered by Gatsby in About menu
	const otherPages = useOtherPages();
	otherPages.map((page) => {
		about.push(
			{ title: page.title, link: page.slug }
		);
	});
	items.push(createSubMenu('About', about));

	if (verticalLayout) {
		return items;
	} else {
		return <Container>{items}</Container>;
	}
};

const useRightItems = ({ onMessageClicked }) => {
const betaSite = typeof window !== 'undefined' && window.location.hostname.includes("beta");
const toggle = betaSite ? <Icon name="toggle on" /> : <Icon name="toggle off" />


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
		<Menu.Item onClick={() => navigate(`https://${betaSite ? '' : 'beta.'}datacore.app`)}>
			<Popup position='bottom center' flowing hoverable trigger={<span><Icon name='bug' />{toggle}</span>}>
				<p>Switch to {betaSite ? 'stable' : 'experimental'} site</p>
			</Popup>
		</Menu.Item>
	</>);
};

type NavBarProps = {
	children: React.ReactNode;
	narrowLayout?: boolean;
	onMessageClicked: () => void;
	mobile?: boolean;
};

const NavBar = ({ children, narrowLayout, onMessageClicked, mobile }: NavBarProps) => {
	const rightItems = useRightItems({ onMessageClicked });

	if (mobile) {
		return ( 
			<NavBarMobile leftItems={useMainMenuItems(true)} rightItems={rightItems}>
				{children}
			</NavBarMobile> 
		)
	}
	else {
		return (
			<NavBarDesktop narrowLayout={narrowLayout} leftItems={useMainMenuItems(false)} rightItems={rightItems}>
				{children}
			</NavBarDesktop>
		)		
	}
};

type TopMenuProps = {
	narrowLayout?: boolean;
	children?: React.ReactNode
};

type TopMenuState = {
	loginDialogOpen: boolean;
	loggingIn: boolean;
	user: string;
	password: string;
	errorMessage: string | undefined;
	messageModalOpen: boolean;
	mobile?: boolean;
};

class TopMenu extends PureComponent<TopMenuProps, TopMenuState> {
	

	constructor(props: TopMenuProps){
		super(props);
		this.state = { mobile: undefined, user: '', password: '', errorMessage: '', loginDialogOpen: false, loggingIn: false, messageModalOpen: false };
	}

	render() {
		const { mobile, user, password, loginDialogOpen, loggingIn, errorMessage, messageModalOpen } = this.state;
		const { narrowLayout, children } = this.props;
		const windowGlobal = typeof window !== 'undefined' && window;
		let isLoggedIn = windowGlobal && window.localStorage && window.localStorage.getItem('token') && window.localStorage.getItem('username');
		
		const userName = isLoggedIn ? window.localStorage.getItem('username') : '';
		const detectMobile = windowGlobal && window.innerWidth < DEFAULT_MOBILE_WIDTH;

		// console.log("Mobile mode: " + detectMobile);
		// console.log("Mobile State: " + mobile);
		
		if (windowGlobal) {
			// console.log("Inner Window Width " + window.innerWidth);

			window.addEventListener('resize', (e) => {
				const isMobile = windowGlobal && window.innerWidth < DEFAULT_MOBILE_WIDTH;

				if (isMobile !== mobile) {
					if (isMobile) {
						this.setState({ ... this.state, mobile: true });
					}
					else {
						this.setState({ ... this.state, mobile: false });
					}
				}
			});
			if (mobile === undefined) {
				window.setTimeout(() => {
					const detectMobile = windowGlobal && window.innerWidth < DEFAULT_MOBILE_WIDTH;
					this.setState({ ... this.state, mobile: detectMobile });
				});				

				return <></>;
			}
		}
		
		return (
			<React.Fragment>
				<NavBar mobile={mobile || detectMobile} narrowLayout={narrowLayout} onMessageClicked={() => this.setState({ messageModalOpen: true })}>
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
