import React from 'react';

import { GlobalContext } from '../context/globalcontext';
import { RosterTable } from '../components/crewtables/rostertable';
import { PlayerBuffMode } from '../model/player';

type ProfileCrewProps = {
	pageId?: string;
};

const ProfileCrew = (props: ProfileCrewProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
    const [buffMode, setBuffMode] = React.useState<PlayerBuffMode | undefined>('player');
	if (!playerData) return <></>;

	return (
		<React.Fragment>
			<RosterTable 
                buffMode={buffMode}
                setBuffMode={setBuffMode}
                key={'profileView' + props.pageId}
				pageId='profile'
				rosterCrew={playerData.player.character.crew} rosterType='profileCrew'
			/>
		</React.Fragment>
	)
};

export default ProfileCrew;
