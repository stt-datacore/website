import React from 'react';
import { Form, Message, Radio } from 'semantic-ui-react';

import { ShuttleAdventure } from '../../model/shuttle';
import { IEventData } from '../../components/eventplanner/model';
import { GlobalContext } from '../../context/globalcontext';

import { getRecentEvents, getEventData } from '../../utils/events';

type HelperModeProps = {
	rosterType: 'myCrew' | 'allCrew';
	setEventData: (activeEvent: IEventData | undefined) => void;
};

export const HelperMode = (props: HelperModeProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t, tfmt } = globalContext.localized;
	const { playerData, ephemeral } = globalContext.player;

	const [factionEvents, setFactionEvents] = React.useState<IEventData[] | undefined>(undefined);
	const [activeShuttles, setActiveShuttles] = React.useState<ShuttleAdventure[]>([]);
	const [helperMode, setHelperMode] = React.useState<string | undefined>(undefined);

	React.useEffect(() => {
		getFactionEvents();
		if (ephemeral?.shuttleAdventures)
			setActiveShuttles([...ephemeral.shuttleAdventures]);
		else
			setActiveShuttles([]);
	}, [playerData]);

	React.useEffect(() => {
		const selectedEvent: IEventData | undefined = factionEvents?.find(ev => ev.symbol === helperMode);
		if (selectedEvent)
			props.setEventData({...selectedEvent});
		else
			props.setEventData(undefined);
	}, [factionEvents, helperMode]);

	if (!factionEvents) return <></>;
	if (factionEvents.length === 0) return renderStandardOnly();

	return (
		<Message icon>
			<img src={`${process.env.GATSBY_ASSETS_URL}/atlas/shuttle_icon.png`} style={{ width: '3em', marginRight: '1em' }} />
			<Message.Content>
				<p>{t('shuttle_helper.mode.heading')}:</p>
				<Form style={{ marginTop: '1em' }}>
					{renderStandardOption()}
					{factionEvents.map(ev => renderEventOption(ev))}
				</Form>
			</Message.Content>
		</Message>
	);

	function getFactionEvents(): void {
		// Get event data from recently uploaded playerData
		if (ephemeral?.events) {
			const currentEvents = ephemeral.events.map((ev) => getEventData(ev, globalContext.core.crew))
				.filter(ev => ev !== undefined).map(ev => ev as IEventData)
				.filter(ev => ev.seconds_to_end > 0)
				.filter(ev => ev.content_types.includes('shuttles'))
				.sort((a, b) => (a && b) ? (a.seconds_to_start - b.seconds_to_start) : a ? -1 : 1);
			setFactionEvents([...currentEvents]);
			const activeEvent = currentEvents.find(ev => ev.seconds_to_start === 0);
			setHelperMode(activeEvent ? activeEvent.symbol : 'dailies');
		}
		// Otherwise guess event from autosynced events
		else {
			getRecentEvents(globalContext.core.crew, globalContext.core.event_instances).then(recentEvents => {
				const factionEvents: IEventData[] = recentEvents.filter(ev => ev.content_types.includes('shuttles'));
				setFactionEvents([...factionEvents]);
				const activeEvent = factionEvents.find(ev => ev.seconds_to_start === 0);
				setHelperMode(activeEvent ? activeEvent.symbol : 'dailies');
			});
		}
	}

	function renderStandardOnly(): React.JSX.Element {
		let label: string = '';
		if (activeShuttles.length > 0)
			label = 'All shuttle missions that are open in-game have been imported, but missions and recommendations will NOT be saved by the shuttle helper.';
		else
			label = 'Shuttle missions and recommendations will NOT be saved by the shuttle helper.';
		return (
			<Message icon>
				<img src={`${process.env.GATSBY_ASSETS_URL}/atlas/shuttle_icon.png`} style={{ width: '3em', marginRight: '1em' }} />
				<Message.Content>
					{label}
				</Message.Content>
			</Message>
		);
	}

	function renderStandardOption(): React.JSX.Element {
		let label: string = '';
		if (activeShuttles.length > 0)
			label = t('shuttle_helper.mode.standard.active');
		else
			label = t('shuttle_helper.mode.standard.inactive');
		return (
			<Form.Field>
				<Radio
					label={label}
					name='planning'
					value='dailies'
					checked={helperMode === 'dailies'}
					onChange={() => setHelperMode('dailies')}
				/>
			</Form.Field>
		);
	}

	function renderEventOption(eventData: IEventData): React.JSX.Element {
		let label: string = '';
		if (eventData.seconds_to_start === 0) {
			if (props.rosterType === 'allCrew')
				label = t('shuttle_helper.mode.active_event.all', { name: eventData.name });
			else if (activeShuttles.length > 0)
				label = t('shuttle_helper.mode.active_event.active', { name: eventData.name });
			else
				label = t('shuttle_helper.mode.active_event.inactive', { name: eventData.name });
		}
		else {
			if (activeShuttles.length > 0)
				label = t('shuttle_helper.mode.inactive_event.active', { name: eventData.name });
			else
				label = t('shuttle_helper.mode.inactive_event.inactive', { name: eventData.name });
		}
		return (
			<Form.Field key={eventData.symbol}>
				<Radio
					label={label}
					name='planning'
					value={eventData.symbol}
					checked={helperMode === eventData.symbol}
					onChange={() => setHelperMode(eventData.symbol)}
				/>
			</Form.Field>
		)
	}
};
