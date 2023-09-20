import React from 'react';

import { GlobalContext } from '../../context/globalcontext';
import { MaxMenuItems, MaxMobileItems, NavItem, createSubMenu, getAllOptions, renderSubmenuItem } from '../page/util';
import NavigationSettings, { NavigationSettingsConfig } from '../page/settings';
import { Dropdown, Menu } from 'semantic-ui-react';

type PlayerMenuProps = {
	requestPanel: (panel: string | undefined) => void;
	requestClearData: () => void;
	vertical?: boolean;
	navConfig?: NavigationSettingsConfig;
};

export const PlayerMenu = (props: PlayerMenuProps): JSX.Element => {
	const globalContext = React.useContext(GlobalContext);
	const [modalOpen, setModalOpen] = React.useState(false);

	const {
		requestPanel,
		requestClearData,
	} = props;

	const { playerData } = globalContext.player;

	const playerMenu = [
		{
			title: "Import Player Data...",
			checkVisible: (data) => !playerData,
			customAction: (e, data) => requestPanel('input')
		},
		{
			title: "Update Player Data...",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('input')
		},
		{
			title: "Share Profile...",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('share')
		},
		{
			title: "About Me...",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('card')
		},
		{
			title: "My Achievements",
			link: "/achievements"
		},
		{
			title: "My Charts & Stats",
			link: "/charts"
		},
		{
			title: "Menu Settings",
			checkVisible: (data) => !!playerData,
			customRender: (data) => {
				return props.navConfig ? <NavigationSettings 
				config={props.navConfig}
				renderTrigger={() => renderSubmenuItem(data, undefined, !props.vertical)}
				isOpen={modalOpen} setIsOpen={setModalOpen} 				
				/> : <Dropdown.Item disabled>Menu Settings</Dropdown.Item>
			},
			customAction: (e, data) => setModalOpen(true)
		},
		{
			title: "Clear Player Data",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestClearData()
		},
	] as NavItem[];

	if (props.vertical) {
		return (
			<React.Fragment>
				{playerMenu.map((item) => {
					if (item.checkVisible && !item.checkVisible(item)) return <></>;
					return item.customRender ? item.customRender(item) : renderSubmenuItem(item);
				})}				
			</React.Fragment>
		);
	}
	else {
		const items = playerMenu.filter(item => item.checkVisible ? item.checkVisible(item) : true);
		return <React.Fragment>
			{createSubMenu(playerData?.player.character.display_name ?? '', items)}			
			</React.Fragment>
	}
};


/*
	function exportCrewTool() {
		let text = playerData?.player.character.unOwnedCrew ? exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew)) : "";
		downloadData(`data:text/csv;charset=utf-8,${encodeURIComponent(text)}`, 'crew.csv');
	}

	function exportCrewToClipboard() {
		let text = playerData?.player.character.unOwnedCrew ? exportCrew(playerData.player.character.crew.concat(playerData.player.character.unOwnedCrew), '\t') : "";
		navigator.clipboard.writeText(text);
	}
*/
