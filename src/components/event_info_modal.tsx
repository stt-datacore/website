import React from 'react';
import { Container, Image, Tab } from 'semantic-ui-react';

import EventInformationTab from './event_info_tabs/event_information';
import ThresholdRewardsTab from './event_info_tabs/threshold_rewards';
import RankedRewardsTab from './event_info_tabs/ranked_rewards';
import LeaderboardTab from './event_info_tabs/leaderboard';
import { GameEvent } from '../model/player';
import { CrewHoverStat } from './hovering/crewhoverstat';
import { ItemHoverStat } from './hovering/itemhoverstat';
import { ShipHoverStat } from './hovering/shiphoverstat';
import { GlobalContext } from '../context/globalcontext';
import { Leaderboard } from '../model/events';

type EventInfoModalProps = {
	instanceId: number,
	image: string,
	hasDetails?: boolean,
	leaderboard: Leaderboard[],
}

function EventInfoModal(props: EventInfoModalProps) {
	const globalContext = React.useContext(GlobalContext);
	const { event_instances } = globalContext.core;

	const { t } = globalContext.localized;
	const {instanceId, image, hasDetails, leaderboard} = props;
	const [eventData, setEventData] = React.useState<GameEvent | null>(null);
	const [lastEvent, setLastEvent] = React.useState<GameEvent | null>(null);

	React.useEffect(() => {
		async function fetchEventData() {
			if (hasDetails) {
				const fetchResp = await fetch(`/structured/events/${instanceId}.json`);
				const data = await fetchResp.json() as GameEvent;
				if (data.content_types.includes('skirmish')) {
					event_instances.sort((a, b) => a.instance_id - b.instance_id);
					let idx = event_instances.findIndex(fi => fi.instance_id === instanceId);
					if (idx > 0) {
						idx--;
						let lastId = event_instances[idx].instance_id;
						const lastResp = await fetch(`/structured/events/${lastId}.json`);
						const lastEvent = await lastResp.json() as GameEvent;
						setLastEvent(lastEvent);
					}
				}
				setEventData(data);
			}
		}
		fetchEventData();
	}, []);

	const eventInfoPanes = [
		{
			menuItem: t('event_info.tabs.info.title'),
			render: () => (
				<Tab.Pane attached={false}>
					{eventData ? <EventInformationTab lastEvent={lastEvent || undefined} eventData={eventData} /> : <div></div>}
				</Tab.Pane>
			),
		},
		{
			menuItem: t('event_info.threshold_rewards'),
			render: () => (
				<Tab.Pane attached={false}>
					{eventData ? <ThresholdRewardsTab eventData={eventData} /> : <div></div>}
				</Tab.Pane>
			),
		},
		{
			menuItem: t('event_info.ranked_rewards'),
			render: () => (
				<Tab.Pane attached={false}>
					{eventData ? <RankedRewardsTab eventData={eventData} /> : <div></div>}
				</Tab.Pane>
			),
		},
	];

	const leaderboardPane = [
		{
			menuItem: t('event_info.leaderboard'),
			render: () => (
				<Tab.Pane attached={false}>
					<LeaderboardTab leaderboard={leaderboard} instanceId={eventData?.instance_id} />
				</Tab.Pane>
			),
		},
	];

	let panes;
	if (hasDetails && eventData) {
		panes = eventInfoPanes.concat(leaderboardPane);
	} else {
		panes = leaderboardPane;
	}

	return (
		<Container style={{ padding: '1em' }}>
			<Image
				src={`${process.env.GATSBY_ASSETS_URL}${image}`}
				fluid
			/>
			<Tab
				style={{marginTop: '1em'}}
				menu={{secondary: true, pointing: true}}
				panes={panes}
				renderActiveOnly
			/>
			<CrewHoverStat targetGroup='event_info' modalPositioning={true}  />
			<ItemHoverStat targetGroup='event_info_items' modalPositioning={true} />
			<ShipHoverStat targetGroup='event_info_ships' modalPositioning={true} />
		</Container>
	);
}

export default EventInfoModal;
