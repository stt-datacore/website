import React from 'react';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { PlayerBossBattle } from '../components/fleetbossbattles/player';
import { NonPlayerBossBattle } from '../components/fleetbossbattles/nonplayer';
import FleetInfoPage from '../components/fleet/fleet_info';

const FleetPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const dbid = playerData?.player.dbid ?? '';

	return (
		<DataPageLayout
			pageTitle='Fleet Info'
			pageDescription='Use this tool to get information about your fleet.'
			playerPromptType='require'
            demands={['factions', 'event_instances']}
		>
			<React.Fragment>
				{!!playerData && <FleetInfoPage />}
				{/* {!playerData && <NonPlayerBossBattle />} */}
			</React.Fragment>
		</DataPageLayout>
	);
};

export default FleetPage;
