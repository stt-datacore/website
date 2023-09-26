import React from 'react';
import { Icon, Form, Checkbox, Step } from 'semantic-ui-react';

import CONFIG from '../CONFIG';

import MissionsList from './missionslist';
import AssignmentsList from './assignmentslist';
import RunningList from './runninglist';
import { Shuttlers, Shuttle, ShuttleSeat, CrewScores, getSkillSetId, ISeatAssignment, ICrewSkillSets, ICrewScore } from './shuttleutils';
import { useStateWithStorage } from '../../utils/storage';
import { PlayerCrew } from '../../model/player';
import { ShuttleAdventure } from '../../model/shuttle';
import { EventData } from '../../utils/events';

type ShuttleHelperProps = {
	helperId: string;
	groupId: string;
	dbid: string;
	crew: PlayerCrew[];
	eventData?: EventData;
};

const ShuttleHelper = (props: ShuttleHelperProps) => {
	const [shuttlers, setShuttlers] = useStateWithStorage<Shuttlers>(props.dbid+'/shuttlers/setups', new Shuttlers(), { rememberForever: true, onInitialize: variableReady });
	const [assigned, setAssigned] = useStateWithStorage<ISeatAssignment[]>(props.dbid+'/shuttlers/assigned', [], { rememberForever: true, onInitialize: variableReady });

	const [activeShuttles, setActiveShuttles] = useStateWithStorage<ShuttleAdventure[] | undefined>('tools/activeShuttles', undefined);

	const [considerActive, setConsiderActive] = useStateWithStorage(props.helperId+'/considerActive', true);
	const [considerVoyage, setConsiderVoyage] = useStateWithStorage(props.helperId+'/considerVoyage', false);
	const [considerFrozen, setConsiderFrozen] = useStateWithStorage(props.helperId+'/considerFrozen', false);

	const [loadState, setLoadState] = React.useState(0);
	const [calcState, setCalcState] = React.useState(0);
	const [crewScores, setCrewScores] = React.useState<CrewScores>(new CrewScores());
	const [activeStep, setActiveStep] = React.useState('missions');

	React.useEffect(() => {
		setCrewScores(new CrewScores());
	}, [props.crew, considerActive, considerVoyage, considerFrozen]);

	// Prune old shuttles from stored values, import open shuttles from player data
	React.useEffect(() => {
		if (loadState === 2) initializeShuttlers();
	}, [loadState]);

	// Prune assignments from other events, dismissed shuttles
	//	recommendShuttlers will prune assignments from other events anyway
	React.useEffect(() => {
		if (loadState === 2) {
			const assignable = shuttlers.shuttles.filter(shuttle => shuttle.groupId === props.groupId && shuttle.priority > 0).map(shuttle => shuttle.id);
			const newAssigned = assigned.filter(seat => assignable.includes(seat.shuttleId));
			setAssigned([...newAssigned]);
		}
	}, [shuttlers]);

	if (loadState < 2) return (<><Icon loading name='spinner' /> Loading...</>);

	if (calcState === 1) updateAssignments();

	return (
		<React.Fragment>
			<Form>
				<Form.Group grouped>
					<Form.Field
						control={Checkbox}
						label='Consider crew on active shuttles'
						checked={considerActive}
						onChange={(e, { checked }) => setConsiderActive(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label='Consider crew on active voyage'
						checked={considerVoyage}
						onChange={(e, { checked }) => setConsiderVoyage(checked)}
					/>
					<Form.Field
						control={Checkbox}
						label='Consider frozen (vaulted) crew'
						checked={considerFrozen}
						onChange={(e, { checked }) => setConsiderFrozen(checked)}
					/>
				</Form.Group>
			</Form>
			<Step.Group>
				<Step active={activeStep === 'missions'} onClick={() => setActiveStep('missions')}>
					<Icon name='list' />
					<Step.Content>
						<Step.Title>Mission List</Step.Title>
						<Step.Description>Select your preferred missions</Step.Description>
					</Step.Content>
				</Step>
				<Step active={activeStep === 'assignments'} onClick={() => setActiveStep('assignments')}>
					<Icon name='rocket' />
					<Step.Content>
						<Step.Title>Shuttle Assignments</Step.Title>
						<Step.Description>See the best seats for your crew</Step.Description>
					</Step.Content>
				</Step>
				{false &&
					<Step active={activeStep === 'running'} onClick={() => setActiveStep('running')}>
						<Icon name='compass' />
						<Step.Content>
							<Step.Title>Active Shuttles</Step.Title>
							<Step.Description>View active crew assignments</Step.Description>
						</Step.Content>
					</Step>
				}
			</Step.Group>
			{activeStep === 'missions' && (
				<MissionsList groupId={props.groupId}
					setActiveStep={setActiveStep} recommendShuttlers={recommendShuttlers}
					shuttlers={shuttlers} setShuttlers={setShuttlers} activeShuttles={activeShuttles ?? []} />
			)}
			{activeStep === 'assignments' && (
				<AssignmentsList groupId={props.groupId} crew={props.crew}
					setActiveStep={setActiveStep} recommendShuttlers={recommendShuttlers}
					shuttlers={shuttlers} setShuttlers={setShuttlers} assigned={assigned} setAssigned={setAssigned}
					crewScores={crewScores} updateCrewScores={updateCrewScores} />
			)}
			{activeStep === 'running' && (
				<RunningList groupId={props.groupId} crew={props.crew}
					setActiveStep={setActiveStep}
					shuttlers={shuttlers} activeShuttles={activeShuttles ?? []}
					crewScores={crewScores} updateCrewScores={updateCrewScores} />
			)}
		</React.Fragment>
	);

	function variableReady(keyName: string): void {
		setLoadState(prevState => Math.min(prevState + 1, 2));
	}

	function initializeShuttlers(): void {
		// Prune old shuttles
		const DAYS_TO_EXPIRE = 14;
		const expireDate = new Date();
		expireDate.setDate(expireDate.getDate()-DAYS_TO_EXPIRE);

		const oldIds = [] as string[];
		shuttlers.shuttles.forEach(shuttle => {
			if (!shuttle.groupId || shuttle.created < expireDate.getTime())
				oldIds.push(shuttle.id);
		});
		oldIds.forEach(shuttleId => {
			const shuttleNum = shuttlers.shuttles.findIndex(shuttle => shuttle.id === shuttleId);
			shuttlers.shuttles.splice(shuttleNum, 1);
		});

		// Import missions from player data (during an active event, if specified)
		if (activeShuttles && (!props.eventData || props.eventData.seconds_to_start === 0)) {
			activeShuttles.forEach(adventure => {
				if (!shuttlers.shuttles.find(shuttle => shuttle.id === adventure.symbol)) {
					const shuttle = new Shuttle(props.groupId, adventure.symbol, true);
					shuttle.name = adventure.name;
					shuttle.faction = adventure.faction_id;

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
					shuttlers.shuttles.push(shuttle);
				}
			});
		}
		setShuttlers({...shuttlers});
		if (shuttlers.shuttles.filter(shuttle => shuttle.groupId === props.groupId && shuttle.priority > 0).length > 0)
			setActiveStep('assignments');
	}

	function recommendShuttlers(): void {
		if (calcState > 0) return;

		const todo = [] as ShuttleSeat[], todoIds = [] as string[];
		shuttlers.shuttles.filter(shuttle => shuttle.groupId === props.groupId && shuttle.priority > 0).forEach(shuttle => {
			for (let seatNum = 0; seatNum < shuttle.seats.length; seatNum++) {
				const seat = shuttle.seats[seatNum];
				if (seat.skillA === '' && seat.skillB === '') continue;
				const ssId = getSkillSetId(seat);
				if (!crewScores.skillsets[ssId] && !todoIds.includes(ssId)) {
					todo.push(seat);
					todoIds.push(ssId);
				}
			}
		});
		if (todo.length > 0) {
			setCalcState(1);
			updateCrewScores(todo);
			return;
		}

		updateAssignments();
	}

	function updateCrewScores(todo: ShuttleSeat[] = [], doneCallback?: () => void): void {
		const newSkills = {} as ICrewSkillSets;
		const newScores = [] as ICrewScore[];

		for (let i = 0; i < props.crew.length; i++) {
			if (!considerActive && props.crew[i].active_status === 2)
				continue;

			if (!considerVoyage && props.crew[i].active_status === 3)
				continue;

			if (!considerFrozen && props.crew[i].immortal > 0)
				continue;

			todo.forEach(seat => {
				const skillOperand = seat.operand;
				const primarySkill = seat.skillA;
				const secondarySkill = seat.skillB;
				const ssId = getSkillSetId(seat);

				let iHigherSkill = 0, iLowerSkill = 0;
				for (let skill in CONFIG.SKILLS) {
					if (skill !== primarySkill && skill !== secondarySkill) continue;
					if (props.crew[i][skill].core === 0) continue;

					let iMultiplier = 1;
					if ((props.eventData?.featured?.indexOf(props.crew[i].symbol) ?? 0) >= 0)
						iMultiplier = 3;
					else if ((props.eventData?.bonus?.indexOf(props.crew[i].symbol) ?? 0) >= 0)
						iMultiplier = 2;
					const iSkillScore = props.crew[i][skill].core*iMultiplier;

					if (iSkillScore > iHigherSkill) {
						iLowerSkill = iHigherSkill;
						iHigherSkill = iSkillScore;
					}
					else if (iSkillScore > iLowerSkill) {
						iLowerSkill = iSkillScore;
					}
				}

				let iSeatScore = 0;
				if (skillOperand === 'OR')
					iSeatScore = iHigherSkill;
				else
					iSeatScore = iHigherSkill+(iLowerSkill/4);

				const currentIndex = crewScores.ranked.findIndex(score => score.id === props.crew[i].id && score.ssId === ssId);
				if (currentIndex >= 0) crewScores.ranked.splice(currentIndex, 1);

				if (iSeatScore > 0) {
					const crewman: ICrewScore = {
						id: props.crew[i].id,
						symbol: props.crew[i].symbol,
						name: props.crew[i].name,
						score: iSeatScore,
						ssId
					};
					if (!newSkills[ssId]) newSkills[ssId] = [];
					newSkills[ssId].push(crewman);
					newScores.push(crewman);
				}
			});
		}

		todo.forEach(seat => {
			const ssId = getSkillSetId(seat);
			crewScores.skillsets[ssId] = newSkills[ssId].sort((a, b) => b.score - a.score);
		});
		crewScores.ranked = crewScores.ranked.concat(newScores);
		crewScores.ranked.sort((a, b) => b.score - a.score);
		setCrewScores({...crewScores});
		if (doneCallback) doneCallback();
	}

	function updateAssignments(): void {
		const data = shuttlers.shuttles.slice()
			.filter(shuttle => shuttle.groupId === props.groupId && shuttle.priority > 0)
			.sort((a, b) => a.priority - b.priority);

		const seats = [] as ISeatAssignment[];
		data.forEach(shuttle => {
			for (let seatNum = 0; seatNum < shuttle.seats.length; seatNum++) {
				const ssId = getSkillSetId(shuttle.seats[seatNum]);
				const newSeat: ISeatAssignment = {
					shuttleId: shuttle.id,
					seatNum,
					ssId,
					assignedId: -1,
					assignedSymbol: '',
					seatScore: 0,
					locked: false
				};
				const seated = assigned.find(seat => seat.shuttleId === shuttle.id && seat.seatNum === seatNum);
				if (seated?.locked) {
					newSeat.assignedId = seated.assignedId;
					newSeat.assignedSymbol = seated.assignedSymbol;
					newSeat.seatScore = seated.seatScore;
					newSeat.locked = true;
				}
				seats.push(newSeat);
			}
		});
		if (seats.length === 0) return;

		const scores = JSON.parse(JSON.stringify(crewScores.ranked)) as ICrewScore[];
		let iAssigned = 0;
		while (scores.length > 0 && iAssigned < seats.length) {
			const testScore = scores.shift();
			if (!testScore) continue;

			const alreadyAssigned = seats.find(seat => seat.assignedId === testScore.id);
			if (alreadyAssigned) continue;

			const openSeat = seats.find(seat => seat.ssId === testScore.ssId && seat.assignedId === -1);
			if (openSeat) {
				openSeat.assignedId = testScore.id;
				openSeat.assignedSymbol = testScore.symbol;
				openSeat.seatScore = testScore.score;
				iAssigned++;
			}
		}
		setAssigned([...seats]);
		setCalcState(0);
		setActiveStep('assignments');
	}
};

export default ShuttleHelper;