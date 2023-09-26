import React from 'react';
import { Form, Dropdown, Image, Header } from 'semantic-ui-react';

import { LockedProspect } from '../../model/game-elements';
import { ComputedBuff } from '../../model/crew';
import { CompletionState } from '../../model/player';

import { GlobalContext } from '../../context/globalcontext';

import ProspectPicker from '../../components/prospectpicker';
import { EventCrewTable } from '../../components/eventplanner/eventcrewtable';
import ShuttleHelper from '../../components/shuttlehelper/shuttlehelper';

import CONFIG from '../../components/CONFIG';
import { useStateWithStorage } from '../../utils/storage';
import { applySkillBuff } from '../../utils/crewutils';

import { IEventData, IRosterCrew } from './model';

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
		setBonusCrew([...bonusCrew]);
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
						let score: ComputedBuff = { core: 0, min: 0, max: 0 };
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
		'shuttles': 'Faction',
		'gather': 'Galaxy',
		'skirmish': 'Skirmish'
	};

	const phaseList = [] as ISelectOptions[];
	const eventData = events[eventIndex];
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
					Select a phase: <Dropdown selection options={phaseList} value={phaseIndex} onChange={(e, { value }) => setPhaseIndex(value as number) } />
				</div>
			)}
			<EventCrewTable rosterType={rosterType} rosterCrew={rosterCrew} eventData={eventData} phaseIndex={phaseIndex} lockable={lockable} />
			{playerData && (
				<React.Fragment>
					{rosterType === 'myCrew' && <EventProspects pool={bonusCrew} prospects={prospects} setProspects={setProspects} />}
					{eventData.content_types[phaseIndex] === 'shuttles' && (<EventShuttles crew={rosterCrew} eventData={eventData} />)}
				</React.Fragment>
			)}
		</React.Fragment>
	);
};

type EventProspectsProps = {
	pool: IRosterCrew[];
	prospects: LockedProspect[];
	setProspects: (prospects: LockedProspect[]) => void;
};

const EventProspects = (props: EventProspectsProps) => {
	const { pool, prospects, setProspects } = props;
	if (pool.length === 0) return (<></>);

	return (
		<React.Fragment>
			<Header as='h4'>Prospective Crew</Header>
			<p>Add prospective crew (or potential shared crew) to see how they fit into your existing roster for this event.</p>
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
	const { playerData, ephemeral } = globalContext.player;
	const { eventData } = props;

	const ShuttleProjection = () => {
		if (!playerData) return (<></>);

		const SHUTTLE_DIFFICULTY = 4000;
		const SHUTTLE_DURATION = 3*60*60;
		const SHUTTLE_RATE = .9;

		if (eventData.seconds_to_start !== 0) return (<></>);

		let currentVP = 0, secondsToEndShuttles = eventData.seconds_to_end, endType = 'event';
		// EventPlanner eventData doesn't hold VP or phases, so get those values from ephemeral events
		if (ephemeral) {
			const activeEvent = ephemeral.events.find(event => event.symbol === eventData.symbol);
			if (!activeEvent) return (<></>);
			currentVP = activeEvent.victory_points ?? 0;
			if (activeEvent.content_types.length > 1) {
				activeEvent.phases.forEach((phase, phaseIdx) => {
					if (activeEvent.content_types[phaseIdx] === 'shuttles')
						secondsToEndShuttles = phase.seconds_to_end;
						endType = 'faction phase';
				});
			}
		}

		let estimatedVP = currentVP;
		if (secondsToEndShuttles > 0) {
			const runsLeft = Math.floor(secondsToEndShuttles/SHUTTLE_DURATION)*playerData.player.character.shuttle_bays;
			const runsSuccessful = Math.floor(runsLeft*SHUTTLE_RATE);
			const runsFailed = runsLeft - runsSuccessful;
			estimatedVP += (runsSuccessful*SHUTTLE_DIFFICULTY)+(runsFailed*SHUTTLE_DIFFICULTY/5);
			return (
				<span> If you run {playerData.player.character.shuttle_bays} shuttles every 3 hours with a 90% success rate, you will have <b>{estimatedVP} VP</b> by the end of the {endType}.</span>
			);
		}

		return (<></>);
	};

	if (!playerData) return (<></>);

	return (
		<React.Fragment>
			<Header as='h4'>Shuttle Helper</Header>
			<p>
				Use this tool to help plan your shuttles.
				<ShuttleProjection />
			</p>
			<ShuttleHelper helperId='eventplanner' groupId={eventData.symbol} dbid={`${playerData.player.dbid}`} crew={props.crew} eventData={eventData} />
		</React.Fragment>
	);
};
