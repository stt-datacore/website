import React from 'react';
import { Message } from 'semantic-ui-react';

import { PlayerCrew } from '../model/player';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { RosterPicker } from '../components/eventplanner/rosterpicker';
import { EventPicker } from '../components/eventplanner/eventpicker';
import { getRecentEvents, getEventData, getEvents } from '../utils/events';

import { IEventData } from '../components/eventplanner/model';

const EventPlannerPage = () => {
	const { t } = React.useContext(GlobalContext).localized;
	return (
		<DataPageLayout
			demands={['event_instances', 'episodes']}
			pageTitle={t('menu.tools.event_planner')}
			pageDescription={t('event_planner.heading')}
			playerPromptType='recommend'
		>
			<React.Fragment>
				<EventPlannerSetup />
			</React.Fragment>
		</DataPageLayout>
	);
};

const EventPlannerSetup = () => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData, ephemeral } = globalContext.player;
	const [activeEvents, setActiveEvents] = React.useState<IEventData[] | undefined>(undefined);
	const [rosterType, setRosterType] = React.useState(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<PlayerCrew[] | undefined>(undefined);

	React.useEffect(() => {
		setRosterType(playerData ? 'myCrew' : 'allCrew');
		getEvents(globalContext).then((result) => setActiveEvents(result));
	}, [playerData]);

	if (!activeEvents) return <></>;

	return (
		<React.Fragment>
			{activeEvents.length > 0 && (
				<React.Fragment>
					<RosterPicker
						rosterType={rosterType} setRosterType={setRosterType}
						setRosterCrew={setRosterCrew}
					/>
					{rosterCrew &&
						<EventPicker key={rosterType}
							events={activeEvents}
							rosterType={rosterType}
							rosterCrew={rosterCrew}
						/>
					}
				</React.Fragment>
			)}
			{activeEvents.length === 0 && (
				<Message warning>
					{t('event_planner.warn_no_info')}
				</Message>
			)}
		</React.Fragment>
	);

	// function getEvents(): void {
	// 	// Get event data from recently uploaded playerData
	// 	if (ephemeral?.events) {
	// 		const currentEvents = ephemeral.events.map((ev) => getEventData(ev, globalContext.core.crew))
	// 			.filter(ev => ev !== undefined).map(ev => ev as IEventData)
	// 			.filter(ev => ev.seconds_to_end > 0)
	// 			.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
	// 		setActiveEvents([...currentEvents]);
	// 	}
	// 	// Otherwise guess event from autosynced events
	// 	else {
	// 		getRecentEvents(globalContext.core.crew, globalContext.core.event_instances).then(recentEvents => {
	// 			setActiveEvents([...recentEvents]);
	// 		});
	// 	}
	// }
};

export default EventPlannerPage;
