import React from 'react';
import { Container, Header, Message, Segment, Label, Grid, Modal } from 'semantic-ui-react';

import Layout from '../components/layout';
import LazyImage from '../components/lazyimage';
import EventInfoModal from '../components/event_info_modal';
import { EventLeaderboard } from '../model/events';
import { DataContext } from '../context/datacontext';
import { MergedContext } from '../context/mergedcontext';
import { PlayerContext } from '../context/playercontext';
import { PlayerData } from '../model/player';
import { prepareProfileData } from '../utils/crewutils';
import { BuffStatTable } from '../utils/voyageutils';
import { CrewHoverStat } from '../components/hovering/crewhoverstat';
import { ItemHoverStat } from '../components/hovering/itemhoverstat';

type EventInstance = {
	event_details?: boolean,
	event_id: number,
	event_name: string,
	fixed_instance_id: number,
	image: string,
	instance_id: number,
}

 
const EventsPage = () => {
	const coreData = React.useContext(DataContext);
	const isReady = coreData.ready ? coreData.ready(['all_buffs', 'crew', 'items']) : false;
	const playerContext = React.useContext(PlayerContext);
	const { strippedPlayerData, buffConfig } = playerContext;
	let playerData: PlayerData | undefined = undefined;

	if (isReady && strippedPlayerData && strippedPlayerData.stripped && strippedPlayerData?.player?.character?.crew?.length) {
		playerData = JSON.parse(JSON.stringify(strippedPlayerData));
		if (playerData) prepareProfileData("EVENTS", coreData.crew, playerData, new Date());
	}

	let maxBuffs: BuffStatTable | undefined;

	maxBuffs = playerContext.maxBuffs;
	if ((!maxBuffs || !(Object.keys(maxBuffs)?.length)) && isReady) {
		maxBuffs = coreData.all_buffs;
	}

	return (
		<Layout>
			{!isReady &&
				<div className='ui medium centered text active inline loader'>Loading data...</div>
			}
			{isReady &&
				<React.Fragment>
					<MergedContext.Provider value={{
						allCrew: coreData.crew,
						playerData: playerData ?? {} as PlayerData,
						buffConfig: buffConfig,
						items: coreData.items,
						maxBuffs: maxBuffs,
						gauntlets: coreData.gauntlets
					}}>
						<EventsPageComponent />
					</MergedContext.Provider>
				</React.Fragment>
			}

		</Layout>
	);

}

function EventsPageComponent() {
	const [eventsData, setEventsData] = React.useState<EventInstance[]>([]);
	const [leaderboardData, setLeaderboardData] = React.useState<{ [key: string]: EventLeaderboard } | null>(null);
	const [loadingError, setLoadingError] = React.useState<any>(null);
	const [modalEventInstance, setModalEventInstance] = React.useState<EventInstance | null>(null);

	// load the events and leaderboard data once on component mount
	React.useEffect(() => {
		async function loadData() {
			try {
				const fetchEventResp = await fetch('/structured/event_instances.json');
				const eventDataList = (await fetchEventResp.json()) as EventInstance[];
				setEventsData(eventDataList.reverse());

				const fetchLeaderboardResp = await fetch('/structured/event_leaderboards.json');
				const leaderboardDataList = await fetchLeaderboardResp.json() as EventLeaderboard[];
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
		<Layout>
			<></>
			<Container style={{ paddingTop: '4em', paddingBottom: '2em' }}>
				<Header as='h2'>Events</Header>
				<CrewHoverStat targetGroup='event_info' useBoundingClient={true}  />
				<ItemHoverStat targetGroup='event_info_items' useBoundingClient={true} />

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
		</Layout>
	);
}

export default EventsPage;
