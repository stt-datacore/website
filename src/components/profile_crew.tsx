import React from 'react';

import { GlobalContext } from '../context/globalcontext';
import { RosterTable } from '../components/crewtables/rostertable';

type ProfileCrewProps = {

};

const ProfileCrew = (props: ProfileCrewProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	if (!playerData) return <></>;

	return (
		<React.Fragment>
			<RosterTable key='profileView'
				pageId='profile'
				rosterCrew={playerData.player.character.crew} rosterType='profileCrew'
			/>
		</React.Fragment>
	)
};

export default ProfileCrew;
