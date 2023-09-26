import React from 'react';
import { Table, Icon, Button, Modal, Pagination, Popup } from 'semantic-ui-react';

import { ShuttleFactionView, SeatSkillView, SeatCrewView } from './views';
import { Shuttlers, ShuttleSeat, CrewScores, getSkillSetId, ISeatAssignment, IShuttleScores } from './shuttleutils';
import { PlayerCrew } from '../../model/player';

interface IActiveAssignment {
	shuttleId: string;
	seatNum: number;
};

interface IAssignableCrew extends PlayerCrew {
	ssId: string;
	score: number;
};

type AssignmentsListProps = {
	groupId: string;
	crew: PlayerCrew[];
	setActiveStep: (newStep: string) => void;
	recommendShuttlers: () => void;
	shuttlers: Shuttlers;
	setShuttlers: (shuttlers: Shuttlers) => void;
	assigned: ISeatAssignment[];
	setAssigned: (assigned: ISeatAssignment[]) => void;
	crewScores: CrewScores;
	updateCrewScores: (todo: ShuttleSeat[], doneCallback?: () => void) => void;
};

const AssignmentsList = (props: AssignmentsListProps) => {
	const { shuttlers, setShuttlers, assigned, setAssigned, crewScores, updateCrewScores } = props;

	const [shuttleScores, setShuttleScores] = React.useState<IShuttleScores>({} as IShuttleScores);
	const [editAssignment, setEditAssignment] = React.useState<IActiveAssignment | undefined>(undefined);
	const [scoreLoadQueue, setScoreLoadQueue] = React.useState('');

	React.useEffect(() => {
		updateShuttleScores();
	}, [assigned]);

	const myCrew = props.crew;
	const SeatAssignmentRow = (props: { shuttleId: string, seatNum: number, seat: ShuttleSeat }) => {
		const { shuttleId, seatNum, seat } = props;

		let assignedCrew = undefined as PlayerCrew | undefined;
		const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum === seatNum);
		if (seated) {
			assignedCrew = myCrew.find(crew => crew.id === seated.assignedId && crew.symbol === seated.assignedSymbol);
			if (!assignedCrew) assignedCrew = myCrew.find(crew => crew.symbol === seated.assignedSymbol);
		}

		return (
			<Table.Row key={seatNum} style={{ cursor: 'pointer' }}
				onClick={() => { if (seat.skillA) setEditAssignment({shuttleId, seatNum}); }}
			>
				<Table.Cell textAlign='center' width={4}>
					<SeatSkillView seat={seat} />
				</Table.Cell>
				<Table.Cell textAlign={assignedCrew ? 'left' : 'center'}>
					{assignedCrew && (<SeatCrewView crew={assignedCrew} />)}
					{!assignedCrew && (<span style={{ color: 'gray' }}>(Open seat)</span>)}
				</Table.Cell>
				<Table.Cell>
					{assignedCrew && (
						<React.Fragment>
							{assignedCrew.immortal > 0 && (<Icon name='snowflake' />)}
							{assignedCrew.prospect && (<Icon name='add user' />)}
						</React.Fragment>
					)}
				</Table.Cell>
				<Table.Cell textAlign='center' width={3}>
					{assignedCrew && (
						<Button.Group>
							<Button compact icon='lock' color={seated?.locked ? 'yellow' : undefined}
								onClick={(e) => { toggleAssignmentLock(shuttleId, seatNum); e.stopPropagation(); }} />
							<Button compact icon='x'
								onClick={(e) => { updateAssignment(shuttleId, seatNum); e.stopPropagation(); }} />
						</Button.Group>
					)}
				</Table.Cell>
			</Table.Row>
		);
	};

	const SeatAssignmentPicker = () => {
		if (!editAssignment) return (<></>);
		const { shuttleId, seatNum } = editAssignment;
		const [paginationPage, setPaginationPage] = React.useState(1);

		const shuttle = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
		if (!shuttle) return (<></>);

		const seat = shuttle.seats[seatNum];
		if (!seat) return <></>;

		const ssId = getSkillSetId(seat);
		const scores = crewScores.skillsets[ssId];
		if (!scores) {
			if (scoreLoadQueue === '') {
				setScoreLoadQueue(ssId);
				updateCrewScores([seat], () => setScoreLoadQueue(''));
			}
			return (<></>);
		}

		return (
			<Modal
				open={true}
				onClose={() => setEditAssignment(undefined)}
			>
				<Modal.Header>
					{shuttle.name}
					{shuttleScores[shuttleId] ?
						<span style={{ fontSize: '.95em', fontWeight: 'normal', paddingLeft: '1em' }}>
							({(shuttleScores[shuttleId].chance*100).toFixed(1)}% Chance)
						</span>
						: ''}
				</Modal.Header>
				<Modal.Content scrolling>
					{scores && renderTable()}
				</Modal.Content>
				<Modal.Actions>
					<Button icon='forward' content='Next Seat' onClick={() => cycleShuttleSeat()} />
					<Button positive onClick={() => setEditAssignment(undefined)}>
						Close
					</Button>
				</Modal.Actions>
			</Modal>
		);

		function renderTable(): JSX.Element {
			let assignedCrew = undefined as PlayerCrew | undefined;
			const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum == seatNum);
			if (seated) {
				assignedCrew = myCrew.find(crew => crew.id === seated.assignedId && crew.symbol === seated.assignedSymbol);
				if (!assignedCrew) assignedCrew = myCrew.find(crew => crew.symbol === seated.assignedSymbol);
			}

			// Pagination
			const rowsPerPage = 10;
			const totalPages = Math.ceil(scores.length / rowsPerPage);
			const data = scores.slice(rowsPerPage * (paginationPage - 1), rowsPerPage * paginationPage).map(score => {
				const scoreCrew = myCrew.find(crew => crew.id === score.id);
				return {...scoreCrew, ...score};
			}) as IAssignableCrew[];

			return (
				<React.Fragment>
					<Table striped selectable singleLine compact='very'>
						<Table.Header>
							<Table.Row>
								<Table.HeaderCell />
								<Table.HeaderCell colSpan={2}>Best <span style={{ padding: '0 .5em' }}><SeatSkillView seat={seat as ShuttleSeat} /></span> Crew</Table.HeaderCell>
								<Table.HeaderCell textAlign='center'>Here<Popup trigger={<Icon name='help' />} content='Using this crew here will result in this net change to the success chance of this shuttle' /></Table.HeaderCell>
								<Table.HeaderCell>Current Assignment</Table.HeaderCell>
								<Table.HeaderCell textAlign='center'>There<Popup trigger={<Icon name='help' />} content='Removing this crew from their current assignment will leave an open seat on that shuttle, resulting in this success chance' /></Table.HeaderCell>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{data.map((crew, idx) => renderRow(crew, idx, assignedCrew))}
						</Table.Body>
						<Table.Footer>
							<Table.Row>
								<Table.HeaderCell colSpan={6}>
									<Pagination
										totalPages={totalPages}
										activePage={paginationPage}
										onPageChange={(e, { activePage }) => setPaginationPage(activePage as number)}
									/>
								</Table.HeaderCell>
							</Table.Row>
						</Table.Footer>
					</Table>
				</React.Fragment>
			);
		}

		function renderRow(crew: IAssignableCrew, idx: number, assignedCrew: PlayerCrew | undefined): JSX.Element {
			const currentSeat = assigned.find(seat => seat.assignedId === crew.id && seat.assignedSymbol === crew.symbol);
			const currentShuttle = currentSeat ? shuttlers.shuttles.find(shuttle => shuttle.id === currentSeat.shuttleId) : undefined;
			return (
				<Table.Row key={idx} style={{ cursor: 'pointer' }}
					onClick={() => {
						if (!assignedCrew || crew.id !== assignedCrew.id)
							updateAssignment(shuttleId, seatNum, crew, true);
						setEditAssignment(undefined);
					}}
				>
					<Table.Cell textAlign='center'>
						{assignedCrew?.id === crew.id && (<Icon color='green' name='check' />)}
					</Table.Cell>
					<Table.Cell><SeatCrewView crew={crew} /></Table.Cell>
					<Table.Cell>
						{crew.immortal > 0 && (<Icon name='snowflake' />)}
						{crew.prospect && (<Icon name='add user' />)}
					</Table.Cell>
					<Table.Cell textAlign='center'>
						{renderScoreChange(shuttleId, seatNum, crew.score)}
					</Table.Cell>
					<Table.Cell>
						{currentShuttle?.name}
						{currentShuttle?.id === shuttleId && <span style={{ paddingLeft: '1em' }}><i>(This Shuttle)</i></span>}
						{currentSeat?.locked && <span style={{ paddingLeft: '1em' }}><Icon name='lock' /></span>}
					</Table.Cell>
					<Table.Cell textAlign='center'>
						{currentSeat && renderScoreChange(currentSeat.shuttleId, currentSeat.seatNum, 0)}
					</Table.Cell>
				</Table.Row>
			);
		}

		function renderScoreChange(shuttleId: string, seatNum: number, replacementScore: number = 0): JSX.Element {
			if (!shuttleScores[shuttleId]) return (<></>);
			const newScores = [...shuttleScores[shuttleId].scores];
			newScores[seatNum] = replacementScore;
			const DIFFICULTY = 2000;
			const dAvgSkill = newScores.reduce((a, b) => (a + b), 0)/newScores.length;
			const dChance = 1/(1+Math.pow(Math.E, 3.5*(0.5-dAvgSkill/DIFFICULTY)));
			let style = {} as Object;
			if (replacementScore === 0) {
				if (dChance*100 >= 90) style = { color: 'green', fontWeight: 'bold' };
				return (<span style={style}>{Math.floor(dChance*100)}%</span>);
			}
			const dDelta = dChance - shuttleScores[shuttleId].chance;
			if (dDelta > 0 && dChance*100 >= 90)
				style = { color: 'green', fontWeight: 'bold' };
			return (<span style={style}>{dDelta > 0 ? '+' : ''}{(dDelta*100).toFixed(1)}%</span>);
		}

		function cycleShuttleSeat(): void {
			if (!shuttle) return;
			const nextAssignment = {
				shuttleId: shuttleId as string,
				seatNum: (seatNum + 1) >= shuttle.seats.length ? 0 : seatNum + 1
			} as IActiveAssignment;
			setEditAssignment(nextAssignment);
		}
	};

	const data = shuttlers.shuttles.slice()
		.filter(shuttle => shuttle.groupId === props.groupId && shuttle.priority > 0)
		.sort((a, b) => a.priority - b.priority);

	return (
		<React.Fragment>
			<p>You can rearrange crew to balance shuttle chances as you see fit. Click a seat to change the crew assigned to it. Lock an assignment to keep that crew in that seat when requesting new recommendations.</p>
			<Table celled striped compact='very'>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Mission</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Faction</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Seat Assignments</Table.HeaderCell>
						<Table.HeaderCell textAlign='center'>Success Chance</Table.HeaderCell>
						<Table.HeaderCell />
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{data.length === 0 && (
						<Table.Row>
							<Table.Cell colSpan={5} textAlign='center'>
								No missions selected.
							</Table.Cell>
						</Table.Row>
					)}
					{data.map(shuttle => (
						<Table.Row key={shuttle.id}>
							<Table.Cell><b>{shuttle.name}</b></Table.Cell>
							<Table.Cell textAlign='center'>
								<ShuttleFactionView factionId={shuttle.faction} size={3} />
							</Table.Cell>
							<Table.Cell>
								<Table striped selectable singleLine compact='very' style={{ margin: '0 auto' }}>
									<Table.Body>
										{shuttle.seats.map((seat, seatNum) =>
											<SeatAssignmentRow key={seatNum} shuttleId={shuttle.id} seatNum={seatNum} seat={seat} />
										)}
									</Table.Body>
								</Table>
							</Table.Cell>
							<Table.Cell textAlign='center'>
								{shuttleScores[shuttle.id]?.chance > 0 ? <b>{Math.floor(shuttleScores[shuttle.id].chance*100)}%</b> : <></>}
							</Table.Cell>
							<Table.Cell textAlign='right'>
								<Button compact icon='ban' content='Dismiss' onClick={() => dismissShuttle(shuttle.id)} />
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Footer>
					<Table.Row>
						<Table.HeaderCell colSpan={2}>
							<Button compact icon='backward' content='Change Missions' onClick={() => props.setActiveStep('missions')} />
						</Table.HeaderCell>
						<Table.HeaderCell colSpan={3} textAlign='right'>
							{data.length > 0 && (<Button compact icon='rocket' color='green' content='Recommend Crew' onClick={() => props.recommendShuttlers()} />)}
						</Table.HeaderCell>
					</Table.Row>
				</Table.Footer>
			</Table>
			{editAssignment && (<SeatAssignmentPicker />)}
		</React.Fragment>
	);

	function dismissShuttle(shuttleId: string): void {
		const shuttle = shuttlers.shuttles.find(shuttle => shuttle.id === shuttleId);
		if (shuttle) {
			shuttle.priority = 0;
			setShuttlers({...shuttlers});
		}
	}

	function updateAssignment(shuttleId: string, seatNum: number, assignedCrew: IAssignableCrew | undefined = undefined, locked: boolean = false): void {
		// Unassign crew from previously assigned seat, if necessary
		if (assignedCrew) {
			const current = assigned.find(seat => seat.assignedId === assignedCrew.id);
			if (current) {
				current.assignedId = -1;
				current.assignedSymbol = '';
				current.seatScore = 0;
				current.locked = false;
			}
		}

		const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum === seatNum);
		if (assignedCrew && !seated) {
			assigned.push({
				shuttleId,
				seatNum,
				ssId: assignedCrew.ssId,
				assignedId: assignedCrew.id,
				assignedSymbol: assignedCrew.symbol,
				seatScore: assignedCrew.score,
				locked
			});
		}
		else if (assignedCrew && seated) {
			seated.assignedId = assignedCrew.id;
			seated.assignedSymbol = assignedCrew.symbol;
			seated.seatScore = assignedCrew.score;
			seated.locked = locked;
		}
		else if (seated) {
			seated.assignedId = -1;
			seated.assignedSymbol = '';
			seated.seatScore = 0;
			seated.locked = false;
		}
		setAssigned([...assigned]);
	}

	function toggleAssignmentLock(shuttleId: string, seatNum: number): void {
		const seated = assigned.find(seat => seat.shuttleId === shuttleId && seat.seatNum === seatNum);
		if (seated) {
			seated.locked = !seated.locked;
			setAssigned([...assigned]);
		}
	}

	function updateShuttleScores(): void {
		const DIFFICULTY = 2000;
		const newScores = {} as IShuttleScores;
		assigned.forEach(seated => {
			const shuttle = shuttlers.shuttles.find(shuttle => shuttle.id === seated.shuttleId);
			if (shuttle) {
				if (!newScores[seated.shuttleId]) {
					const seatCount = shuttle.seats.length;
					newScores[seated.shuttleId] = { chance: 0, scores: Array(seatCount).fill(0) };
				}
				newScores[seated.shuttleId].scores[seated.seatNum] = seated.seatScore;
				const dAvgSkill = newScores[seated.shuttleId].scores.reduce((a, b) => (a + b), 0)/newScores[seated.shuttleId].scores.length;
				const dChance = 1/(1+Math.pow(Math.E, 3.5*(0.5-dAvgSkill/DIFFICULTY)));
				newScores[seated.shuttleId].chance = dAvgSkill > 0 ? dChance : 0;
			}
		});
		setShuttleScores(newScores);
	}
};

export default AssignmentsList;