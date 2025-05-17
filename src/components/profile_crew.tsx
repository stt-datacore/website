import React from 'react';

import { GlobalContext } from '../context/globalcontext';
import { RosterTable } from '../components/crewtables/rostertable';
import { PlayerBuffMode } from '../model/player';

type ProfileCrewProps = {
	pageId?: string;
	allCrew?: boolean;
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
				rosterCrew={playerData.player.character.crew.concat(props.allCrew ? playerData.player.character.unOwnedCrew ?? [] : [])}
				rosterType={props.allCrew ? 'allCrew' : 'profileCrew'}
			/>
		</React.Fragment>
	)
};

export default ProfileCrew;
