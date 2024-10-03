import React from 'react';
import { Form, Dropdown, Image, Header } from 'semantic-ui-react';

import { LockedProspect } from '../../model/game-elements';
import { ComputedSkill } from '../../model/crew';
import { CompletionState } from '../../model/player';

import { GlobalContext } from '../../context/globalcontext';

import ProspectPicker from '../../components/prospectpicker';
import { EventCrewTable } from '../../components/eventplanner/eventcrewtable';
import { ShuttleHelper, EventShuttleHelper } from '../../components/shuttlehelper/shuttlehelper';

import CONFIG from '../../components/CONFIG';
import { useStateWithStorage } from '../../utils/storage';
import { applySkillBuff } from '../../utils/crewutils';

import { IEventData, IRosterCrew } from './model';
import { GatherPlanner } from '../gather/gather_planner';
import ShipTable from '../ship/shiptable';

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
	const { t } = globalContext.localized;
	const { playerData, buffConfig } = globalContext.player;
	const { events, rosterType } = props;

	const [eventIndex, setEventIndex] = useStateWithStorage('eventplanner/eventIndex', 0);
	const [phaseIndex, setPhaseIndex] = useStateWithStorage('eventplanner/phaseIndex', 0);
	const [prospects, setProspects] = useStateWithStorage('eventplanner/prospects', [] as LockedProspect[]);

	const [bonusCrew, setBonusCrew] = React.useState([] as IRosterCrew[]);
	const [rosterCrew, setRosterCrew] = React.useState([] as IRosterCrew[]);
	const [lockable, setLockable] = React.useState([] as LockedProspect[]);

	React.useEffect(() => {
		const eventData = events[eventIndex];
		const bonusCrew = globalContext.core.crew.filter((c) => eventData.bonus.indexOf(c.symbol) >= 0);
		bonusCrew.sort((a, b)=>a.name.localeCompare(b.name));
		setBonusCrew([...bonusCrew.map(b => b as IRosterCrew)]);
	}, [events, eventIndex]);

	React.useEffect(() => {
		const rosterCrew = JSON.parse(JSON.stringify(props.rosterCrew)) as IRosterCrew[];
		const lockable = [] as LockedProspect[];

		if (rosterType === 'myCrew' && playerData && buffConfig) {
			prospects.forEach((p) => {
				const crew = globalContext.core.crew.find((c) => c.symbol === p.symbol);
				if (crew) {
					const prospect = JSON.parse(JSON.stringify(crew)) as IRosterCrew;
					prospect.id = rosterCrew.length+1;
					prospect.prospect = true;
					prospect.statusIcon = 'add user';
					prospect.have = false;
					prospect.rarity = p.rarity;
					prospect.level = 100;
					prospect.immortal = CompletionState.DisplayAsImmortalUnowned;
					CONFIG.SKILLS_SHORT.forEach(skill => {
						let score: ComputedSkill = { core: 0, min: 0, max: 0 };
						if (prospect.base_skills[skill.name]) {
							if (prospect.rarity === prospect.max_rarity)
								score = applySkillBuff(buffConfig, skill.name, prospect.base_skills[skill.name]);
							else
								score = applySkillBuff(buffConfig, skill.name, prospect.skill_data[prospect.rarity-1].base_skills[skill.name]);
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

	const eventsList = [] as ISelectOptions[];
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
		'skirmish': t('event_type.skirmish'),
		'voyage': t('event_type.voyage')
	};

	const phaseList = [] as ISelectOptions[];
	const eventData = (eventIndex >= events.length) ? events[0] : events[eventIndex];
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
					onChange={(e, { value }) => setEventIndex(value as number) }
				/>
			</Form>
			<Image size='large' src={`${process.env.GATSBY_ASSETS_URL}${eventData.image}`} />
			<div>{eventData.description}</div>
			{phaseList.length > 1 && (
				<div style={{ margin: '1em 0' }}>
					{t('event_planner.select_phase')}: <Dropdown selection options={phaseList} value={phaseIndex} onChange={(e, { value }) => setPhaseIndex(value as number) } />
				</div>
			)}
			<EventCrewTable rosterType={rosterType} rosterCrew={rosterCrew} eventData={eventData} phaseIndex={phaseIndex} lockable={lockable} />

			{playerData && (
				<React.Fragment>
					{rosterType === 'myCrew' && <EventProspects pool={bonusCrew} prospects={prospects} setProspects={setProspects} />}
					{eventData.content_types[phaseIndex] === 'shuttles' && (<EventShuttles crew={rosterCrew} eventData={eventData} />)}
					{eventData.content_types[phaseIndex] === 'gather' && eventData.seconds_to_start === 0 && eventData.seconds_to_end > 0 &&  <GatherPlanner eventSymbol={eventData.symbol} />}
				</React.Fragment>
			)}

			{playerData && eventData.content_types[phaseIndex] === 'voyage' && !!eventData.bonus_ship?.length &&
				<div style={{marginTop: "0.5em"}}>
					<div style={{margin: "0.5em 0"}}>
						<h4>{t('base.event_ships')}</h4>
					</div>
					<ShipTable event_ships={eventData.bonus_ship}
						high_bonus={eventData.featured_ship}
						event_ship_traits={eventData.bonus_ship_traits}
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
