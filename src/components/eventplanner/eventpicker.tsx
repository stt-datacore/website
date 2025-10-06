import React from 'react';
import { Dropdown, Form, Header, Image } from 'semantic-ui-react';

import { ComputedSkill, CrewMember } from '../../model/crew';
import { LockedProspect } from '../../model/game-elements';
import { CompletionState } from '../../model/player';

import { GlobalContext } from '../../context/globalcontext';

import { EventCrewTable } from '../../components/eventplanner/eventcrewtable';
import ProspectPicker from '../../components/prospectpicker';
import { EventShuttleHelper, ShuttleHelper } from '../../components/shuttlehelper/shuttlehelper';

import CONFIG from '../../components/CONFIG';
import { applyCrewBuffs, applySkillBuff, crewCopy, oneCrewCopy } from '../../utils/crewutils';
import { useStateWithStorage } from '../../utils/storage';

import { GatherPlanner } from '../gather/gather_planner';
import { ShipHoverStat } from '../hovering/shiphoverstat';
import { AvatarView } from '../item_presenters/avatarview';
import { QPContext } from '../qpconfig/provider';
import { ShipTable } from '../ship/shiptable';
import { SpecialistMissionTable } from '../specialist/specialistmissions';
import { IEventData, IRosterCrew } from './model';
import { CrewHoverStat } from '../hovering/crewhoverstat';
import { CrewPresenter } from '../item_presenters/crew_presenter';

interface ISelectOptions {
	key: string;
	value: number;
	text: string;
};

type EventPickerProps = {
	events: IEventData[];
	rosterType: string;
	rosterCrew: IRosterCrew[];
};

export const EventPicker = (props: EventPickerProps) => {
	const globalContext = React.useContext(GlobalContext);
	const qpContext = React.useContext(QPContext);
	const { t } = globalContext.localized;
	const { playerData, buffConfig, ephemeral } = globalContext.player;
	const { events, rosterType } = props;
	const [init, setInit] = React.useState(false);
	const [eventIndex, setEventIndex] = useStateWithStorage<number>('eventplanner/eventIndex', 0);
	const [phaseIndex, setPhaseIndex] = useStateWithStorage<number>('eventplanner/phaseIndex', 0);
	const [prospects, setProspects] = useStateWithStorage<LockedProspect[]>('eventplanner/prospects', []);

	const [bonusCrew, setBonusCrew] = React.useState<IRosterCrew[]>([]);
	const [rosterCrew, setRosterCrew] = React.useState<IRosterCrew[]>([]);
	const [lockable, setLockable] = React.useState<LockedProspect[]>([]);

	React.useEffect(() => {
		const eventData: IEventData = events[eventIndex];
		const bonusCrew: CrewMember[] = globalContext.core.crew.filter(c => eventData.bonus.includes(c.symbol));
		bonusCrew.sort((a, b) => a.name.localeCompare(b.name));
		setBonusCrew([...bonusCrew.map(b => b as IRosterCrew)]);
		if (!init && ephemeral && eventData) {
			const currEvent = ephemeral.events?.find(e => e.seconds_to_start === 0 && e.seconds_to_end > 0);
			if (currEvent && currEvent.symbol === eventData.symbol && currEvent.opened_phase) {
				setPhaseIndex(currEvent.opened_phase);
			}
			setInit(true);
		}
	}, [events, eventIndex]);

	React.useEffect(() => {
		const rosterCrew: IRosterCrew[] = structuredClone(props.rosterCrew) as IRosterCrew[];
		const lockable: LockedProspect[] = [];

		if (rosterType === 'myCrew' && playerData && buffConfig) {
			prospects.forEach((p) => {
				const crew = globalContext.core.crew.find((c) => c.symbol === p.symbol);
				if (crew) {
					const prospect: IRosterCrew = structuredClone(crew) as IRosterCrew;
					prospect.id = rosterCrew.length + 1;
					prospect.prospect = true;
					prospect.statusIcon = 'add user';
					prospect.have = false;
					prospect.rarity = p.rarity;
					prospect.level = 100;
					prospect.immortal = CompletionState.DisplayAsImmortalUnowned;
					CONFIG.SKILLS_SHORT.forEach(skill => {
						let score: ComputedSkill = { core: 0, min: 0, max: 0, skill: skill.name };
						if (prospect.base_skills[skill.name]) {
							if (prospect.rarity === prospect.max_rarity)
								score = applySkillBuff(buffConfig, skill.name, prospect.base_skills[skill.name]);
							else
								score = applySkillBuff(buffConfig, skill.name, prospect.skill_data[prospect.rarity - 1].base_skills[skill.name]);
						}
						prospect[skill.name] = score;
					});
					rosterCrew.push(prospect);
					lockable.push({
						symbol: prospect.symbol,
						name: prospect.name,
						rarity: prospect.rarity,
						level: prospect.level,
						prospect: prospect.prospect
					});
				}
			});
		}

		setRosterCrew([...rosterCrew]);
		setLockable([...lockable]);
	}, [props.rosterCrew, prospects]);

	const eventsList: ISelectOptions[] = [];
	events.forEach((activeEvent, eventId) => {
		eventsList.push(
			{
				key: activeEvent.symbol,
				value: eventId,
				text: activeEvent.name
			}
		);
	});

	const EVENT_TYPES = {
		'shuttles': t('event_type.shuttles'),
		'gather': t('event_type.gather'),
		'galaxy': t('event_type.galaxy'),
		'skirmish': t('event_type.skirmish'),
		'voyage': t('event_type.voyage')
	};

	const phaseList: ISelectOptions[] = [];
	const eventData: IEventData = (eventIndex >= events.length) ? events[0] : events[eventIndex];
	const megacrew = (() => {
		let ccrew = globalContext.core.crew.find(f => f.symbol === eventData.mega_crew);
		if (ccrew) {
			ccrew = oneCrewCopy(ccrew);
			if (playerData) {
				applyCrewBuffs(ccrew, globalContext.player.buffConfig!);
			}
			else {
				applyCrewBuffs(ccrew, globalContext.maxBuffs!);
			}
		}
		return ccrew;
	})();

	if (eventIndex >= events.length) {
		setEventIndex(0);
	}
	eventData.content_types.forEach((contentType, phaseId) => {
		if (!phaseList.find((phase) => phase.key === contentType)) {
			phaseList.push(
				{
					key: contentType,
					value: phaseId,
					text: EVENT_TYPES[contentType]
				}
			);
		}
	});

	return (
		<React.Fragment>
			<Form>
				<Form.Field
					control={Dropdown}
					selection
					options={eventsList}
					value={eventIndex}
					onChange={(e, { value }) => setEventIndex(value as number)}
				/>
			</Form>
			<Image size='large' src={`${process.env.GATSBY_ASSETS_URL}${eventData.image}`} />
			<div>{eventData.description}</div>
			{phaseList.length > 1 && (
				<div style={{ margin: '1em 0' }}>
					{t('event_planner.select_phase')}: <Dropdown selection options={phaseList} value={phaseIndex} onChange={(e, { value }) => setPhaseIndex(value as number)} />
				</div>
			)}

			{!!megacrew && <EventMega event={eventData} mega={megacrew} />}
			{!!eventData.featured_ships.length && <EventFeaturedShips event={eventData} />}

			<EventCrewTable rosterType={rosterType} rosterCrew={rosterCrew} eventData={eventData} phaseIndex={phaseIndex} lockable={lockable} />

			{playerData && (
				<React.Fragment>
					{rosterType === 'myCrew' && <EventProspects pool={bonusCrew} prospects={prospects} setProspects={setProspects} />}
					{eventData.content_types[phaseIndex] === 'galaxy' && (<SpecialistMissionTable crew={rosterCrew} eventData={eventData} />)}
					{eventData.content_types[phaseIndex] === 'shuttles' && (<EventShuttles crew={rosterCrew} eventData={eventData} />)}
					{eventData.content_types[phaseIndex] === 'gather' && eventData.seconds_to_start === 0 && eventData.seconds_to_end > 0 && <GatherPlanner eventSymbol={eventData.symbol} />}
				</React.Fragment>
			)}

			{eventData.content_types[phaseIndex] === 'voyage' && eventData.activeContent?.content_type === 'voyage' &&
				<div style={{ marginTop: "0.5em" }}>
					<div style={{ margin: "0.5em 0" }}>
						<h4>{t('base.event_ships')}</h4>
					</div>
					<ShipTable
						mode='all'
						pageId='event_picker'
						event_ships={eventData.bonus_ships}
						high_bonus={eventData.featured_ships}
						event_ship_traits={eventData.activeContent?.antimatter_bonus_ship_traits}
					/>
				</div>
			}
		</React.Fragment>
	);
};

type EventProspectsProps = {
	pool: IRosterCrew[];
	prospects: LockedProspect[];
	setProspects: (prospects: LockedProspect[]) => void;
};

const EventProspects = (props: EventProspectsProps) => {
	const { t } = React.useContext(GlobalContext).localized;
	const { pool, prospects, setProspects } = props;
	if (pool.length === 0) return (<></>);

	return (
		<React.Fragment>
			<Header as='h4'>{t('crew_view.prospect.title')}</Header>
			<p>{t('event_planner.prospect_description')}</p>
			<ProspectPicker pool={pool} prospects={prospects} setProspects={setProspects} />
		</React.Fragment>
	);
};

type EventShuttlesProps = {
	crew: IRosterCrew[];
	eventData: IEventData;
};

const EventShuttles = (props: EventShuttlesProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerData } = globalContext.player;
	const { eventData } = props;

	if (!playerData) return <></>;

	// Only use EventShuttleHelper when 1) there's player data AND 2) there's an active event AND 3) using myCrew as roster
	const eventMode = eventData.seconds_to_start === 0;

	return (
		<React.Fragment>
			<Header as='h4'>{t('menu.tools.shuttle_helper')}</Header>
			<p>{t('shuttle_helper.heading')}</p>
			{!eventMode && (
				<ShuttleHelper
					rosterType={'myCrew'} rosterCrew={props.crew}
					eventData={eventData}
				/>
			)}
			{eventMode && (
				<EventShuttleHelper
					dbid={`${playerData.player.dbid}`}
					rosterType={'myCrew'} rosterCrew={props.crew}
					eventData={eventData}
				/>
			)}
		</React.Fragment>
	);
};

interface FeatureToolProps {
	event: IEventData;
}

const EventFeaturedShips = (props: FeatureToolProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { playerShips } = globalContext.player;
	const { all_ships } = globalContext.core;
	const { event } = props;

	return (<>
		<h4>{t('base.featured_ships')}</h4>
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			flexWrap: 'wrap',
			alignItems: 'flex-start',
			justifyContent: 'flex-start',
			gap: '1em'
		}}>
			<ShipHoverStat targetGroup='event_featured_ships' />
			{event.featured_ships.map((symbol) => {
				const ship = (playerShips ?? all_ships).find(f => f.symbol === symbol);
				if (!ship) return <></>;
				else {
					return (
						<div style={{
							display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
							gap: '0.5em'
						}}>
							<AvatarView
								crewBackground='rich'
								targetGroup='event_featured_ships'
								key={`event_featured_ship_avatar_${symbol}`}
								mode='ship'
								item={ship}
								size={72}
							/>
							<i>{ship.name}</i>
						</div>)
				}
			})}
		</div>
	</>)
}

const EventMega = (props: FeatureToolProps & { mega: CrewMember }) => {
	const globalContext = React.useContext(GlobalContext);
	const { t } = globalContext.localized;
	const { event, mega } = props;

	return (<>
		<h4>{t('obtained.long.Mega')}</h4>
		<div style={{
		display: 'flex',
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'center',
		justifyContent: 'flex-start'
	}}>
		<CrewHoverStat targetGroup='event_mega' />
		<div style={{
				display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
				gap: '0.5em'
			}}>

			<AvatarView
				mode='crew'
				item={mega}
				size={64}
				targetGroup='event_mega'
			/>
			<i>{mega.name}</i>
		</div>
	</div></>)
}