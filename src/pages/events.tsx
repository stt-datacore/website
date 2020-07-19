import React from 'react';
import { Container, Header, Message, Segment, Label, Grid, Modal } from 'semantic-ui-react';

import Layout from '../components/layout';
import LazyImage from '../components/lazyimage';
import EventInfoModal from '../components/event_info_modal';

type EventInstance = {
	event_details?: boolean,
	event_id: number,
	event_name: string,
	fixed_instance_id: number,
	image: string,
	instance_id: number,
}

function EventsPage() {
	const [eventsData, setEventsData] = React.useState<EventInstance[]>([]);
	const [leaderboardData, setLeaderboardData] = React.useState(null);
	const [loadingError, setLoadingError] = React.useState(null);
	const [modalEventInstance, setModalEventInstance] = React.useState(null);

	// load the events and leaderboard data once on component mount
	React.useEffect(() => {
		async function loadData() {
			try {
				const fetchEventResp = await fetch('/structured/event_instances.json')
				const eventDataList = await fetchEventResp.json();
				setEventsData(eventDataList.reverse());

				const fetchLeaderboardResp = await fetch('/structured/event_leaderboards.json');
				const leaderboardDataList = await fetchLeaderboardResp.json();
				const keyedLeaderboard = {};
				leaderboardDataList.forEach(entry => keyedLeaderboard[entry.instance_id] = entry);
				setLeaderboardData(keyedLeaderboard);
			}
			catch (e) {
				setLoadingError(e);
			}
		}

		loadData();
	}, []);

	return (
		<Layout>
			<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
				<Header as='h2'>Events</Header>
				{loadingError && (
					<Message negative>
						<Message.Header>Unable to load event information</Message.Header>
						<pre>{loadingError.toString()}</pre>
					</Message>
				)}
				<Grid stackable columns={3}>
					{eventsData.map(eventInfo => (
						<Grid.Column key={eventInfo.instance_id}>
							<div
								style={{ cursor: 'pointer' }}
								onClick={() => setModalEventInstance(eventInfo)}
							>
								<Segment padded>
									<Label attached="bottom">
										{eventInfo.event_name}
									</Label>
									<LazyImage
										src={`${process.env.GATSBY_ASSETS_URL}${eventInfo.image}`}
										size="large"
										onError={e => e.target.style.visibility = 'hidden'}
									/>
								</Segment>
							</div>
						</Grid.Column>
					))}
				</Grid>
				{modalEventInstance !== null && (
					<Modal
						open
						size="large"
						onClose={() => setModalEventInstance(null)}
						closeIcon
					>
						<Modal.Header>{modalEventInstance.event_name}</Modal.Header>
						<Modal.Content scrolling>
							<EventInfoModal
								instanceId={modalEventInstance.instance_id}
								image={modalEventInstance.image}
								hasDetails={modalEventInstance.event_details}
								leaderboard={leaderboardData[modalEventInstance.instance_id].leaderboard}
							/>
						</Modal.Content>
					</Modal>
				)}
			</Container>
		</Layout>
	);
}

export default EventsPage;
