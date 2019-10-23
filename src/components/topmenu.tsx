import React, { PureComponent } from 'react';
import { Container, Dropdown, Image, Menu, Icon } from 'semantic-ui-react';
import { navigate } from 'gatsby';
import { isMobile } from 'react-device-detect';

import OtherPages from './otherpages';

class TopMenu extends PureComponent {
	render() {
		return (
			<Menu fixed='top' inverted>
				<Container>
					<Menu.Header onClick={() => navigate('/')}>
						<Image size='mini' src='/media/logo.png' style={{ marginTop: '0.3em', marginRight: '1.5em' }} />
					</Menu.Header>
					<Menu.Item onClick={() => navigate('/')}>Crew stats</Menu.Item>
					<Menu.Item onClick={() => navigate('/about')}>About</Menu.Item>
					{!isMobile && <Menu.Item onClick={() => navigate('/bigbook')}>Big book</Menu.Item>}
					{isMobile && <Menu.Item onClick={() => navigate('/bb')}>Big book</Menu.Item>}
					{!isMobile && <Menu.Item onClick={() => navigate('/voyage')}>Player tools</Menu.Item>}
					<Menu.Item onClick={() => navigate('/behold')}>Behold</Menu.Item>

					<Dropdown item simple text='Pages'>
						<Dropdown.Menu>
							<Dropdown.Item onClick={() => navigate('/collections')}>Collections</Dropdown.Item>
							<Dropdown.Item onClick={() => navigate('/items')}>Items</Dropdown.Item>
							<Dropdown.Item disabled>Missions</Dropdown.Item>
							<Dropdown.Item disabled>Ships</Dropdown.Item>
							<Dropdown.Divider />
							<Dropdown.Header>All other pages</Dropdown.Header>
							<OtherPages />
						</Dropdown.Menu>
					</Dropdown>
				</Container>

				<Menu.Menu position='right'>
					<Menu.Item as='a' onClick={() => window.open('https://github.com/TemporalAgent7/datacore', '_blank')}>
						<Icon name='github' />
					</Menu.Item>
					<Menu.Item as='a' onClick={() => (window as any).swapThemeCss()}>
						<Icon name='adjust' />
					</Menu.Item>
				</Menu.Menu>
			</Menu>
		);
	}
}

export default TopMenu;
