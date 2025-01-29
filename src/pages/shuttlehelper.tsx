import React from 'react';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { IEventData, IRosterCrew } from '../components/eventplanner/model';
import { RosterPicker } from '../components/eventplanner/rosterpicker';
import { HelperMode } from '../components/shuttlehelper/helpermode';
import { ShuttleHelper, EventShuttleHelper } from '../components/shuttlehelper/shuttlehelper';
import { QPConfigProvider } from '../components/qpconfig/provider';

const ShuttleHelperPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData } = globalContext.player;
	const { t, tfmt } = globalContext.localized;
	const [rosterType, setRosterType] = React.useState<'myCrew' | 'allCrew'>(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<IRosterCrew[]>([]);
	const [eventData, setEventData] = React.useState<IEventData | undefined>(undefined);

	// Only use EventShuttleHelper when 1) there's player data AND 2) there's an active event AND 3) using myCrew as roster
	const eventMode = !!playerData && !!eventData && eventData.seconds_to_start === 0 && rosterType === 'myCrew';

	return (
		<DataPageLayout
			demands={['event_instances']}
			pageTitle={t('menu.tools.shuttle_helper')}
			pageDescription={t('shuttle_helper.heading')}
			playerPromptType='recommend'
		>
			<QPConfigProvider pageId={'shuttle_planner'}>
				<React.Fragment>
					<RosterPicker
						rosterType={rosterType as string}
						setRosterType={(rosterType: string) => setRosterType(rosterType as 'myCrew' | 'allCrew')}
						setRosterCrew={setRosterCrew}
					/>
					<HelperMode rosterType={rosterType} setEventData={setEventData} />
					{!eventMode && (
						<ShuttleHelper key={eventData ? eventData.symbol : 'dailies'}
							rosterType={rosterType} rosterCrew={rosterCrew}
							eventData={eventData}
						/>
					)}
					{eventMode && (
						<EventShuttleHelper key={eventData.symbol}
							dbid={`${playerData.player.dbid}`}
							rosterType={rosterType} rosterCrew={rosterCrew}
							eventData={eventData}
						/>
					)}
				</React.Fragment>
			</QPConfigProvider>
		</DataPageLayout>
	);
};

export default ShuttleHelperPage;
