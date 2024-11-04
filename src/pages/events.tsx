import React from 'react';
import { Container, Header, Message, Segment, Label, Grid, Modal } from 'semantic-ui-react';

import LazyImage from '../components/lazyimage';
import EventInfoModal from '../components/event_info_modal';
import { EventLeaderboard } from '../model/events';
import DataPageLayout from '../components/page/datapagelayout';
import { GlobalContext } from '../context/globalcontext';

type EventInstance = {
	event_details?: boolean,
	event_id: number,
	event_name: string,
	fixed_instance_id: number,
	image: string,
	instance_id: number,
}


const EventsPage = () => {

	return (
		<DataPageLayout
			demands={[
				'crew',
				'cadet',
				'all_buffs',
				'items',
				'ship_schematics',
				'event_instances',
				'event_leaderboards'
			]}
		>
			<EventsPageComponent />
		</DataPageLayout>
	);

}

const EventsPageComponent = () => {
	const globalContext = React.useContext(GlobalContext);

	const { event_leaderboards, event_instances } = globalContext.core;
	const [eventsData, setEventsData] = React.useState<EventInstance[]>([]);
	const [leaderboardData, setLeaderboardData] = React.useState<{ [key: string]: EventLeaderboard } | null>(null);
	const [loadingError, setLoadingError] = React.useState<any>(null);
	const [modalEventInstance, setModalEventInstance] = React.useState<EventInstance | null>(null);

	React.useEffect(() => {
		function loadData() {
			try {
				const eventDataList = event_instances;
				setEventsData(eventDataList.reverse());
				const leaderboardDataList = event_leaderboards;
				const keyedLeaderboard = {} as { [key: string]: EventLeaderboard };
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
								leaderboard={leaderboardData ? leaderboardData[modalEventInstance.instance_id].leaderboard : []}
							/>
						</Modal.Content>
					</Modal>
				)}
			</Container>

	);
}

export default EventsPage;
