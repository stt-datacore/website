import React from 'react';

import { GlobalContext } from '../../context/globalcontext';

type PlayerMenuProps = {
	currentPanel?: string;
	requestPanel: (panel: string | undefined) => void;
	requestClearData: () => void;
};

export const PlayerMenu = (props: PlayerMenuProps) => {
	const globalContext = React.useContext(GlobalContext);
	const {
		currentPanel,
		requestPanel,
		requestClearData,
	} = props;

	const { playerData } = globalContext.player;

	return (
		<React.Fragment>
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
