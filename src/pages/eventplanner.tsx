import React from 'react';
import { Message } from 'semantic-ui-react';

import { PlayerCrew } from '../model/player';

import { GlobalContext } from '../context/globalcontext';
import DataPageLayout from '../components/page/datapagelayout';

import { RosterPicker } from '../components/eventplanner/rosterpicker';
import { EventPicker } from '../components/eventplanner/eventpicker';
import { getRecentEvents, getEventData } from '../utils/events';

import { IEventData } from '../components/eventplanner/model';

const EventPlannerPage = () => {
	return (
		<DataPageLayout
			demands={['event_instances']}
			pageTitle='Event Planner'
			pageDescription='Find the best crew to use during an event.'
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
	const { playerData, ephemeral } = globalContext.player;
	const [activeEvents, setActiveEvents] = React.useState<IEventData[] | undefined>(undefined);
	const [rosterType, setRosterType] = React.useState(playerData ? 'myCrew' : 'allCrew');
	const [rosterCrew, setRosterCrew] = React.useState<PlayerCrew[] | undefined>(undefined);

	React.useEffect(() => {
		setRosterType(playerData ? 'myCrew' : 'allCrew');
		getEvents();
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
					Information about the next event is not yet available from player data. Please try again at a later time.
				</Message>
			)}
		</React.Fragment>
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
