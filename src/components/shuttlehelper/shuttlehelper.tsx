import React from 'react';
import { Icon } from 'semantic-ui-react';

import { ShuttleAdventure } from '../../model/shuttle';
import { IEventData, IRosterCrew } from '../../components/eventplanner/model';
import { GlobalContext } from '../../context/globalcontext';
import { useStateWithStorage } from '../../utils/storage';

import { Shuttlers, Shuttle, ShuttleSeat, ISeatAssignment } from './model';
import { ShuttlersContext, IShuttlersContext } from './context';
import { Calculator } from './calculator';
import { QPContext } from '../qpconfig/provider';
import { QuipmentProspectsOptions } from '../qpconfig/options';

// Use ShuttleHelper when 1) there's no player data, OR 2) there's no active event, OR 3) using allCrew as roster
//	Shuttles and assignments do NOT persist across sessions

type ShuttleHelperProps = {
	rosterType: 'myCrew' | 'allCrew';
	rosterCrew: IRosterCrew[];
	eventData?: IEventData;
};

export const ShuttleHelper = (props: ShuttleHelperProps) => {
	const globalContext = React.useContext(GlobalContext);
	const qpContext = React.useContext(QPContext);
	const [qpConfig, setQpConfig] = qpContext.useQPConfig();

	const { playerData, ephemeral } = globalContext.player;

	const [activeShuttles, setActiveShuttles] = React.useState<ShuttleAdventure[]>([]);

	const [shuttlers, setShuttlers] = React.useState<Shuttlers>(new Shuttlers());
	const [assigned, setAssigned] = React.useState<ISeatAssignment[]>([]);

	const groupId: string = '';

	React.useEffect(() => {
		if (playerData && ephemeral)
			setActiveShuttles(ephemeral.shuttleAdventures);
		else
			setActiveShuttles([]);
	}, [playerData]);

	React.useEffect(() => {
		initializeShuttlers();
	}, [activeShuttles, props.eventData]);

	const shuttlersContext: IShuttlersContext = {
		helperId: 'shuttle',
		groupId,
		rosterType: props.rosterType,
		rosterCrew: props.rosterCrew,
		eventData: props.eventData,
		activeShuttles,
		shuttlers, setShuttlers,
		assigned, setAssigned
	};

	return (
		<ShuttlersContext.Provider value={shuttlersContext}>
			<React.Fragment>
				<p>
					<QuipmentProspectsOptions config={qpConfig} setConfig={setQpConfig} />
				</p>
				<Calculator />
			</React.Fragment>
		</ShuttlersContext.Provider>
	);

	function initializeShuttlers(): void {
		const shuttlers = new Shuttlers();
		// Import ALL missions from player data, unless pre-event specified (then import nothing)
		if (!props.eventData || props.eventData.seconds_to_start === 0) {
			activeShuttles.forEach(adventure => {
				const shuttle = convertAdventureToShuttle(adventure, groupId);
				shuttlers.shuttles.push(shuttle);
			});
		}
		setShuttlers({...shuttlers});
	}
};

// Use EventShuttleHelper when 1) there's player data AND 2) there's an active event AND 3) using myCrew as roster
//	Shuttles and assignments persist across sessions

type EventShuttleHelperProps = {
	dbid: string;
	rosterType: 'myCrew';
	rosterCrew: IRosterCrew[];
	eventData: IEventData;
};

export const EventShuttleHelper = (props: EventShuttleHelperProps) => {
	const globalContext = React.useContext(GlobalContext);
	const { playerData, ephemeral } = globalContext.player;

	const [activeShuttles, setActiveShuttles] = React.useState<ShuttleAdventure[]>([]);

	const [shuttlers, setShuttlers] = useStateWithStorage<Shuttlers>(props.dbid+'/shuttlers/setups', new Shuttlers(), { rememberForever: true, onInitialize: variableReady });
	const [assigned, setAssigned] = useStateWithStorage<ISeatAssignment[]>(props.dbid+'/shuttlers/assigned', [], { rememberForever: true, onInitialize: variableReady });
	const [loadState, setLoadState] = React.useState<number>(0);

	const groupId: string = props.eventData.symbol;

	React.useEffect(() => {
		if (playerData && ephemeral)
			setActiveShuttles(ephemeral.shuttleAdventures);
		else
			setActiveShuttles([]);
	}, [playerData]);

	React.useEffect(() => {
		if (loadState === 2) initializeShuttlers();
	}, [loadState, activeShuttles, props.eventData]);

	// Prune assignments from other events, dismissed shuttles
	//	recommendShuttlers will prune assignments from other events anyway
	React.useEffect(() => {
		if (loadState === 2) {
			const assignable = shuttlers.shuttles.filter(shuttle => shuttle.groupId === groupId && shuttle.priority > 0).map(shuttle => shuttle.id);
			const newAssigned = assigned.filter(seat => assignable.includes(seat.shuttleId));
			setAssigned([...newAssigned]);
		}
	}, [shuttlers]);

	if (loadState < 2) return <><Icon loading name='spinner' /> Loading...</>;

	const shuttlersContext: IShuttlersContext = {
		helperId: 'eventshuttle',
		groupId,
		rosterType: props.rosterType,
		rosterCrew: props.rosterCrew,
		eventData: props.eventData,
		activeShuttles,
		shuttlers, setShuttlers,
		assigned, setAssigned
	};

	return (
		<ShuttlersContext.Provider value={shuttlersContext}>
			<Calculator />
		</ShuttlersContext.Provider>
	);

	function variableReady(keyName: string): void {
		setLoadState(prevState => Math.min(prevState + 1, 2));
	}

	function initializeShuttlers(): void {
		// Prune old shuttles
		const DAYS_TO_EXPIRE = 14;
		const expireDate = new Date();
		expireDate.setDate(expireDate.getDate()-DAYS_TO_EXPIRE);

		const oldIds: string[] = [];
		shuttlers.shuttles.forEach(shuttle => {
			if (!shuttle.groupId || shuttle.created < expireDate.getTime())
				oldIds.push(shuttle.id);
		});
		oldIds.forEach(shuttleId => {
			const shuttleNum = shuttlers.shuttles.findIndex(shuttle => shuttle.id === shuttleId);
			shuttlers.shuttles.splice(shuttleNum, 1);
		});

		// Import EVENT-only missions from player data
		activeShuttles.forEach(adventure => {
			if (adventure.symbol.includes('_event_')) {
				if (!shuttlers.shuttles.find(shuttle => shuttle.id === adventure.symbol)) {
					const shuttle = convertAdventureToShuttle(adventure, groupId);
					shuttlers.shuttles.push(shuttle);
				}
			}
		});
		setShuttlers({...shuttlers});
	}
};

function convertAdventureToShuttle(adventure: ShuttleAdventure, groupId: string): Shuttle {
	const shuttle = new Shuttle(groupId, adventure.symbol, true);
	shuttle.name = adventure.name;
	shuttle.faction = adventure.faction_id;
	shuttle.challenge_rating = adventure.challenge_rating;
	adventure.shuttles[0].slots.forEach(slot => {
		const seat = new ShuttleSeat();
		if (slot.skills.length > 1) {
			seat.operand = 'OR';
			seat.skillA = slot.skills[0];
			seat.skillB = slot.skills[1];
		}
		else {
			const skills = slot.skills[0].split(',');
			seat.skillA = skills[0];
			if (skills.length > 1) seat.skillB = skills[1];
		}
		shuttle.seats.push(seat);
	});
	return shuttle;
}
