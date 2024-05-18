import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { NavItem, createSubMenu, renderSubmenuItem } from '../page/util';
import NavigationSettings, { NavigationSettingsConfig } from '../page/settings';
import { Dropdown, Icon } from 'semantic-ui-react';
import { useStateWithStorage } from '../../utils/storage';

type PlayerMenuProps = {
	requestPanel: (target: string, panel: string | undefined) => void;
	vertical?: boolean;
	navConfig?: NavigationSettingsConfig;
};

export const PlayerMenu = (props: PlayerMenuProps): JSX.Element => {
	const globalContext = React.useContext(GlobalContext);
	const { reset, showPlayerGlance, setShowPlayerGlance } = globalContext.player;
	const [modalOpen, setModalOpen] = React.useState(false);
	const {
		requestPanel,
	} = props;

	const { playerData } = globalContext.player;

	const playerMenu = [
		{
			title: "Import Player Data",
			checkVisible: (data) => !playerData,
			customAction: (e, data) => requestPanel('player', 'input')
		},
		{
			title: "Update Player Data",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('player', 'input')
		},
		// {
		// 	title: "About Me",
		// 	checkVisible: (data) => !!playerData,
		// 	customAction: (e, data) => requestPanel('dashboard', 'info')
		// },
		{
			title: "My Achievements",
			link: "/achievements"
		},
		{
			title: "My Charts & Stats",
			link: "/charts"
		},
		{
			title: "Share Profile",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('dashboard', 'share')
		},
		{
			title: "Menu Settings",
			checkVisible: (data) => !!playerData,
			customRender: (data) => {
				if (props.navConfig) {
					return (
						<NavigationSettings
							key='menusettings'
							config={props.navConfig}
							renderTrigger={() => renderSubmenuItem(data, undefined, !props.vertical)}
							isOpen={modalOpen} setIsOpen={setModalOpen}
						/>
					);
				}
				return <Dropdown.Item key='menusettings' disabled>Menu Settings</Dropdown.Item>;
			},
			customAction: (e, data) => setModalOpen(true)
		},
		{
			title: <div><Icon name={showPlayerGlance ? 'toggle off' : 'toggle on'} />&nbsp;Toggle At-A-Glance Panel</div>,
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => {
				setShowPlayerGlance(!showPlayerGlance);
			}
		},
		{
			title: "Clear Player Data",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => { if (reset) reset(); }
		}
	] as NavItem[];

	if (props.vertical) {
		return (
			<React.Fragment>
				{playerMenu.filter(item => item.checkVisible && item.checkVisible(item)).map((item) => {
					return item.customRender ? item.customRender(item) : renderSubmenuItem(item);
				})}
			</React.Fragment>
		);
	}
	else {
		const items = playerMenu.filter(item => item.checkVisible ? item.checkVisible(item) : true);
		return (
			<React.Fragment>
				{createSubMenu(playerData?.player.character.display_name ?? '', items)}
			</React.Fragment>
		);
	}
};
