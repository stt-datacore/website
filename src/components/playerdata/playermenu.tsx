import React from 'react';
import { Menu, Dropdown } from 'semantic-ui-react';

import { GlobalContext } from '../../context/globalcontext';

type PlayerMenuProps = {
	requestPanel: (panel: string | undefined) => void;
	requestClearData: () => void;
};

export const PlayerMenu = (props: PlayerMenuProps) => {
	const globalContext = React.useContext(GlobalContext);
	const {
		requestPanel,
		requestClearData,
	} = props;

	const { playerData } = globalContext.player;

	if (!playerData) {
		return (
			<Menu.Item className='link item' onClick={() => requestPanel('input')}>
				Import Player Data...
			</Menu.Item>
		);
	}

	return (
		<Menu.Menu>
			<Dropdown item simple text={playerData.player.character.display_name}>
				<Dropdown.Menu>
					<Dropdown.Item onClick={() => requestPanel('input')}>
						Update player data...
					</Dropdown.Item>
					<Dropdown.Item onClick={() => requestPanel('share')}>
						Share profile...
					</Dropdown.Item>
					<Dropdown.Item onClick={() => requestPanel('card')}>
						About me...
					</Dropdown.Item>
					<Dropdown.Item onClick={() => requestClearData()}>
						Clear player data
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown>
		</Menu.Menu>
	);
/*
	return (
		<Menu.Menu>
			<ul style={{padding:0}}>
				{!playerData && (
					<React.Fragment>
						<li className={`ui button ${currentPanel === 'input' ? 'toggle active' : ''}`}><span onClick={() => requestPanel('input')} style={{ cursor: 'pointer' }}>Import player data...</span></li>
					</React.Fragment>
				)}
				{playerData && (
					<React.Fragment>
						<li className={`ui button ${currentPanel === 'card' ? 'toggle active' : ''}`}><span onClick={() => requestPanel('card')} style={{ cursor: 'pointer' }}>Logged in as {playerData.player.character.display_name}</span></li>
						<li className={`ui button ${currentPanel === 'input' ? 'toggle active' : ''}`}><span onClick={() => requestPanel('input')} style={{ cursor: 'pointer' }}>Update player data...</span></li>
						<li className={`ui button ${currentPanel === 'share' ? 'toggle active' : ''}`}><span onClick={() => requestPanel('share')} style={{ cursor: 'pointer' }}>Share profile...</span></li>
						<li className={`ui button disabled`}>Export</li>
						<li className={`ui button`}><span onClick={() => requestClearData()} style={{ cursor: 'pointer' }}>Clear player data</span></li>
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
