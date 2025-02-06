import React from 'react';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { PlayerBossBattle } from '../components/fleetbossbattles/player';
import { NonPlayerBossBattle } from '../components/fleetbossbattles/nonplayer';
import FleetInfoPage from '../components/fleet/fleet_info';
import { FleetImportComponent } from '../components/fleet/fleetimporter';
import { Fleet, Member } from '../model/fleet';
import { useStateWithStorage } from '../utils/storage';

const FleetPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;

	const [fleet, setFleet] = useStateWithStorage<Fleet | undefined>('fleet_info', undefined);

	const dbid = playerData?.player.dbid ?? '';
	const guild = playerData?.player.fleet?.id ?? 0;

	return (
		<DataPageLayout
			pageTitle='Fleet Info'
			pageDescription='Use this tool to get information about your fleet.'
			playerPromptType='require'
            demands={['factions', 'event_instances']}
		>
			<React.Fragment>
				{/* Fleet Tool Is Disabled For Security Reasons */}
				{!!playerData && <React.Fragment>
					<FleetImportComponent
						setFleet={setFleet}
						clearFleet={() => setFleet(undefined)}
						/>
					{!!fleet && <FleetInfoPage fleet_id={guild} fleet_data={fleet} />}

					</React.Fragment>}
				{/* {!playerData && <NonPlayerBossBattle />} */}
			</React.Fragment>
		</DataPageLayout>
	);
};

export default FleetPage;
