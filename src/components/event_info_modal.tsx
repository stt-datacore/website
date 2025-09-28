import React from 'react';
import { Button, Container, Image, Popup, Tab } from 'semantic-ui-react';

import EventInformationTab from './event_info_tabs/event_information';
import ThresholdRewardsTab from './event_info_tabs/threshold_rewards';
import RankedRewardsTab from './event_info_tabs/ranked_rewards';
import LeaderboardTab from './event_info_tabs/leaderboard';
import { GameEvent } from '../model/player';
import { CrewHoverStat } from './hovering/crewhoverstat';
import { ItemHoverStat } from './hovering/itemhoverstat';
import { ShipHoverStat } from './hovering/shiphoverstat';
import { GlobalContext } from '../context/globalcontext';
import { EventInstance, Leaderboard } from '../model/events';
import { OptionsPanelFlexRow } from './stats/utils';

type EventInfoModalProps = {
	instanceId: number,
	image: string,
	hasDetails?: boolean,
	leaderboard: Leaderboard[],
}

export function EventInfoModal(props: EventInfoModalProps) {
	const globalContext = React.useContext(GlobalContext);
	const { event_instances } = globalContext.core;

	const { t } = globalContext.localized;
	const { instanceId, image, hasDetails, leaderboard} = props;
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
	}, [instanceId]);

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

interface EventModalHeaderProps {
	instance: EventInstance;
	setInstance: (value: EventInstance) => void;
	flip?: boolean;
}

export const EventModalHeader = (props: EventModalHeaderProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { event_instances } = globalContext.core;
	const [prevEvent, setPrevEvent] = React.useState<EventInstance | undefined>();
	const [nextEvent, setNextEvent] = React.useState<EventInstance | undefined>();
	const { flip, instance: modalEventInstance, setInstance: setModalEventInstance } = props;

	React.useEffect(() => {
		let idx = event_instances.findIndex(e => e === modalEventInstance);
		if (idx <= 0) {
			setPrevEvent(undefined);
		}
		else {
			setPrevEvent(event_instances[idx - 1]);
		}
		if (idx === -1 || idx >= event_instances.length - 1) {
			setNextEvent(undefined);
		}
		else {
			setNextEvent(event_instances[idx + 1]);
		}
	}, [modalEventInstance]);

	return (
		<div style={{...OptionsPanelFlexRow, justifyContent: 'space-between'}}>
			<div>
				{modalEventInstance.event_name}
			</div>
			{!flip && <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
				<Popup
					hoverable
					trigger={<Button disabled={!prevEvent} onClick={clickPrev} icon='arrow left' />}
					content={<div>{prevEvent?.event_name}</div>}
				/>
				<Popup
					hoverable
					trigger={<Button disabled={!nextEvent} onClick={clickNext} icon='arrow right' />}
					content={<div>{nextEvent?.event_name}</div>}
				/>
			</div>}
			{!!flip && <div style={{...OptionsPanelFlexRow, gap: '0.5em'}}>
				<Popup
					hoverable
					trigger={<Button disabled={!nextEvent} onClick={clickNext} icon='arrow left' />}
					content={<div>{nextEvent?.event_name}</div>}
				/>
				<Popup
					hoverable
					trigger={<Button disabled={!prevEvent} onClick={clickPrev} icon='arrow right' />}
					content={<div>{prevEvent?.event_name}</div>}
				/>
			</div>}
		</div>
	)

	function clickNext() {
		let curr = event_instances.findIndex(e => e === modalEventInstance);
		if (curr === -1) return;
		if (curr < event_instances.length - 1) {
			curr++;
			setModalEventInstance(event_instances[curr]);
		}
	}

	function clickPrev() {
		let curr = event_instances.findIndex(e => e === modalEventInstance);
		if (curr === -1) return;
		if (curr > 0) {
			curr--;
			setModalEventInstance(event_instances[curr]);
		}
	}


}
