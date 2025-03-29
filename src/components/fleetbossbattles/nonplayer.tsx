import React from 'react';
import { Header } from 'semantic-ui-react';

export const NonPlayerBossBattle = () => {
	return (
		<React.Fragment>
			<Header as='h3'>
				No Fleet Boss Battle Data Available
			</Header>
			<p>Import your player data to help tailor this tool to your current fleet boss battles and roster. Otherwise, you can input your fleet's room code below to collaborate on a fleet boss battle.</p>
			<ol>
				<li>Allow non-player user to input room code.</li>
				<li>Retrieve bossBattleId from API call to /getBossBattleId?fleetId=fleedId&room=roomCode.</li>
				<li>Render non-player userContext wrapping Collaborator bossBattleId=bossBattleId fleetId=fleetId role=anonymous.</li>
			</ol>
		</React.Fragment>
	);
};
