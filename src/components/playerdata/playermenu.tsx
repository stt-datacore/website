import React from 'react';
import { Menu, Dropdown } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';
import { NavItem, createSubMenu, renderSubmenuItem } from '../page/util';
import { v4 } from 'uuid';

type PlayerMenuProps = {
	requestPanel: (panel: string | undefined) => void;
	requestClearData: () => void;	
	vertical?: boolean;
};


export const PlayerMenu = (props: PlayerMenuProps): JSX.Element => {
	const globalContext = React.useContext(GlobalContext);
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
			title: "Update player data...",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('input')
		},
		{
			title: "Share profile...",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('share')
		},
		{
			title: "About me...",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestPanel('card')
		},
		{
			title: "Clear Player Data",
			checkVisible: (data) => !!playerData,
			customAction: (e, data) => requestClearData()
		},
	] as NavItem[];
	
	if (props.vertical) {
		return <>{playerMenu.map((item) => {
			const itemKey = item.title ?? item.tooltip ?? v4();
			if (item.checkVisible && !item.checkVisible(item)) return <></>
			return (<>{renderSubmenuItem(item)}</>)
		})}</>;	
	}
	else {
		
		const items = playerMenu.filter(item => item.checkVisible ? item.checkVisible(item) : true);
		return <>{createSubMenu(playerData?.player.character.display_name ?? '', items)}</>;			
	}
/*
	return (
		<Menu.Menu>
			<ul style={{padding:0}}>
				{!playerData && (
					<React.Fragment>
						<li className={`ui button ${currentPanel === 'input' ? 'toggle active' : ''}`} onClick={() => requestPanel('input')} style={{ cursor: 'pointer' }}>Import player data...</li>
					</React.Fragment>
				)}
				{playerData && (
					<React.Fragment>
						<li className={`ui button ${currentPanel === 'card' ? 'toggle active' : ''}`} onClick={() => requestPanel('card')} style={{ cursor: 'pointer' }}>Logged in as {playerData.player.character.display_name}</li>
						<li className={`ui button ${currentPanel === 'input' ? 'toggle active' : ''}`} onClick={() => requestPanel('input')} style={{ cursor: 'pointer' }}>Update player data...</li>
						<li className={`ui button ${currentPanel === 'share' ? 'toggle active' : ''}`} onClick={() => requestPanel('share')} style={{ cursor: 'pointer' }}>Share profile...</li>
						<li className={`ui button disabled`}>Export</li>
						<li className={`ui button`} onClick={() => requestClearData()} style={{ cursor: 'pointer' }}>Clear player data</li>
					</React.Fragment>
				)}
			</ul>
		</React.Fragment>
	);
*/
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
