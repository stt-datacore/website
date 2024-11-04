import React from 'react';
import { Container, Header, Message, Segment, Label, Grid, Modal, Icon, Step } from 'semantic-ui-react';

import LazyImage from '../components/lazyimage';
import EventInfoModal from '../components/event_info_modal';
import { EventLeaderboard } from '../model/events';
import DataPageLayout from '../components/page/datapagelayout';
import { GlobalContext } from '../context/globalcontext';
import { DEFAULT_MOBILE_WIDTH } from '../components/hovering/hoverstat';
import { EventStats } from '../utils/event_stats';
import { GauntletPane } from '../utils/gauntlet';

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
	const { t } = globalContext.localized;
	const { event_leaderboards, event_instances } = globalContext.core;
	const [eventsData, setEventsData] = React.useState<EventInstance[]>([]);
	const [leaderboardData, setLeaderboardData] = React.useState<{ [key: string]: EventLeaderboard } | null>(null);
	const [loadingError, setLoadingError] = React.useState<any>(null);
	const [modalEventInstance, setModalEventInstance] = React.useState<EventInstance | null>(null);

	const [tab, setTab] = React.useState(0);

	React.useEffect(() => {
		function loadData() {
			try {
				const eventDataList = [...event_instances];
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
				<Header as='h2'>{t('event_info.title')}</Header>

				{loadingError && (
					<Message negative>
						<Message.Header>{t('event_info.error_load')}</Message.Header>
						<pre>{loadingError.toString()}</pre>
					</Message>
				)}

				{/* <Step.Group fluid>
					<Step key={`event_info_tab`} active={tab === 0} onClick={() => setTab(0)}>
						<Step.Content>
							<Step.Title>{t('event_info.tabs.info.title')}</Step.Title>
							<Step.Description>{t('event_info.tabs.info.description')}</Step.Description>
						</Step.Content>
					</Step>
					<Step key={`event_stats_tab`} active={tab === 1} onClick={() => setTab(1)}>
						<Step.Content>
							<Step.Title>{t('event_info.tabs.stats.title')}</Step.Title>
							<Step.Description>{t('event_info.tabs.stats.description')}</Step.Description>
						</Step.Content>
					</Step>
            	</Step.Group> */}

				{tab === 0 &&
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
				</Grid>}
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

const EventStatsComponent = () => {
	const globalContext = React.useContext(GlobalContext);
	const { event_stats } = globalContext.core;

	const [totalPages, setTotalPages] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);
    const [activePage, setActivePage] = React.useState(1);

	const [workStats, setWorkStats] = React.useState<EventStats[]>([]);
	const [activePageResults, setActivePageResults] = React.useState<EventStats[]>([]);

	const pageStartIdx = (activePage - 1) * itemsPerPage;
	const isMobile = typeof window !== 'undefined' && window.innerWidth < DEFAULT_MOBILE_WIDTH;

	React.useEffect(() => {
        if (!workStats?.length) return;
        const pages = Math.ceil(workStats.length / itemsPerPage);
        if (totalPages !== pages) {
            setTotalPages(pages);
            if (activePage > pages) {
                setActivePage(pages);
                return;
            }
            else if (activePage < 1 && pages) {
                setActivePage(1);
                return;
            }
        }
        setActivePageResults(workStats.slice(pageStartIdx, pageStartIdx + itemsPerPage));
    }, [workStats, itemsPerPage, activePage, totalPages]);

	return <></>
}

export default EventsPage;
