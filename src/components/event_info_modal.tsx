import React from 'react';
import {Container, Header, Image, Tab } from 'semantic-ui-react';

import EventInformationTab from './event_info_tabs/event_information';
import ThresholdRewardsTab from './event_info_tabs/threshold_rewards';
import RankedRewardsTab from './event_info_tabs/ranked_rewards';
import LeaderboardTab from './event_info_tabs/leaderboard';

type EventInfoModalProps = {
	instanceId: number,
	image: string,
	hasDetails: boolean,
	leaderboard: Array<object>,
}

function EventInfoModal({instanceId, image, hasDetails, leaderboard}: EventInfoModalProps) {
	const [eventData, setEventData] = React.useState(null);

	React.useEffect(() => {
		async function fetchEventData() {
			if (hasDetails) {
				const fetchResp = await fetch(`/structured/events/${instanceId}.json`);
				const data = await fetchResp.json();
				setEventData(data);
			}
		}

		fetchEventData();
	}, []);

	const eventInfoPanes = [
		{
			menuItem: 'Event Information',
			render: () => (
				<Tab.Pane attached={false}>
					<EventInformationTab eventData={eventData} />
				</Tab.Pane>
			),
		},
		{
			menuItem: 'Threshold Rewards',
			render: () => (
				<Tab.Pane attached={false}>
					<ThresholdRewardsTab eventData={eventData} />
				</Tab.Pane>
			),
		},
		{
			menuItem: 'Ranked Rewards',
			render: () => (
				<Tab.Pane attached={false}>
					<RankedRewardsTab eventData={eventData} />
				</Tab.Pane>
			),
		},
	];

	const leaderboardPane = [
		{
			menuItem: 'Leaderboard',
			render: () => (
				<Tab.Pane attached={false}>
					<LeaderboardTab leaderboard={leaderboard} />
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
		</Container>
	);
}

export default EventInfoModal;
