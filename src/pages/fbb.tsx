import React from 'react';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { PlayerBossBattle } from '../components/fleetbossbattles/player';
import { NonPlayerBossBattle } from '../components/fleetbossbattles/nonplayer';

const FleetBossBattlesPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;

	const dbid = playerData?.player.dbid ?? '';

	return (
		<DataPageLayout
			pageTitle={t('menu.tools.fleet_boss_battles')}
			pageDescription={t('fbb.heading')}
			playerPromptType='require'
		>
			<React.Fragment>
				{!!playerData && <PlayerBossBattle dbid={`${dbid}`} />}
				{/* {!playerData && <NonPlayerBossBattle />} */}
			</React.Fragment>
		</DataPageLayout>
	);
};

export default FleetBossBattlesPage;
