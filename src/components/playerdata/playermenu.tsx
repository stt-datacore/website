import React from 'react';

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
    const dbid = playerData?.player.dbid ?? '';

	return (
		<React.Fragment>
			<ul>
				{!playerData && (
					<React.Fragment>
						<li><a onClick={() => requestPanel('input')} style={{ cursor: 'pointer' }}>Upload player data...</a></li>
					</React.Fragment>
				)}
				{playerData && (
					<React.Fragment>
						<li><a onClick={() => requestPanel('card')} style={{ cursor: 'pointer' }}>Logged in as {playerData.player.character.display_name}</a></li>
						<li><a onClick={() => requestPanel('input')} style={{ cursor: 'pointer' }}>Update player data...</a></li>
						<li><a onClick={() => requestPanel('share')} style={{ cursor: 'pointer' }}>Share profile...</a></li>
						<li>Export</li>
						<li><a onClick={() => requestClearData()} style={{ cursor: 'pointer' }}>Clear player data</a></li>
					</React.Fragment>
				)}
				<li>(List player tools here?)</li>
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
