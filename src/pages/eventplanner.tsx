import React from 'react';

import { PlayerCrew } from '../model/player';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { RosterPicker } from '../components/eventplanner/rosterpicker';
import { EventPicker } from '../components/eventplanner/eventpicker';
import { getRecentEvents, getEventData } from '../utils/events';

import { IEventData } from '../components/eventplanner/model';
import { Icon } from 'semantic-ui-react';

const EventPlannerPage = () => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;
	const { event_instances } = globalContext.core;
	const [activeEvents, setActiveEvents] = React.useState<IEventData[] | undefined>(undefined);
	const [rosterType, setRosterType] = React.useState(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<PlayerCrew[] | undefined>(undefined);

	React.useEffect(() => {
		setRosterType(playerData ? 'myCrew' : 'allCrew');
		if (event_instances?.length) getEvents();
	}, [playerData, event_instances]);

	return (
		<DataPageLayout
			demands={['event_instances']}
			pageTitle='Event Planner'
			pageDescription='Find the best crew to use during an event.'
			playerPromptType='recommend'
		>
			<React.Fragment>
				<RosterPicker
					rosterType={rosterType} setRosterType={setRosterType}
					setRosterCrew={setRosterCrew}
				/>
				{activeEvents && rosterCrew &&
					<EventPicker key={rosterType}
						events={activeEvents}
						rosterType={rosterType}
						rosterCrew={rosterCrew}
					/>
				}
			</React.Fragment>
		</DataPageLayout>
	);

	function getEvents(): void {
		// Get event data from recently uploaded playerData
		if (ephemeral?.events) {
			const currentEvents = ephemeral.events.map((ev) => getEventData(ev, globalContext.core.crew))
				.filter(ev => ev !== undefined).map(ev => ev as IEventData)
				.filter(ev => ev.seconds_to_end > 0)
				.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
			setActiveEvents([...currentEvents]);
		}
		// Otherwise guess event from autosynced events
		else {
			getRecentEvents(globalContext.core.crew, globalContext.core.event_instances).then(recentEvents => {
				setActiveEvents([...recentEvents]);
			});
		}
	}
};

export default EventPlannerPage;
